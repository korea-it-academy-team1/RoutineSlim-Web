package kr.routineslim.integration;

import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nimbusds.jose.*;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.*;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jwt.*;
import com.sun.net.httpserver.HttpServer;
import java.net.*;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.client.registration.*;
import org.springframework.security.oauth2.core.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(SocialLoginFlowTest.ProviderConfig.class)
class SocialLoginFlowTest {
  @LocalServerPort int port;
  @Autowired JdbcTemplate db;
  static final ObjectMapper JSON = new ObjectMapper();
  static final Map<String, Map<String, String>> codes = new ConcurrentHashMap<>();
  static final RSAKey key;
  static final HttpServer provider;
  static final String issuer;

  static {
    try {
      key = new RSAKeyGenerator(2048).keyID("local-test-key").generate();
      provider = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
      issuer = "http://127.0.0.1:" + provider.getAddress().getPort();
      provider.createContext(
          "/authorize",
          exchange -> {
            var values = parse(exchange.getRequestURI().getRawQuery());
            String code = UUID.randomUUID().toString();
            codes.put(code, values);
            exchange
                .getResponseHeaders()
                .set(
                    "Location",
                    values.get("redirect_uri")
                        + "?code="
                        + enc(code)
                        + "&state="
                        + enc(values.get("state")));
            exchange.sendResponseHeaders(302, -1);
            exchange.close();
          });
      provider.createContext(
          "/token",
          exchange -> {
            try {
              var form =
                  parse(
                      new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
              var original = codes.remove(form.get("code"));
              String id = exchange.getRequestURI().getPath().substring("/token/".length());
              if (original == null || !"authorization_code".equals(form.get("grant_type")))
                throw new IllegalArgumentException();
              if ("naver".equals(id) && !Objects.equals(original.get("state"), form.get("state")))
                throw new IllegalArgumentException("Missing state");
              if (!"google".equals(id) && !("secret-" + id).equals(form.get("client_secret")))
                throw new IllegalArgumentException("Missing client secret");
              Map<String, Object> result = new LinkedHashMap<>();
              result.put("access_token", "access-" + id);
              result.put("token_type", "Bearer");
              result.put("expires_in", 3600);
              result.put("scope", original.get("scope"));
              if ("google".equals(id)) {
                var claims =
                    new JWTClaimsSet.Builder()
                        .issuer(issuer)
                        .subject("subject-google")
                        .audience("client-google")
                        .issueTime(new Date())
                        .expirationTime(Date.from(Instant.now().plusSeconds(300)))
                        .claim("nonce", original.get("nonce"))
                        .claim("name", "Google Name")
                        .claim("email", "google@example.com")
                        .build();
                var jwt =
                    new SignedJWT(
                        new JWSHeader.Builder(JWSAlgorithm.RS256).keyID(key.getKeyID()).build(),
                        claims);
                jwt.sign(new RSASSASigner(key));
                result.put("id_token", jwt.serialize());
              }
              send(exchange, 200, result);
            } catch (Exception e) {
              send(exchange, 400, Map.of("error", "invalid_request"));
            }
          });
      provider.createContext(
          "/userinfo",
          exchange -> {
            String id = exchange.getRequestURI().getPath().substring("/userinfo/".length());
            Object result =
                switch (id) {
                  case "google" ->
                      Map.of(
                          "sub",
                          "subject-google",
                          "name",
                          "Google Name",
                          "email",
                          "google@example.com");
                  case "kakao" ->
                      Map.of(
                          "id",
                          123456,
                          "kakao_account",
                          Map.of(
                              "email",
                              "kakao@example.com",
                              "profile",
                              Map.of("nickname", "Kakao Name")));
                  default ->
                      Map.of(
                          "resultcode",
                          "00",
                          "response",
                          Map.of(
                              "id",
                              "subject-naver",
                              "name",
                              "Naver Name",
                              "email",
                              "naver@example.com"));
                };
            send(exchange, 200, result);
          });
      provider.createContext(
          "/jwks", exchange -> send(exchange, 200, new JWKSet(key.toPublicJWK()).toJSONObject()));
      provider.start();
    } catch (Exception e) {
      throw new ExceptionInInitializerError(e);
    }
  }

  static void send(com.sun.net.httpserver.HttpExchange exchange, int status, Object value)
      throws java.io.IOException {
    byte[] body = JSON.writeValueAsBytes(value);
    exchange.getResponseHeaders().set("Content-Type", "application/json");
    exchange.sendResponseHeaders(status, body.length);
    exchange.getResponseBody().write(body);
    exchange.close();
  }

  static String enc(String value) {
    return URLEncoder.encode(value, StandardCharsets.UTF_8);
  }

  static Map<String, String> parse(String query) {
    var result = new HashMap<String, String>();
    if (query != null)
      for (String pair : query.split("&")) {
        String[] p = pair.split("=", 2);
        result.put(
            URLDecoder.decode(p[0], StandardCharsets.UTF_8),
            p.length > 1 ? URLDecoder.decode(p[1], StandardCharsets.UTF_8) : "");
      }
    return result;
  }

  @TestConfiguration
  static class ProviderConfig {
    @Bean
    @Primary
    ClientRegistrationRepository testRegistrations() {
      return new InMemoryClientRegistrationRepository(
          java.util.List.of("google", "kakao", "naver").stream()
              .map(
                  id -> {
                    var registration =
                        ClientRegistration.withRegistrationId(id)
                            .clientId("client-" + id)
                            .clientSecret("secret-" + id)
                            .clientAuthenticationMethod(
                                "google".equals(id)
                                    ? ClientAuthenticationMethod.CLIENT_SECRET_BASIC
                                    : ClientAuthenticationMethod.CLIENT_SECRET_POST)
                            .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                            .redirectUri("{baseUrl}/login/oauth2/code/{registrationId}")
                            .authorizationUri(issuer + "/authorize")
                            .tokenUri(issuer + "/token/" + id)
                            .userInfoUri(issuer + "/userinfo/" + id)
                            .userNameAttributeName(
                                "naver".equals(id)
                                    ? "response"
                                    : "kakao".equals(id) ? "id" : "sub");
                    if ("google".equals(id))
                      registration
                          .scope("openid", "profile", "email")
                          .jwkSetUri(issuer + "/jwks")
                          .issuerUri(issuer);
                    else registration.scope("profile");
                    return registration.build();
                  })
              .toList());
    }
  }

  HttpClient client() {
    return HttpClient.newBuilder()
        .cookieHandler(new CookieManager(null, CookiePolicy.ACCEPT_ALL))
        .followRedirects(HttpClient.Redirect.NEVER)
        .build();
  }

  HttpResponse<String> get(HttpClient client, String url) throws Exception {
    return client.send(
        HttpRequest.newBuilder(
                URI.create(url.startsWith("http") ? url : "http://127.0.0.1:" + port + url))
            .GET()
            .build(),
        HttpResponse.BodyHandlers.ofString());
  }

  void complete(String id, String expectedId, String expectedName) throws Exception {
    var client = client();
    var start = get(client, "/api/oauth/" + id + "/start");
    assertEquals(200, start.statusCode());
    var redirect = get(client, JSON.readTree(start.body()).get("authorizationUrl").asText());
    assertEquals(302, redirect.statusCode());
    var consent = get(client, redirect.headers().firstValue("Location").orElseThrow());
    assertEquals(302, consent.statusCode());
    var callback = get(client, consent.headers().firstValue("Location").orElseThrow());
    assertEquals(302, callback.statusCode());
    assertEquals(
        "/", URI.create(callback.headers().firstValue("Location").orElseThrow()).getPath());
    var me = get(client, "/api/me");
    assertEquals(200, me.statusCode());
    assertEquals(expectedId, JSON.readTree(me.body()).get("id").asText());
    assertEquals(
        expectedName,
        JSON.readTree(get(client, "/api/v1/members/me").body()).get("displayName").asText());
    assertEquals(
        1,
        db.queryForObject("SELECT COUNT(*) FROM app_users WHERE id=?", Integer.class, expectedId));
  }

  @Test
  void googleOidcCodeExchangeVerifiesSignedIdTokenAndCreatesSession() throws Exception {
    complete("google", "oauth_google_subject-google", "Google Name");
    complete("google", "oauth_google_subject-google", "Google Name");
  }

  @Test
  void kakaoCodeExchangeCreatesSessionFromNestedProfile() throws Exception {
    complete("kakao", "oauth_kakao_123456", "Kakao Name");
  }

  @Test
  void naverCodeExchangeIncludesStateAndUnwrapsResponse() throws Exception {
    complete("naver", "oauth_naver_subject-naver", "Naver Name");
  }

  @Test
  void stateMismatchIsRejectedBeforeTokenExchange() throws Exception {
    var client = client();
    var auth = get(client, "/oauth2/authorization/naver");
    var redirect = get(client, auth.headers().firstValue("Location").orElseThrow());
    String callback =
        redirect
            .headers()
            .firstValue("Location")
            .orElseThrow()
            .replaceAll("state=[^&]+", "state=forged");
    var response = get(client, callback);
    assertEquals(
        "oauth_error=1",
        URI.create(response.headers().firstValue("Location").orElseThrow()).getRawQuery());
    assertEquals(401, get(client, "/api/me").statusCode());
    assertEquals(
        "authorization_request_not_found",
        JSON.readTree(get(client, "/api/oauth/error").body()).get("code").asText());
  }

  @Test
  void userCancellationHasUsefulErrorAndNoSession() throws Exception {
    var client = client();
    var auth = get(client, "/oauth2/authorization/kakao");
    String state =
        parse(URI.create(auth.headers().firstValue("Location").orElseThrow()).getRawQuery())
            .get("state");
    get(client, "/login/oauth2/code/kakao?error=access_denied&state=" + enc(state));
    assertEquals(
        "access_denied",
        JSON.readTree(get(client, "/api/oauth/error").body()).get("code").asText());
    assertEquals(401, get(client, "/api/me").statusCode());
  }
}
