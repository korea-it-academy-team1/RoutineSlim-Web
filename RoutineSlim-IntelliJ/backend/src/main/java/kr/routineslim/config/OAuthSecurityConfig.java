package kr.routineslim.config;

import kr.routineslim.service.SocialAccountService;
import org.springframework.context.annotation.*;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.client.endpoint.RestClientAuthorizationCodeTokenResponseClient;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.security.web.csrf.*;
import org.springframework.util.LinkedMultiValueMap;

@Configuration
public class OAuthSecurityConfig {
  @Bean
  RestClientAuthorizationCodeTokenResponseClient socialTokenClient() {
    var client = new RestClientAuthorizationCodeTokenResponseClient();
    client.addParametersConverter(
        request -> {
          var extra = new LinkedMultiValueMap<String, String>();
          if ("naver".equals(request.getClientRegistration().getRegistrationId()))
            extra.add(
                "state", request.getAuthorizationExchange().getAuthorizationRequest().getState());
          return extra;
        });
    return client;
  }

  @Bean
  SecurityFilterChain securityFilterChain(
      HttpSecurity http,
      AuthenticationSuccessHandler socialSuccess,
      RestClientAuthorizationCodeTokenResponseClient socialTokenClient)
      throws Exception {
    http.csrf(
            csrf ->
                csrf.csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                    .csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler()))
        .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
        .oauth2Login(
            oauth ->
                oauth
                    .loginPage("/")
                    .tokenEndpoint(token -> token.accessTokenResponseClient(socialTokenClient))
                    .successHandler(socialSuccess)
                    .failureHandler(
                        (request, response, exception) -> {
                          String code =
                              exception instanceof OAuth2AuthenticationException failure
                                  ? failure.getError().getErrorCode()
                                  : "authentication_failed";
                          request.getSession(true).setAttribute("oauth_error", code);
                          response.sendRedirect("/?oauth_error=1");
                        }));
    return http.build();
  }

  @Bean
  AuthenticationSuccessHandler socialSuccess(
      SocialAccountService accounts,
      kr.routineslim.service.AccountRestrictionService restrictions) {
    return (request, response, authentication) -> {
      try {
        var token = (OAuth2AuthenticationToken) authentication;
        String user =
            accounts.signIn(
                token.getAuthorizedClientRegistrationId(), token.getPrincipal().getAttributes());
        if (restrictions.suspended(user))
          throw new OAuth2AuthenticationException(
              new org.springframework.security.oauth2.core.OAuth2Error("account_suspended"));
        request.getSession(true);
        request.changeSessionId();
        request.getSession().setAttribute("user", user);
        request.getSession().setAttribute("accountRevision", restrictions.revision(user));
        request.getSession().removeAttribute("oauth_error");
        response.sendRedirect("/");
      } catch (OAuth2AuthenticationException error) {
        request.getSession(true).setAttribute("oauth_error", error.getError().getErrorCode());
        response.sendRedirect("/?oauth_error=1");
      }
    };
  }
}
