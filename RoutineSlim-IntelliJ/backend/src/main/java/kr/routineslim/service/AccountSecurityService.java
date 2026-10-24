package kr.routineslim.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class AccountSecurityService {
  private final JdbcTemplate db;
  private final String adminId;

  public AccountSecurityService(
      JdbcTemplate db, @Value("${routineslim.admin-id:${ROUTINESLIM_ADMIN_ID:}}") String adminId) {
    this.db = db;
    this.adminId = adminId;
  }

  public String adminId() {
    return adminId.isBlank() ? "routinslim" : adminId;
  }

  public boolean isAdmin(String id) {
    return db.queryForObject(
                "SELECT COUNT(*) FROM account_security WHERE user_id=? AND role='ADMIN'",
                Integer.class,
                id)
            > 0
        || !adminId.isBlank()
            && adminId.equals(id)
            && db.queryForObject("SELECT COUNT(*) FROM app_users WHERE id=?", Integer.class, id)
                > 0;
  }

  public boolean emailVerified(String id, String email) {
    return db.queryForObject(
            "SELECT COUNT(*) FROM account_security WHERE user_id=? AND verified_email=?",
            Integer.class,
            id,
            email == null ? "" : email.toLowerCase(java.util.Locale.ROOT))
        > 0;
  }

  public boolean hasVerifiedEmail(String id) {
    return db.queryForObject(
            "SELECT COUNT(*) FROM account_security WHERE user_id=? AND verified_email IS NOT NULL",
            Integer.class,
            id)
        > 0;
  }

  public boolean emailInUse(String email) {
    return db.queryForObject(
                "SELECT COUNT(*) FROM app_users WHERE LOWER(email)=?", Integer.class, email)
            > 0
        || db.queryForObject(
                "SELECT COUNT(*) FROM account_security WHERE verified_email=?",
                Integer.class,
                email)
            > 0;
  }
}
