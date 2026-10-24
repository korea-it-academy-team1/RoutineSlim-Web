package kr.routineslim.integration;

import static org.junit.jupiter.api.Assertions.*;

import java.nio.file.*;
import kr.routineslim.service.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest
class AdminProvisioningTest {
  @Autowired AdminProvisioningService provisioning;
  @Autowired AccountSecurityService security;
  @Autowired AuthenticationService auth;
  @Autowired JdbcTemplate db;
  @TempDir Path temporary;

  @Test
  void createsOneAdminWithRandomPasswordAndDoesNotResetIt() throws Exception {
    String id = "created_admin";
    Path file = temporary.resolve("initial.txt");
    try {
      assertTrue(provisioning.provision(id, "", file));
      String original = Files.readString(file);
      String password =
          original
              .lines()
              .filter(line -> line.startsWith("비밀번호: "))
              .findFirst()
              .orElseThrow()
              .substring("비밀번호: ".length());
      assertTrue(password.length() >= 24);
      auth.login(id, password);
      assertTrue(security.isAdmin(id));
      assertFalse(provisioning.provision(id, "DifferentPassword123!", file));
      assertEquals(original, Files.readString(file));
      assertEquals(
          1,
          db.queryForObject(
              "SELECT COUNT(*) FROM account_security WHERE user_id=? AND role='ADMIN'",
              Integer.class,
              id));
      if (Files.getFileStore(file).supportsFileAttributeView("posix"))
        assertEquals(
            java.nio.file.attribute.PosixFilePermissions.fromString("rw-------"),
            Files.getPosixFilePermissions(file));
    } finally {
      if (db.queryForObject("SELECT COUNT(*) FROM app_users WHERE id=?", Integer.class, id) > 0)
        auth.delete(id);
    }
  }

  @Test
  void doesNotPromoteAnExistingNormalAccount() throws Exception {
    String id = "routineslim_admin";
    auth.register(id, "Password123!");
    try {
      assertThrows(
          IllegalStateException.class,
          () -> provisioning.provision(id, "", temporary.resolve("collision.txt")));
      assertFalse(security.isAdmin(id));
    } finally {
      auth.delete(id);
    }
  }
}
