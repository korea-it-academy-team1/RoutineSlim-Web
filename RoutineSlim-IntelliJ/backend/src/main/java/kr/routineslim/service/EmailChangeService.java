package kr.routineslim.service;

import java.sql.Timestamp;
import java.time.Instant;
import kr.routineslim.repository.MemberRepository;
import kr.routineslim.repository.UserDataRepository;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class EmailChangeService {
  private final MemberRepository members;
  private final UserDataRepository data;
  private final EmailVerificationService verification;
  private final AccountSecurityService security;
  private final JdbcTemplate db;
  private final MemberService profiles;

  public EmailChangeService(
      MemberRepository members,
      UserDataRepository data,
      EmailVerificationService verification,
      AccountSecurityService security,
      JdbcTemplate db,
      MemberService profiles) {
    this.members = members;
    this.data = data;
    this.verification = verification;
    this.security = security;
    this.db = db;
    this.profiles = profiles;
  }

  private void authenticate(String user, String password) {
    if (user.startsWith("oauth_"))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "소셜 계정의 이메일은 로그인 제공자에서 관리해주세요.");
    if (password == null
        || password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72
        || !members
            .passwordHash(user)
            .map(h -> new BCryptPasswordEncoder().matches(password, h))
            .orElse(false))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "현재 비밀번호가 일치하지 않습니다.");
  }

  public EmailVerificationService.Challenge send(
      String user, String email, String password, String session, String ip) {
    authenticate(user, password);
    return verification.send(email, session, ip);
  }

  @Transactional
  public kr.routineslim.dto.MemberProfileResponse change(
      String user, String email, String password, String proof, String session) {
    data.lockUser(user);
    authenticate(user, password);
    String normalized = EmailVerificationService.normalize(email);
    if (security.emailInUse(normalized))
      throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 사용 중인 이메일입니다.");
    verification.consume(proof, normalized, session);
    // Existing accounts without signup consent metadata must not gain fabricated consent records.
    if (db.queryForObject(
            "SELECT COUNT(*) FROM account_security WHERE user_id=?", Integer.class, user)
        != 1)
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이메일 인증 가입 계정에서 사용할 수 있습니다.");
    try {
      db.update(
          "UPDATE account_security SET verified_email=?,verified_at=? WHERE user_id=?",
          normalized,
          Timestamp.from(Instant.now()),
          user);
    } catch (org.springframework.dao.DuplicateKeyException e) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 사용 중인 이메일입니다.");
    }
    var old = profiles.get(user);
    return profiles.update(
        user,
        new kr.routineslim.dto.MemberProfileRequest(
            old.displayName(),
            normalized,
            old.phone(),
            old.birth(),
            old.address(),
            old.addressDetail(),
            old.photo()));
  }
}
