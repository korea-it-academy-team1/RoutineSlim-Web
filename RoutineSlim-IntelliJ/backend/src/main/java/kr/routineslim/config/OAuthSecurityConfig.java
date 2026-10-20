package kr.routineslim.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.security.web.authentication.logout.LogoutSuccessHandler;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import java.util.Map;
import java.util.UUID;

@Configuration
public class OAuthSecurityConfig {
    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, AuthenticationSuccessHandler socialSuccess) throws Exception {
        CsrfTokenRequestAttributeHandler requestHandler = new CsrfTokenRequestAttributeHandler();
        http.csrf(csrf -> csrf
                .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                .csrfTokenRequestHandler(requestHandler))
            .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
            .oauth2Login(oauth -> oauth.loginPage("/").successHandler(socialSuccess)
                .failureHandler((req,res,ex) -> res.sendRedirect("/?oauth_error=1")));
        return http.build();
    }

    @Bean
    AuthenticationSuccessHandler socialSuccess(JdbcTemplate db) {
        return (request,response,authentication) -> {
            OAuth2AuthenticationToken token=(OAuth2AuthenticationToken) authentication;
            String provider=token.getAuthorizedClientRegistrationId();
            Map<String,Object> attributes=token.getPrincipal().getAttributes();
            Map<String,Object> info=attributes;
            if ("naver".equals(provider) && attributes.get("response") instanceof Map<?,?> nested) {
                info=(Map<String,Object>)nested;
            }
            String subject=String.valueOf(info.getOrDefault("id", attributes.get("sub")));
            if(subject==null || subject.equals("null") || subject.isBlank()) {
                response.sendRedirect("/?oauth_error=1"); return;
            }
            String userId="oauth_"+provider+"_"+subject;
            String email=String.valueOf(info.getOrDefault("email", ""));
            String name=String.valueOf(info.getOrDefault("name", info.getOrDefault("nickname", "")));
            if("kakao".equals(provider)) {
                Object account=attributes.get("kakao_account");
                if(account instanceof Map<?,?> a) {
                    email=String.valueOf(a.containsKey("email") ? a.get("email") : "");
                    Object profile=a.get("profile");
                    if(profile instanceof Map<?,?> profileMap) name=String.valueOf(profileMap.containsKey("nickname") ? profileMap.get("nickname") : "");
                }
            }
            if(name.isBlank()) name=provider+" 사용자";
            if(db.queryForList("SELECT id FROM app_users WHERE id=?",userId).isEmpty()) {
                db.update("INSERT INTO app_users(id,password_hash,display_name,email,profile_json) VALUES(?,?,?,?,?)",
                    userId,new BCryptPasswordEncoder().encode(UUID.randomUUID().toString()),name,email,"{}");
            }
            request.changeSessionId();
            request.getSession(true).setAttribute("user",userId);
            response.sendRedirect("/");
        };
    }
}
