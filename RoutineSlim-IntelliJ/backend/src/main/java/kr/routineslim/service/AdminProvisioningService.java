package kr.routineslim.service;

import java.nio.file.*;
import java.nio.file.attribute.*;
import java.security.SecureRandom;
import java.util.*;
import kr.routineslim.repository.MemberRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminProvisioningService {
  private final JdbcTemplate db;
  private final MemberRepository members;

  public AdminProvisioningService(JdbcTemplate db, MemberRepository members) {
    this.db = db;
    this.members = members;
  }

  @Transactional(rollbackFor = Exception.class)
  public boolean provision(String id, String configuredPassword, Path file)
      throws java.io.IOException {
    if (id == null || !id.matches("[a-zA-Z][a-zA-Z0-9_]{3,39}"))
      throw new IllegalArgumentException("Invalid admin ID");
    boolean exists = members.passwordHash(id).isPresent();
    boolean requestedDefault = "routinslim".equals(id) && "admin123".equals(configuredPassword);
    boolean applied =
        db.queryForObject(
                "SELECT COUNT(*) FROM user_data WHERE user_id=? AND"
                    + " data_key='admin_credentials_revision'",
                Integer.class,
                id)
            > 0;
    if (exists) {
      if (db.queryForObject(
              "SELECT COUNT(*) FROM account_security WHERE user_id=? AND role='ADMIN'",
              Integer.class,
              id)
          == 0)
        throw new IllegalStateException(
            "관리자 생성 아이디가 기존 일반 계정과 충돌합니다. ROUTINESLIM_ADMIN_ID를 다른 값으로 설정하세요.");
      if (!requestedDefault || applied) return false;
    }
    byte[] bytes = new byte[24];
    new SecureRandom().nextBytes(bytes);
    String password =
        configuredPassword.isBlank()
            ? Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)
            : configuredPassword;
    if (password.length() < 8
        || password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72)
      throw new IllegalArgumentException(
          "Admin password must be at least 8 characters and at most 72 UTF-8 bytes");
    String hash = new BCryptPasswordEncoder().encode(password);
    if (exists) members.changePassword(id, hash);
    else {
      members.create(id, hash);
      members.updateProfile(id, "관리자", "");
      db.update("INSERT INTO account_security(user_id,role) VALUES(?,'ADMIN')", id);
    }
    if (requestedDefault) {
      db.update(
          "UPDATE account_security SET role='USER' WHERE user_id='routineslim_admin' AND"
              + " role='ADMIN'");
      db.update(
          "INSERT INTO user_data(user_id,data_key,json_value)"
              + " VALUES(?,'admin_credentials_revision','true')",
          id);
    }
    Path target = file.toAbsolutePath();
    Files.createDirectories(target.getParent());
    Path temporary;
    if (Files.getFileStore(target.getParent()).supportsFileAttributeView("posix"))
      temporary =
          Files.createTempFile(
              target.getParent(),
              ".admin-",
              ".tmp",
              PosixFilePermissions.asFileAttribute(PosixFilePermissions.fromString("rw-------")));
    else temporary = Files.createTempFile(target.getParent(), ".admin-", ".tmp");
    try {
      Files.writeString(
          temporary,
          "RoutineSlim 최초 관리자 계정\n아이디: "
              + id
              + "\n비밀번호: "
              + password
              + "\n\n로그인 후 마이페이지에서 비밀번호를 변경하고 이 파일을 삭제하세요.\n");
      Files.move(temporary, target, StandardCopyOption.REPLACE_EXISTING);
    } finally {
      Files.deleteIfExists(temporary);
    }
    return true;
  }
}
