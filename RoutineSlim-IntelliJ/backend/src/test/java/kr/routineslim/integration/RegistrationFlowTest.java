package kr.routineslim.integration;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.*;
import jakarta.servlet.http.Cookie;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import kr.routineslim.service.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

@SpringBootTest
@AutoConfigureMockMvc
class RegistrationFlowTest {
  static final TestSmtpServer SMTP = new TestSmtpServer();

  @DynamicPropertySource
  static void mail(DynamicPropertyRegistry r) {
    r.add("spring.mail.host", () -> "127.0.0.1");
    r.add("spring.mail.port", SMTP::port);
    r.add("spring.mail.properties.mail.smtp.auth", () -> "false");
    r.add("spring.mail.properties.mail.smtp.starttls.enable", () -> "false");
    r.add("routineslim.mail.from", () -> "verify@routineslim.test");
    r.add("routineslim.registration.resend-seconds", () -> "0");
  }

  @Autowired org.springframework.transaction.PlatformTransactionManager manager;
  @Autowired kr.routineslim.service.VerificationMailDelivery delivery;
  @Autowired AccountSecurityService security;
  @Autowired MockMvc mvc;
  @Autowired ObjectMapper json;
  @Autowired JdbcTemplate db;
  @Autowired AuthenticationService auth;

  private MockHttpServletRequestBuilder secure(
      MockHttpServletRequestBuilder request, MockHttpSession session) throws Exception {
    var response = mvc.perform(get("/api/csrf").session(session)).andReturn().getResponse();
    String token = json.readTree(response.getContentAsString()).get("token").asText();
    return request
        .session(session)
        .cookie(new Cookie("XSRF-TOKEN", token))
        .header("X-XSRF-TOKEN", token)
        .contentType("application/json");
  }

  private String send(String email, MockHttpSession session) throws Exception {
    var response =
        mvc.perform(
                secure(post("/api/registration/email/send"), session)
                    .content(json.writeValueAsString(Map.of("email", email))))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse();
    var body = json.readTree(response.getContentAsString());
    assertFalse(body.has("code"));
    return body.get("verificationId").asText();
  }

  private void verify(String id, String code, MockHttpSession session, int expected)
      throws Exception {
    mvc.perform(
            secure(post("/api/registration/email/verify"), session)
                .content(json.writeValueAsString(Map.of("verificationId", id, "code", code))))
        .andExpect(status().is(expected));
  }

  private Map<String, Object> form(String id, String email, String proof) {
    var r = new HashMap<String, Object>();
    r.put("id", id);
    r.put("name", "테스트 회원");
    r.put("email", email);
    r.put("password", "Password123!");
    r.put("confirmPassword", "Password123!");
    r.put("verificationId", proof);
    r.put("agreeTerms", true);
    r.put("agreePrivacy", true);
    r.put("ageOver14", true);
    r.put("termsVersion", RegistrationService.TERMS_VERSION);
    r.put("privacyVersion", RegistrationService.PRIVACY_VERSION);
    return r;
  }

  @Test
  void smtpVerificationRegistrationAndSeparateLoginWork() throws Exception {
    var session = new MockHttpSession();
    String email = "complete@routineslim.test", id = "joined_user";
    try {
      String proof = send(email, session);
      var mail = SMTP.receive(email);
      assertNotNull(mail);
      verify(proof, mail.code(), session, 200);
      mvc.perform(
              secure(post("/api/register"), session)
                  .content(json.writeValueAsString(form(id, email, proof))))
          .andExpect(status().isOk());
      assertEquals(
          email,
          db.queryForObject(
              "SELECT verified_email FROM account_security WHERE user_id=?", String.class, id));
      assertTrue(
          db.queryForObject(
              "SELECT age_over_14 FROM account_security WHERE user_id=?", Boolean.class, id));
      var login = new MockHttpSession();
      var result =
          mvc.perform(
                  secure(post("/api/login"), login)
                      .content("{\"id\":\"joined_user\",\"password\":\"Password123!\"}"))
              .andExpect(status().isOk())
              .andReturn();
      var signed = (MockHttpSession) result.getRequest().getSession(false);
      mvc.perform(get("/api/v1/members/me").session(signed))
          .andExpect(jsonPath("$.emailVerified").value(true));
    } finally {
      if (db.queryForObject("SELECT COUNT(*) FROM app_users WHERE id=?", Integer.class, id) > 0)
        auth.delete(id);
    }
  }

  @Test
  void emailCannotBeClaimedWithoutVerificationOrWithDifferentSession() throws Exception {
    var session = new MockHttpSession();
    String email = "bound@routineslim.test";
    String proof = send(email, session);
    var mail = SMTP.receive(email);
    assertNotNull(mail);
    var payload = form("unverified_user", email, proof);
    mvc.perform(secure(post("/api/register"), session).content(json.writeValueAsString(payload)))
        .andExpect(status().isBadRequest());
    verify(proof, mail.code(), new MockHttpSession(), 410);
    verify(proof, mail.code(), session, 200);
    payload.put("email", "different@routineslim.test");
    mvc.perform(secure(post("/api/register"), session).content(json.writeValueAsString(payload)))
        .andExpect(status().isBadRequest());
    assertEquals(
        0,
        db.queryForObject(
            "SELECT COUNT(*) FROM app_users WHERE id='unverified_user'", Integer.class));
  }

  @Test
  void requiredConsentsAndPasswordConfirmationAreCheckedOnServer() throws Exception {
    var session = new MockHttpSession();
    var payload = form("terms_user", "terms@routineslim.test", "none");
    payload.put("agreePrivacy", false);
    mvc.perform(secure(post("/api/register"), session).content(json.writeValueAsString(payload)))
        .andExpect(status().isBadRequest());
    payload.put("agreePrivacy", true);
    payload.put("confirmPassword", "wrong");
    mvc.perform(secure(post("/api/register"), session).content(json.writeValueAsString(payload)))
        .andExpect(status().isBadRequest());
    mvc.perform(
            secure(post("/api/register"), session)
                .content("{\"id\":\"old_api_user\",\"password\":\"Password123!\"}"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void incorrectAttemptsPersistAndEventuallyBlockCorrectCode() throws Exception {
    var session = new MockHttpSession();
    String email = "attempts@routineslim.test", proof = send(email, session);
    var mail = SMTP.receive(email);
    assertNotNull(mail);
    String wrong = mail.code().equals("000000") ? "111111" : "000000";
    for (int i = 0; i < 5; i++) verify(proof, wrong, session, 400);
    verify(proof, mail.code(), session, 429);
    assertEquals(
        5,
        db.queryForObject(
            "SELECT attempts FROM signup_email_codes WHERE verification_id=?",
            Integer.class,
            proof));
  }

  @Test
  void expiredCodeAndResentCodeAreInvalid() throws Exception {
    var session = new MockHttpSession();
    String email = "resend@routineslim.test", first = send(email, session);
    var old = SMTP.receive(email);
    assertNotNull(old);
    String second = send(email, session);
    var current = SMTP.receive(email);
    assertNotNull(current);
    verify(first, old.code(), session, 410);
    db.update(
        "UPDATE signup_email_codes SET expires_at=? WHERE verification_id=?",
        Timestamp.from(Instant.now().minusSeconds(1)),
        second);
    verify(second, current.code(), session, 410);
  }

  @Test
  void consumedProofCannotRegisterAnotherAccount() throws Exception {
    var session = new MockHttpSession();
    String email = "singleuse@routineslim.test", proof = send(email, session);
    var mail = SMTP.receive(email);
    assertNotNull(mail);
    verify(proof, mail.code(), session, 200);
    db.update("UPDATE signup_email_codes SET consumed=TRUE WHERE verification_id=?", proof);
    mvc.perform(
            secure(post("/api/register"), session)
                .content(json.writeValueAsString(form("replay_user", email, proof))))
        .andExpect(status().isBadRequest());
  }

  @Test
  void smtpFailureDoesNotReturnAValidChallenge() throws Exception {
    SMTP.reject = true;
    try {
      var session = new MockHttpSession();
      mvc.perform(
              secure(post("/api/registration/email/send"), session)
                  .content("{\"email\":\"failure@routineslim.test\"}"))
          .andExpect(status().isServiceUnavailable());
      assertEquals(
          0,
          db.queryForObject(
              "SELECT COUNT(*) FROM signup_email_codes WHERE email='failure@routineslim.test'",
              Integer.class));
    } finally {
      SMTP.reject = false;
    }
  }

  @Test
  void publicSignupCannotClaimAdminIdentifier() throws Exception {
    mvc.perform(get("/api/registration/id-availability").param("id", "routineslim_admin"))
        .andExpect(jsonPath("$.available").value(false));
  }

  @Test
  void resendCooldownRejectsImmediateRepeat() throws Exception {
    var service = new EmailVerificationService(db, manager, delivery, security, 600, 60);
    String email = "cooldown@routineslim.test";
    service.send(email, "cooldown-session", "127.0.0.21");
    assertNotNull(SMTP.receive(email));
    var error =
        assertThrows(
            org.springframework.web.server.ResponseStatusException.class,
            () -> service.send(email, "cooldown-session", "127.0.0.21"));
    assertEquals(429, error.getStatusCode().value());
  }

  @Test
  void hourlyRequestLimitRejectsSixthEmail() throws Exception {
    var session = new MockHttpSession();
    String email = "limit@routineslim.test";
    for (int i = 0; i < 5; i++) {
      send(email, session);
      assertNotNull(SMTP.receive(email));
    }
    mvc.perform(
            secure(post("/api/registration/email/send"), session)
                .content(json.writeValueAsString(Map.of("email", email))))
        .andExpect(status().isTooManyRequests());
  }
}
