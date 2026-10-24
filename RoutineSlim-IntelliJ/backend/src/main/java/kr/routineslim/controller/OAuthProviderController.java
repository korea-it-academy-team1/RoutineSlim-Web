package kr.routineslim.controller;

import jakarta.servlet.http.HttpSession;
import java.util.Map;
import kr.routineslim.service.SocialProviderService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
public class OAuthProviderController {
  private final SocialProviderService providers;

  public OAuthProviderController(SocialProviderService providers) {
    this.providers = providers;
  }

  @GetMapping("/api/oauth/providers")
  public Map<String, Boolean> providers() {
    return providers.available();
  }

  @GetMapping("/api/oauth/{provider}/start")
  public Map<String, String> start(@PathVariable String provider, HttpSession session) {
    if (!SocialProviderService.LABELS.containsKey(provider))
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "지원하지 않는 소셜 로그인입니다.");
    if (!providers.configured(provider))
      throw new ResponseStatusException(
          HttpStatus.SERVICE_UNAVAILABLE, providers.missingMessage(provider));
    session.removeAttribute("oauth_error");
    return Map.of("authorizationUrl", "/oauth2/authorization/" + provider);
  }

  @GetMapping("/api/oauth/error")
  public Map<String, String> error(HttpSession session) {
    Object value = session.getAttribute("oauth_error");
    String code = value instanceof String ? (String) value : "authentication_failed";
    String message =
        switch (code) {
          case "account_suspended" -> "이용이 정지된 계정입니다. 관리자에게 문의해주세요.";
          case "access_denied" -> "소셜 로그인 동의가 취소되었습니다. 다시 시도해주세요.";
          case "invalid_client", "unauthorized_client" -> "소셜 앱의 Client ID와 Secret 설정을 확인해주세요.";
          case "invalid_scope" -> "소셜 앱에 등록된 동의항목과 서버 요청 범위가 다릅니다.";
          case "authorization_request_not_found", "invalid_state_parameter" ->
              "로그인 요청이 만료되었거나 세션이 일치하지 않습니다. 같은 브라우저 주소에서 다시 시작해주세요.";
          case "invalid_grant" -> "인증 코드가 만료되었거나 callback URL이 일치하지 않습니다. 다시 로그인해주세요.";
          case "invalid_user_info_response" -> "소셜 계정 식별 정보를 받지 못했습니다. 동의항목과 사용자 정보 응답을 확인해주세요.";
          default -> "소셜 로그인에 실패했습니다. 앱 키와 callback URL 설정을 확인하고 다시 시도해주세요.";
        };
    return Map.of("code", code, "message", message);
  }
}
