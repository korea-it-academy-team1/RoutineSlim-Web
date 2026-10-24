package kr.routineslim.service;

import java.sql.Timestamp;
import java.time.Instant;
import kr.routineslim.dto.RegistrationRequest;
import kr.routineslim.repository.MemberRepository;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class RegistrationService {
  public static final String TERMS_VERSION = "2026-10-24", PRIVACY_VERSION = "2026-10-24";
  private final AuthenticationService auth;
  private final MemberRepository members;
  private final AccountSecurityService security;
  private final EmailVerificationService verification;
  private final JdbcTemplate db;

  public RegistrationService(
      AuthenticationService auth,
      MemberRepository members,
      AccountSecurityService security,
      EmailVerificationService verification,
      JdbcTemplate db) {
    this.auth = auth;
    this.members = members;
    this.security = security;
    this.verification = verification;
    this.db = db;
  }

  public boolean idAvailable(String id) {
    return id != null
        && id.matches("[a-zA-Z][a-zA-Z0-9_]{3,19}")
        && !id.startsWith("oauth_")
        && !id.equalsIgnoreCase("routineslim_admin")
        && !id.equalsIgnoreCase(security.adminId())
        && members.passwordHash(id).isEmpty();
  }

  @Transactional
  public String register(RegistrationRequest r, String session) {
    if (!Boolean.TRUE.equals(r.agreeTerms())
        || !Boolean.TRUE.equals(r.agreePrivacy())
        || !Boolean.TRUE.equals(r.ageOver14()))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "필수 약관 동의와 만 14세 이상 확인이 필요합니다.");
    if (!TERMS_VERSION.equals(r.termsVersion()) || !PRIVACY_VERSION.equals(r.privacyVersion()))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "약관이 변경되었습니다. 새로고침 후 다시 동의해주세요.");
    if (!r.password().equals(r.confirmPassword()))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "비밀번호 확인이 일치하지 않습니다.");
    if (r.password().getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72
        || r.password().chars().anyMatch(Character::isWhitespace)
        || !r.password().matches(".*[a-zA-Z].*")
        || !r.password().matches(".*[0-9].*"))
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "비밀번호는 공백 없이 영문과 숫자를 포함한 8자 이상, 72바이트 이하로 입력해주세요.");
    if (!idAvailable(r.id()))
      throw new ResponseStatusException(HttpStatus.CONFLICT, "사용할 수 없는 아이디입니다.");
    String email = EmailVerificationService.normalize(r.email());
    if (security.emailInUse(email))
      throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 사용 중인 이메일입니다.");
    verification.consume(r.verificationId(), email, session);
    auth.register(r.id(), r.password());
    members.updateProfile(r.id(), r.name().trim(), email);
    try {
      db.update(
          "INSERT INTO"
              + " account_security(user_id,role,verified_email,terms_version,privacy_version,agreed_at,verified_at,age_over_14)"
              + " VALUES(?,'USER',?,?,?,?,?,TRUE)",
          r.id(),
          email,
          TERMS_VERSION,
          PRIVACY_VERSION,
          Timestamp.from(Instant.now()),
          Timestamp.from(Instant.now()));
    } catch (org.springframework.dao.DuplicateKeyException e) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 사용 중인 이메일입니다.");
    }
    return r.id();
  }
}
