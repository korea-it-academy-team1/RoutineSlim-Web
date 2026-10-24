package kr.routineslim.service;

import java.util.*;
import org.springframework.security.oauth2.client.registration.*;
import org.springframework.stereotype.Service;

@Service
public class SocialProviderService {
  private final ClientRegistrationRepository registrations;

  public SocialProviderService(ClientRegistrationRepository registrations) {
    this.registrations = registrations;
  }

  public static final Map<String, String> LABELS =
      Map.of("google", "Google", "kakao", "카카오", "naver", "네이버");

  public boolean configured(String provider) {
    if (!LABELS.containsKey(provider)) return false;
    ClientRegistration c = registrations.findByRegistrationId(provider);
    return c != null && real(c.getClientId()) && real(c.getClientSecret());
  }

  private boolean real(String value) {
    return value != null && !value.isBlank() && !value.startsWith("disabled-");
  }

  public Map<String, Boolean> available() {
    return Map.of(
        "google", configured("google"), "kakao", configured("kakao"), "naver", configured("naver"));
  }

  public String missingMessage(String provider) {
    String prefix = provider.toUpperCase(java.util.Locale.ROOT);
    return LABELS.get(provider)
        + " 로그인이 아직 설정되지 않았습니다. 서버 실행 구성의 "
        + prefix
        + "_CLIENT_ID / "
        + prefix
        + "_CLIENT_SECRET과 callback URL을 확인해주세요.";
  }
}
