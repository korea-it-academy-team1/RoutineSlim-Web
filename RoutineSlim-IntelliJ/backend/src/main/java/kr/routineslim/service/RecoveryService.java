package kr.routineslim.service;

import com.fasterxml.jackson.databind.node.ObjectNode;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.sql.Timestamp;
import java.time.*;
import java.util.*;
import kr.routineslim.repository.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

@Service
public class RecoveryService {
  private final FeatureRecordRepository records;
  private final JdbcTemplate db;
  private final VerificationMailDelivery mail;
  private final TransactionTemplate tx;
  private final AccountRestrictionService restrictions;
  private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
  private final SecureRandom random = new SecureRandom();
  private final int cooldown;

  public RecoveryService(
      FeatureRecordRepository records,
      JdbcTemplate db,
      VerificationMailDelivery mail,
      PlatformTransactionManager manager,
      AccountRestrictionService restrictions,
      @Value("${routineslim.registration.resend-seconds:60}") int cooldown) {
    this.records = records;
    this.db = db;
    this.mail = mail;
    tx = new TransactionTemplate(manager);
    this.restrictions = restrictions;
    this.cooldown = cooldown;
  }

  private String hash(String text) {
    try {
      return HexFormat.of()
          .formatHex(
              MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8)));
    } catch (Exception e) {
      throw new IllegalStateException(e);
    }
  }

  private String owner(String session) {
    return "RECOVERY:" + hash(session);
  }

  public synchronized Map<String, Object> start(
      String rawEmail, String purpose, String session, String ip) {
    if (!Set.of("ID", "PASSWORD").contains(purpose))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
    if (!mail.available())
      throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "이메일 발송 설정이 필요합니다.");
    String email = EmailVerificationService.normalize(rawEmail), owner = owner(session);
    Instant now = Instant.now();
    var previous = records.list(owner, "recovery");
    if (!previous.isEmpty()
        && Instant.parse(previous.get(0).path("createdAt").asText())
            .plusSeconds(cooldown)
            .isAfter(now))
      throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "잠시 후 다시 요청해주세요.");
    tx.executeWithoutResult(
        status -> {
          db.update(
              "DELETE FROM feature_records WHERE record_type='recovery' AND created_at<?",
              Timestamp.from(now.minusSeconds(3600)));
          db.update(
              "DELETE FROM signup_mail_limits WHERE started_at<?",
              Timestamp.from(now.minusSeconds(3600)));
          limit("recovery:session:" + hash(session), 5, now);
          limit("recovery:email:" + hash(email), 5, now);
          limit("recovery:ip:" + hash(ip), 20, now);
        });
    var ids =
        db.query(
            "SELECT u.id FROM app_users u JOIN account_security s ON s.user_id=u.id WHERE"
                + " s.verified_email=? AND u.id NOT LIKE 'oauth_%'",
            (rs, n) -> rs.getString(1), email);
    String code = String.format(Locale.ROOT, "%06d", random.nextInt(1000000));
    var payload = records.object();
    payload.put("email", email);
    payload.put("purpose", purpose);
    payload.put("codeHash", encoder.encode(code));
    payload.put("expiresAt", now.plusSeconds(600).toString());
    payload.put("attempts", 0);
    payload.put("verified", false);
    payload.put("consumed", false);
    payload
        .putArray("ids")
        .addAll(
            ids.stream()
                .map(x -> com.fasterxml.jackson.databind.node.TextNode.valueOf(x))
                .toList());
    if (!ids.isEmpty()) mail.sendRecovery(email, code, 10);
    ObjectNode saved =
        tx.execute(
            status -> {
              for (var old : records.list(owner, "recovery")) {
                old.put("consumed", true);
                records.save(owner, "recovery", old.path("id").asText(), old);
              }
              return records.create(owner, "recovery", payload);
            });
    return Map.of(
        "requestId",
        saved.path("id").asText(),
        "message",
        "입력한 이메일로 복구 가능한 계정이 있으면 인증번호를 발송했습니다.",
        "expiresInSeconds",
        600);
  }

  private void limit(String key, int count, Instant now) {
    var rows = db.queryForList("SELECT requests FROM signup_mail_limits WHERE bucket_key=?", key);
    if (rows.isEmpty())
      db.update(
          "INSERT INTO signup_mail_limits(bucket_key,started_at,requests) VALUES(?,?,1)",
          key,
          Timestamp.from(now));
    else {
      if (((Number) rows.get(0).get("requests")).intValue() >= count)
        throw new ResponseStatusException(
            HttpStatus.TOO_MANY_REQUESTS, "요청 횟수를 초과했습니다. 1시간 후 다시 시도해주세요.");
      db.update("UPDATE signup_mail_limits SET requests=requests+1 WHERE bucket_key=?", key);
    }
  }

  private boolean valid(ObjectNode n) {
    return !n.path("consumed").asBoolean()
        && n.path("attempts").asInt() < 5
        && Instant.parse(n.path("expiresAt").asText()).isAfter(Instant.now());
  }

  public Map<String, Object> confirm(String session, String id, String code) {
    var result =
        tx.execute(
            status -> {
              var n = records.lock(owner(session), "recovery", id);
              if (!valid(n)) return Map.<String, Object>of("error", 410);
              if (!encoder.matches(code, n.path("codeHash").asText()) || n.path("ids").isEmpty()) {
                n.put("attempts", n.path("attempts").asInt() + 1);
                records.save(owner(session), "recovery", id, n);
                return Map.<String, Object>of("error", 400);
              }
              n.put("verified", true);
              if ("ID".equals(n.path("purpose").asText())) n.put("consumed", true);
              records.save(owner(session), "recovery", id, n);
              return "ID".equals(n.path("purpose").asText())
                  ? Map.<String, Object>of("verified", true, "ids", n.path("ids"))
                  : Map.<String, Object>of("verified", true);
            });
    if (result.containsKey("error"))
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "인증번호가 틀렸거나 요청이 만료되었습니다. 다시 인증해주세요.");
    return result;
  }

  public void reset(String session, String id, String password, String confirmation) {
    if (!Objects.equals(password, confirmation)
        || password == null
        || password.length() < 8
        || password.getBytes(StandardCharsets.UTF_8).length > 72
        || password.chars().anyMatch(Character::isWhitespace)
        || !password.matches(".*[A-Za-z].*")
        || !password.matches(".*[0-9].*"))
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "공백 없이 영문·숫자를 포함한 8자 이상 비밀번호와 확인 값을 입력해주세요.");
    tx.executeWithoutResult(
        status -> {
          var n = records.lock(owner(session), "recovery", id);
          if (!valid(n)
              || !n.path("verified").asBoolean()
              || !"PASSWORD".equals(n.path("purpose").asText())
              || n.path("ids").size() != 1)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이메일 인증을 먼저 완료해주세요.");
          String user = n.path("ids").get(0).asText();
          if (db.queryForObject(
                  "SELECT COUNT(*) FROM account_security WHERE user_id=? AND verified_email=?",
                  Integer.class,
                  user,
                  n.path("email").asText())
              != 1) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "계정 정보가 변경되었습니다.");
          db.update(
              "UPDATE app_users SET password_hash=? WHERE id=?", encoder.encode(password), user);
          restrictions.invalidate(user);
          n.put("consumed", true);
          records.save(owner(session), "recovery", id, n);
        });
  }
}
