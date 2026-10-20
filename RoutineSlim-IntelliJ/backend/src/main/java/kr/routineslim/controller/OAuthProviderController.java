package kr.routineslim.controller;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;
@RestController
public class OAuthProviderController {
    @Value("${GOOGLE_CLIENT_ID:}") private String google;
    @Value("${GOOGLE_CLIENT_SECRET:}") private String googleSecret;
    @Value("${KAKAO_CLIENT_ID:}") private String kakao;
    @Value("${KAKAO_CLIENT_SECRET:}") private String kakaoSecret;
    @Value("${NAVER_CLIENT_ID:}") private String naver;
    @Value("${NAVER_CLIENT_SECRET:}") private String naverSecret;
    @GetMapping("/api/oauth/providers")
    public Map<String,Boolean> providers(){return Map.of("google",!google.isBlank()&&!googleSecret.isBlank(),"kakao",!kakao.isBlank()&&!kakaoSecret.isBlank(),"naver",!naver.isBlank()&&!naverSecret.isBlank());}
}
