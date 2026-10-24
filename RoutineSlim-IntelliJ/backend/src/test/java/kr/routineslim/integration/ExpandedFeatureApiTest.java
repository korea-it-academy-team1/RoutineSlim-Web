package kr.routineslim.integration;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.*;
import jakarta.servlet.http.Cookie;
import java.util.*;
import kr.routineslim.service.*;
import kr.routineslim.service.VerificationMailDelivery;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.*;
import org.springframework.context.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = "routineslim.registration.resend-seconds=0")
@AutoConfigureMockMvc
@Import(ExpandedFeatureApiTest.MailConfig.class)
@Transactional
class ExpandedFeatureApiTest {
  static class Capture implements VerificationMailDelivery {
    final Map<String, String> codes = new HashMap<>();

    public boolean available() {
      return true;
    }

    public void send(String email, String code, int minutes) {
      codes.put(email, code);
    }
  }

  @TestConfiguration
  static class MailConfig {
    @Bean
    @Primary
    Capture capture() {
      return new Capture();
    }
  }

  @Autowired Capture capture;
  @Autowired MockMvc mvc;
  @Autowired ObjectMapper json;
  @Autowired JdbcTemplate db;
  @Autowired AuthenticationService auth;
  @Autowired RecoveryService recovery;

  @BeforeEach
  void users() {
    capture.codes.clear();
    for (String id : List.of("web_user", "web_other", "web_admin"))
      auth.register(id, "Password123!");
    db.update("UPDATE app_users SET email='web@routineslim.test' WHERE id='web_user'");
    db.update(
        "INSERT INTO account_security(user_id,role,verified_email)"
            + " VALUES('web_user','USER','web@routineslim.test')");
    db.update("INSERT INTO account_security(user_id,role) VALUES('web_admin','ADMIN')");
  }

  MockHttpSession session(String id) {
    var s = new MockHttpSession();
    s.setAttribute("user", id);
    return s;
  }

  MockHttpServletRequestBuilder secure(
      MockHttpServletRequestBuilder request, MockHttpSession s, Object body) throws Exception {
    var result = mvc.perform(get("/api/csrf").session(s)).andReturn().getResponse();
    String token = json.readTree(result.getContentAsString()).get("token").asText();
    request.session(s).cookie(new Cookie("XSRF-TOKEN", token)).header("X-XSRF-TOKEN", token);
    if (body != null)
      request.contentType("application/json").content(json.writeValueAsString(body));
    return request;
  }

  @Test
  void privateApisRequireLoginAndCsrf() throws Exception {
    mvc.perform(get("/api/v1/trials")).andExpect(status().isUnauthorized());
    mvc.perform(post("/api/v1/trials").contentType("application/json").content("{}"))
        .andExpect(status().isForbidden());
  }

  @Test
  void trialHttpValidationAndOwnerCheckWork() throws Exception {
    var owner = session("web_user");
    var body =
        Map.of(
            "name",
            "Trial",
            "category",
            "영상",
            "endDate",
            "2026-10-25",
            "amount",
            1000,
            "notifyDays",
            3,
            "status",
            "ACTIVE");
    var response =
        mvc.perform(secure(post("/api/v1/trials"), owner, body))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse();
    String id = json.readTree(response.getContentAsString()).get("id").asText();
    mvc.perform(secure(put("/api/v1/trials/" + id), session("web_other"), body))
        .andExpect(status().isNotFound());
    mvc.perform(secure(delete("/api/v1/trials/" + id), session("web_other"), null))
        .andExpect(status().isNotFound());
    var invalid = new HashMap<String, Object>(body);
    invalid.put("amount", -1);
    mvc.perform(secure(post("/api/v1/trials"), owner, invalid)).andExpect(status().isBadRequest());
  }

  @Test
  void publicFaqIsVisibleButOnlyAdminsCanPublish() throws Exception {
    var article =
        Map.of(
            "title",
            "How to use",
            "category",
            "이용 안내",
            "content",
            "Instructions",
            "published",
            true);
    mvc.perform(secure(post("/api/v1/admin/content/faq"), session("web_user"), article))
        .andExpect(status().isForbidden());
    mvc.perform(secure(post("/api/v1/admin/content/faq"), session("web_admin"), article))
        .andExpect(status().isOk());
    mvc.perform(get("/api/v1/support/faqs"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].title").value("How to use"));
  }

  @Test
  void adminSuspensionInvalidatesExistingSession() throws Exception {
    var user = session("web_user");
    mvc.perform(get("/api/me").session(user)).andExpect(status().isOk());
    mvc.perform(
            secure(
                put("/api/v1/admin/members/web_user/suspension"),
                session("web_admin"),
                Map.of("suspended", true)))
        .andExpect(status().isOk());
    mvc.perform(get("/api/me").session(user)).andExpect(status().isUnauthorized());
  }

  String start(MockHttpSession s, String email, String purpose) throws Exception {
    var response =
        mvc.perform(
                secure(post("/api/recovery/start"), s, Map.of("email", email, "purpose", purpose)))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse();
    var body = json.readTree(response.getContentAsString());
    assertFalse(body.has("code"));
    assertFalse(body.has("ids"));
    return body.get("requestId").asText();
  }

  void confirm(MockHttpSession s, String id, String code, int status) throws Exception {
    mvc.perform(secure(post("/api/recovery/confirm"), s, Map.of("requestId", id, "code", code)))
        .andExpect(status().is(status));
  }

  @Test
  void verifiedEmailCanRecoverItsId() throws Exception {
    var s = new MockHttpSession();
    String id = start(s, "web@routineslim.test", "ID"),
        code = capture.codes.get("web@routineslim.test");
    mvc.perform(secure(post("/api/recovery/confirm"), s, Map.of("requestId", id, "code", code)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.ids[0]").value("web_user"));
    confirm(s, id, code, 400);
  }

  @Test
  void passwordResetRequiresVerificationAndInvalidatesOtherSessions() throws Exception {
    var old = session("web_user");
    var s = new MockHttpSession();
    String id = start(s, "web@routineslim.test", "PASSWORD"), sessionId = s.getId();
    var reset =
        Map.of(
            "requestId",
            id,
            "password",
            "ChangedPassword123!",
            "confirmPassword",
            "ChangedPassword123!");
    mvc.perform(secure(post("/api/recovery/reset"), s, reset)).andExpect(status().isBadRequest());
    confirm(s, id, capture.codes.get("web@routineslim.test"), 200);
    mvc.perform(secure(post("/api/recovery/reset"), s, reset)).andExpect(status().isOk());
    auth.login("web_user", "ChangedPassword123!");
    assertThrows(Exception.class, () -> auth.login("web_user", "Password123!"));
    mvc.perform(get("/api/me").session(old)).andExpect(status().isUnauthorized());
    assertThrows(
        Exception.class,
        () -> recovery.reset(sessionId, id, "AnotherPassword123!", "AnotherPassword123!"));
  }

  @Test
  void copiedRecoveryRequestDoesNotWorkInAnotherSession() throws Exception {
    var s = new MockHttpSession();
    String id = start(s, "web@routineslim.test", "PASSWORD");
    confirm(new MockHttpSession(), id, capture.codes.get("web@routineslim.test"), 404);
  }

  @Test
  void wrongCodesEventuallyStopWorking() throws Exception {
    var s = new MockHttpSession();
    String id = start(s, "web@routineslim.test", "PASSWORD"),
        code = capture.codes.get("web@routineslim.test"),
        wrong = code.equals("000000") ? "111111" : "000000";
    for (int i = 0; i < 5; i++) confirm(s, id, wrong, 400);
    confirm(s, id, code, 400);
  }

  @Test
  void unknownEmailHasSamePublicResponseWithoutSendingCode() throws Exception {
    var s = new MockHttpSession();
    start(s, "unknown@routineslim.test", "ID");
    assertFalse(capture.codes.containsKey("unknown@routineslim.test"));
  }

  String emailChallenge(MockHttpSession s, String email) throws Exception {
    var response =
        mvc.perform(
                secure(
                    post("/api/v1/members/me/email/send"),
                    s,
                    Map.of("email", email, "currentPassword", "Password123!")))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse();
    return json.readTree(response.getContentAsString()).get("verificationId").asText();
  }

  @Test
  void emailChangeRequiresPasswordCodeAndOwnSessionThenUpdatesRecovery() throws Exception {
    var s = session("web_user");
    String email = "new@routineslim.test",
        id = emailChallenge(s, email),
        code = capture.codes.get(email);
    var body =
        Map.of(
            "email", email, "currentPassword", "Password123!", "verificationId", id, "code", code);
    mvc.perform(secure(put("/api/v1/members/me/email"), session("web_other"), body))
        .andExpect(status().isGone());
    var wrong = new HashMap<String, Object>(body);
    wrong.put("code", code.equals("000000") ? "111111" : "000000");
    mvc.perform(secure(put("/api/v1/members/me/email"), s, wrong))
        .andExpect(status().isBadRequest());
    wrong = new HashMap<>(body);
    wrong.put("currentPassword", "WrongPassword123");
    mvc.perform(secure(put("/api/v1/members/me/email"), s, wrong))
        .andExpect(status().isBadRequest());
    mvc.perform(get("/api/me").session(s)).andExpect(status().isOk());
    mvc.perform(secure(put("/api/v1/members/me/email"), s, body))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.email").value(email))
        .andExpect(jsonPath("$.emailVerified").value(true));
    mvc.perform(secure(put("/api/v1/members/me/email"), s, body)).andExpect(status().isGone());
    capture.codes.clear();
    start(new MockHttpSession(), "web@routineslim.test", "PASSWORD");
    assertFalse(capture.codes.containsKey("web@routineslim.test"));
    start(new MockHttpSession(), email, "PASSWORD");
    assertTrue(capture.codes.containsKey(email));
  }

  @Test
  void wrongPasswordChangeDoesNotExpireSession() throws Exception {
    var s = session("web_user");
    mvc.perform(
            secure(
                put("/api/password"),
                s,
                Map.of("currentPassword", "wrong", "password", "NewPassword123!")))
        .andExpect(status().isBadRequest());
    mvc.perform(get("/api/me").session(s)).andExpect(status().isOk());
  }

  @Test
  void emailChangeRejectsDuplicateAndMissingAuthentication() throws Exception {
    mvc.perform(get("/api/v1/members/me")).andExpect(status().isUnauthorized());
    var s = session("web_user");
    mvc.perform(
            secure(
                post("/api/v1/members/me/email/send"),
                s,
                Map.of("email", "web@routineslim.test", "currentPassword", "Password123!")))
        .andExpect(status().isConflict());
    mvc.perform(
            secure(
                post("/api/v1/members/me/email/send"),
                s,
                Map.of("email", "other@routineslim.test", "currentPassword", "wrong")))
        .andExpect(status().isBadRequest());
  }

  @Test
  void emailLoginReturnsCanonicalIdentityAndRememberCookie() throws Exception {
    var guest = new MockHttpSession();
    var result =
        mvc.perform(
                secure(
                    post("/api/login"),
                    guest,
                    Map.of(
                        "id",
                        " WEB@ROUTINESLIM.TEST ",
                        "password",
                        "Password123!",
                        "rememberMe",
                        true)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value("web_user"))
            .andReturn();
    var session = result.getRequest().getSession(false);
    assertEquals("web_user", session.getAttribute("user"));
    assertEquals(14 * 24 * 60 * 60, session.getMaxInactiveInterval());
    assertTrue(
        result.getResponse().getHeaders("Set-Cookie").stream()
            .anyMatch(
                x ->
                    x.contains("Max-Age=1209600")
                        && x.contains("HttpOnly")
                        && x.contains("SameSite=Lax")));
  }

  @Test
  void uncheckedRememberUsesShortLivedSession() throws Exception {
    var result =
        mvc.perform(
                secure(
                    post("/api/login"),
                    new MockHttpSession(),
                    Map.of("id", "web_user", "password", "Password123!", "rememberMe", false)))
            .andExpect(status().isOk())
            .andReturn();
    assertEquals(30 * 60, result.getRequest().getSession(false).getMaxInactiveInterval());
    assertTrue(
        result.getResponse().getHeaders("Set-Cookie").stream()
            .noneMatch(x -> x.contains("Max-Age=1209600")));
  }
}
