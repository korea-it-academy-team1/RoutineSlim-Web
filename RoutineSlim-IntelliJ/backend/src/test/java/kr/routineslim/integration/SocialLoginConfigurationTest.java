package kr.routineslim.integration;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(
    properties =
        "spring.security.oauth2.client.registration.google.redirect-uri=${GOOGLE_REDIRECT_URI:{baseUrl}/login/oauth2/code/{registrationId}}")
@AutoConfigureMockMvc
class SocialLoginConfigurationTest {
  @Autowired MockMvc mvc;
  @Autowired ClientRegistrationRepository registrations;

  @Test
  void actualSpringPropertiesEnableButtonsWithoutRawEnvironmentVariables() throws Exception {
    mvc.perform(get("/api/oauth/providers"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.google").value(true))
        .andExpect(jsonPath("$.kakao").value(false));
    mvc.perform(get("/api/oauth/google/start"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.authorizationUrl").value("/oauth2/authorization/google"));
  }

  @Test
  void missingProviderConfigurationHasAnActionableError() throws Exception {
    mvc.perform(get("/api/oauth/kakao/start"))
        .andExpect(status().isServiceUnavailable())
        .andExpect(
            jsonPath("$.error").value(org.hamcrest.Matchers.containsString("KAKAO_CLIENT_ID")));
    mvc.perform(get("/api/oauth/unknown/start")).andExpect(status().isNotFound());
  }

  @Test
  void redirectPlaceholderDefaultIsNotTruncated() throws Exception {
    assertEquals(
        "{baseUrl}/login/oauth2/code/{registrationId}",
        registrations.findByRegistrationId("google").getRedirectUri());
  }
}
