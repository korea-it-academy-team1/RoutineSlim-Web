package kr.routineslim.service;

import kr.routineslim.repository.UserDataRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AccountRestrictionService {
  private final JdbcTemplate db;
  private final UserDataRepository users;

  public AccountRestrictionService(JdbcTemplate db, UserDataRepository users) {
    this.db = db;
    this.users = users;
  }

  public boolean suspended(String id) {
    return db.queryForObject(
            "SELECT COUNT(*) FROM account_restrictions WHERE user_id=? AND suspended=TRUE",
            Integer.class,
            id)
        > 0;
  }

  public int revision(String id) {
    var rows =
        db.queryForList("SELECT session_revision FROM account_restrictions WHERE user_id=?", id);
    return rows.isEmpty() ? 0 : ((Number) rows.get(0).get("session_revision")).intValue();
  }

  @Transactional
  public void invalidate(String id) {
    users.lockUser(id);
    if (db.update(
            "UPDATE account_restrictions SET session_revision=session_revision+1 WHERE user_id=?",
            id)
        == 0)
      db.update(
          "INSERT INTO account_restrictions(user_id,suspended,session_revision) VALUES(?,FALSE,1)",
          id);
  }

  @Transactional
  public void suspend(String id, boolean suspended) {
    users.lockUser(id);
    if (db.update(
            "UPDATE account_restrictions SET suspended=?,session_revision=session_revision+1 WHERE"
                + " user_id=?",
            suspended,
            id)
        == 0)
      db.update(
          "INSERT INTO account_restrictions(user_id,suspended,session_revision) VALUES(?,?,1)",
          id,
          suspended);
  }
}
