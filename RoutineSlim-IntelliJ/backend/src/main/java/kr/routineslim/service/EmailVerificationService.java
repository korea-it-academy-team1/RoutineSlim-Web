package kr.routineslim.service;

import java.nio.charset.StandardCharsets;
import java.security.*;
import java.sql.Timestamp;
import java.time.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

@Service
public class EmailVerificationService {
  private final JdbcTemplate db;
  private final TransactionTemplate tx;
  private final VerificationMailDelivery mail;
  private final AccountSecurityService accounts;
  private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
  private final SecureRandom random = new SecureRandom();
  private final int duration, cooldown;

  public EmailVerificationService(
      JdbcTemplate db,
      PlatformTransactionManager manager,
      VerificationMailDelivery mail,
      AccountSecurityService accounts,
      @Value("${routineslim.registration.code-seconds:600}") int duration,
      @Value("${routineslim.registration.resend-seconds:60}") int cooldown) {
    this.db = db;
    tx = new TransactionTemplate(manager);
    this.mail = mail;
    this.accounts = accounts;
    this.duration = duration;
    this.cooldown = cooldown;
  }

  public boolean mailAvailable() {
    return mail.available();
  }

  public static String normalize(String email) {
    return email.trim().toLowerCase(Locale.ROOT);
  }

  private static String hash(String value) {
    try {
      return HexFormat.of()
          .formatHex(
              MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException(e);
    }
  }

  public record Challenge(String verificationId, int expiresInSeconds, int resendAfterSeconds) {}

  public synchronized Challenge send(String rawEmail, String session, String ip) {
    String email = normalize(rawEmail);
    if (accounts.emailInUse(email))
      throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 사용 중인 이메일입니다.");
    if (!mail.available())
      throw new ResponseStatusException(
          HttpStatus.SERVICE_UNAVAILABLE, "인증 메일 발송 서버가 설정되지 않았습니다. 관리자에게 SMTP 설정을 요청해주세요.");
    Instant now = Instant.now();
    String owner = hash(session);
    var recent =
        db.queryForList(
            "SELECT created_at FROM signup_email_codes WHERE email=? AND session_hash=? ORDER BY"
                + " created_at DESC",
            email,
            owner);
    if (!recent.isEmpty()
        && ((Timestamp) recent.get(0).get("created_at"))
            .toInstant()
            .plusSeconds(cooldown)
            .isAfter(now))
      throw new ResponseStatusException(
          HttpStatus.TOO_MANY_REQUESTS, "인증번호 재발송은 " + cooldown + "초 후 가능합니다.");
    tx.executeWithoutResult(
        status -> {
          db.update(
              "DELETE FROM signup_mail_limits WHERE started_at<?",
              Timestamp.from(now.minusSeconds(3600)));
          limit("session:" + owner, 5, now);
          limit("email:" + hash(email), 5, now);
          limit("ip:" + hash(ip), 20, now);
        });
    String code = String.format(Locale.ROOT, "%06d", random.nextInt(1000000)),
        id = UUID.randomUUID().toString();
    mail.send(email, code, Math.max(1, duration / 60));
    tx.executeWithoutResult(
        status -> {
          db.update(
              "UPDATE signup_email_codes SET consumed=TRUE WHERE email=? AND session_hash=?",
              email,
              owner);
          db.update(
              "INSERT INTO"
                  + " signup_email_codes(verification_id,email,session_hash,code_hash,created_at,expires_at,attempts,consumed)"
                  + " VALUES(?,?,?,?,?,?,0,FALSE)",
              id,
              email,
              owner,
              encoder.encode(code),
              Timestamp.from(now),
              Timestamp.from(now.plusSeconds(duration)));
          db.update(
              "DELETE FROM signup_email_codes WHERE expires_at<?",
              Timestamp.from(now.minusSeconds(3600)));
        });
    return new Challenge(id, duration, cooldown);
  }

  private void limit(String key, int maximum, Instant now) {
    var rows = db.queryForList("SELECT requests FROM signup_mail_limits WHERE bucket_key=?", key);
    if (rows.isEmpty())
      db.update(
          "INSERT INTO signup_mail_limits(bucket_key,started_at,requests) VALUES(?,?,1)",
          key,
          Timestamp.from(now));
    else {
      if (((Number) rows.get(0).get("requests")).intValue() >= maximum)
        throw new ResponseStatusException(
            HttpStatus.TOO_MANY_REQUESTS, "인증 메일 요청이 너무 많습니다. 1시간 후 다시 시도해주세요.");
      db.update("UPDATE signup_mail_limits SET requests=requests+1 WHERE bucket_key=?", key);
    }
  }

  public void verify(String id, String code, String session) {
    Integer result =
        tx.execute(
            status -> {
              var rows =
                  db.queryForList(
                      "SELECT * FROM signup_email_codes WHERE verification_id=? AND session_hash=?"
                          + " FOR UPDATE",
                      id,
                      hash(session));
              if (rows.isEmpty()) return 410;
              var row = rows.get(0);
              if (Boolean.TRUE.equals(row.get("consumed"))
                  || !((Timestamp) row.get("expires_at")).toInstant().isAfter(Instant.now()))
                return 410;
              if (((Number) row.get("attempts")).intValue() >= 5) return 429;
              if (!encoder.matches(code, String.valueOf(row.get("code_hash")))) {
                db.update(
                    "UPDATE signup_email_codes SET attempts=attempts+1 WHERE verification_id=?",
                    id);
                return 400;
              }
              db.update(
                  "UPDATE signup_email_codes SET verified_at=? WHERE verification_id=?",
                  Timestamp.from(Instant.now()),
                  id);
              return 200;
            });
    if (result == null || result != 200)
      throw new ResponseStatusException(
          result != null && result == 429
              ? HttpStatus.TOO_MANY_REQUESTS
              : result != null && result == 400 ? HttpStatus.BAD_REQUEST : HttpStatus.GONE,
          result != null && result == 429
              ? "인증번호 입력 횟수를 초과했습니다. 새 인증번호를 발급받으세요."
              : result != null && result == 400
                  ? "인증번호가 일치하지 않습니다."
                  : "인증 요청이 만료되었거나 유효하지 않습니다. 다시 인증해주세요.");
  }

  public void consume(String id, String email, String session) {
    var rows =
        db.queryForList(
            "SELECT * FROM signup_email_codes WHERE verification_id=? AND session_hash=? AND"
                + " email=? FOR UPDATE",
            id,
            hash(session),
            normalize(email));
    if (rows.isEmpty()) throw unverified();
    var row = rows.get(0);
    if (row.get("verified_at") == null
        || Boolean.TRUE.equals(row.get("consumed"))
        || ((Number) row.get("attempts")).intValue() >= 5
        || !((Timestamp) row.get("expires_at")).toInstant().isAfter(Instant.now()))
      throw unverified();
    db.update("UPDATE signup_email_codes SET consumed=TRUE WHERE verification_id=?", id);
  }

  private ResponseStatusException unverified() {
    return new ResponseStatusException(HttpStatus.BAD_REQUEST, "유효한 이메일 인증을 먼저 완료해주세요.");
  }
}
