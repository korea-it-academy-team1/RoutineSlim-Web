package kr.routineslim.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class UserDataRepository {
  private final JdbcTemplate db;

  public UserDataRepository(JdbcTemplate db) {
    this.db = db;
  }

  public boolean exists(String user) {
    return db.queryForObject("SELECT COUNT(*) FROM app_users WHERE id=?", Integer.class, user) > 0;
  }

  public void lockUser(String user) {
    if (db.queryForList("SELECT id FROM app_users WHERE id=? FOR UPDATE", user).isEmpty())
      throw new org.springframework.web.server.ResponseStatusException(
          org.springframework.http.HttpStatus.UNAUTHORIZED, "Account no longer exists");
  }

  public String get(String user, String key) {
    var rows =
        db.queryForList(
            "SELECT json_value FROM user_data WHERE user_id=? AND data_key=?", user, key);
    return rows.isEmpty() ? "null" : String.valueOf(rows.get(0).get("json_value"));
  }

  public void save(String user, String key, String json) {
    if (db.update(
            "UPDATE user_data SET json_value=? WHERE user_id=? AND data_key=?", json, user, key)
        == 0)
      db.update(
          "INSERT INTO user_data(user_id,data_key,json_value) VALUES(?,?,?)", user, key, json);
  }
}
