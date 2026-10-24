package kr.routineslim.service;

import java.util.*;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.oauth2.core.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SocialAccountService {
  private final JdbcTemplate db;
  private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

  public SocialAccountService(JdbcTemplate db) {
    this.db = db;
  }

  @Transactional
  public String signIn(String provider, Map<String, Object> attributes) {
    if (!SocialProviderService.LABELS.containsKey(provider)) throw failure();
    Map<?, ?> info = attributes;
    if ("naver".equals(provider)) {
      if (!(attributes.get("response") instanceof Map<?, ?> nested)) throw failure();
      info = nested;
    }
    String subject = text(info.get("google".equals(provider) ? "sub" : "id"));
    if (subject.isBlank()) throw failure();
    String user = "oauth_" + provider + "_" + subject;
    if (user.length() > 120) throw failure();
    String email = text(info.get("email")), name = text(info.get("name"));
    if (name.isBlank()) name = text(info.get("nickname"));
    if ("kakao".equals(provider) && attributes.get("kakao_account") instanceof Map<?, ?> account) {
      email = text(account.get("email"));
      if (account.get("profile") instanceof Map<?, ?> profile) name = text(profile.get("nickname"));
    }
    if (name.isBlank()) name = SocialProviderService.LABELS.get(provider) + " 사용자";
    if (name.length() > 120) name = name.substring(0, 120);
    if (email.length() > 255) email = "";
    if (db.queryForList("SELECT id FROM app_users WHERE id=?", user).isEmpty()) {
      try {
        db.update(
            "INSERT INTO app_users(id,password_hash,display_name,email,profile_json)"
                + " VALUES(?,?,?,?,?)",
            user,
            encoder.encode(UUID.randomUUID().toString()),
            name,
            email,
            "{}");
      } catch (DuplicateKeyException concurrent) {
        if (db.queryForList("SELECT id FROM app_users WHERE id=?", user).isEmpty())
          throw concurrent;
      }
    }
    return user;
  }

  private String text(Object value) {
    return value instanceof String || value instanceof Number ? String.valueOf(value).trim() : "";
  }

  private OAuth2AuthenticationException failure() {
    return new OAuth2AuthenticationException(
        new OAuth2Error("invalid_user_info_response"), "Missing social account identity");
  }
}
