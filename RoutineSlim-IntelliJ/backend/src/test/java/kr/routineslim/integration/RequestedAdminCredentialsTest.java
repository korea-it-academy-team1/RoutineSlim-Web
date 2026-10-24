package kr.routineslim.integration;

import static org.junit.jupiter.api.Assertions.*;

import java.nio.file.Path;
import kr.routineslim.service.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest
class RequestedAdminCredentialsTest {
  @Autowired AdminProvisioningService provisioning;
  @Autowired AccountSecurityService security;
  @Autowired AuthenticationService auth;
  @Autowired JdbcTemplate db;
  @TempDir Path directory;

  private void clean(String id) {
    if (db.queryForObject("SELECT COUNT(*) FROM app_users WHERE id=?", Integer.class, id) > 0)
      auth.delete(id);
  }

  @Test
  void requestedCredentialsReplaceOldAdminRoleAndPreserveLaterPasswordChanges() throws Exception {
    try {
      provisioning.provision("routineslim_admin", "OldPassword123!", directory.resolve("old.txt"));
      assertTrue(provisioning.provision("routinslim", "admin123", directory.resolve("new.txt")));
      auth.login("routinslim", "admin123");
      assertTrue(security.isAdmin("routinslim"));
      assertFalse(security.isAdmin("routineslim_admin"));
      assertEquals(
          1,
          db.queryForObject(
              "SELECT COUNT(*) FROM app_users WHERE id='routineslim_admin'", Integer.class));
      assertNotEquals(
          "admin123",
          db.queryForObject(
              "SELECT password_hash FROM app_users WHERE id='routinslim'", String.class));
      auth.changePassword("routinslim", "admin123", "ChangedPassword123!");
      assertFalse(provisioning.provision("routinslim", "admin123", directory.resolve("new.txt")));
      auth.login("routinslim", "ChangedPassword123!");
    } finally {
      clean("routinslim");
      clean("routineslim_admin");
    }
  }

  @Test
  void requestedPasswordIsAppliedOnceToAnAlreadyExistingAdmin() throws Exception {
    try {
      provisioning.provision("routinslim", "PreviousPassword123!", directory.resolve("first.txt"));
      assertTrue(provisioning.provision("routinslim", "admin123", directory.resolve("new.txt")));
      auth.login("routinslim", "admin123");
      assertFalse(provisioning.provision("routinslim", "admin123", directory.resolve("new.txt")));
    } finally {
      clean("routinslim");
    }
  }
}
