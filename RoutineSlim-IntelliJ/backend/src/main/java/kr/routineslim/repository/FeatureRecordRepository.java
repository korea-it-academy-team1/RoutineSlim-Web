package kr.routineslim.repository;

import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.sql.*;
import java.time.Instant;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.web.server.ResponseStatusException;

@Repository
public class FeatureRecordRepository {
  public static final String PUBLIC = "PUBLIC::CONTENT";
  private final JdbcTemplate db;
  private final ObjectMapper json;

  public FeatureRecordRepository(JdbcTemplate db, ObjectMapper json) {
    this.db = db;
    this.json = json;
  }

  private ObjectNode read(ResultSet rs) throws SQLException {
    try {
      ObjectNode out = (ObjectNode) json.readTree(rs.getString("json_value"));
      out.put("id", rs.getString("record_id"));
      out.put("createdAt", rs.getTimestamp("created_at").toInstant().toString());
      out.put("updatedAt", rs.getTimestamp("updated_at").toInstant().toString());
      return out;
    } catch (Exception e) {
      throw new SQLException("Invalid feature record", e);
    }
  }

  public List<ObjectNode> list(String owner, String kind) {
    return db.query(
        "SELECT * FROM feature_records WHERE owner_id=? AND record_type=? ORDER BY created_at"
            + " DESC,record_id",
        (rs, n) -> read(rs),
        owner,
        kind);
  }

  public List<ObjectNode> listAllOwners(String kind) {
    return db.query(
        "SELECT * FROM feature_records WHERE record_type=? ORDER BY created_at DESC",
        (rs, n) -> {
          var out = read(rs);
          out.put("ownerId", rs.getString("owner_id"));
          return out;
        },
        kind);
  }

  public ObjectNode get(String owner, String kind, String id) {
    return get(owner, kind, id, false);
  }

  public ObjectNode lock(String owner, String kind, String id) {
    return get(owner, kind, id, true);
  }

  private ObjectNode get(String owner, String kind, String id, boolean lock) {
    var rows =
        db.query(
            "SELECT * FROM feature_records WHERE owner_id=? AND record_type=? AND record_id=?"
                + (lock ? " FOR UPDATE" : ""),
            (rs, n) -> read(rs),
            owner,
            kind,
            id);
    if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "항목을 찾을 수 없습니다.");
    return rows.get(0);
  }

  private String payload(Object value) {
    ObjectNode out = json.valueToTree(value);
    out.remove(List.of("id", "createdAt", "updatedAt", "ownerId"));
    return out.toString();
  }

  public ObjectNode create(String owner, String kind, Object value) {
    String id = UUID.randomUUID().toString();
    var now = Timestamp.from(Instant.now());
    db.update(
        "INSERT INTO"
            + " feature_records(record_id,owner_id,user_id,record_type,json_value,created_at,updated_at)"
            + " VALUES(?,?,?,?,?,?,?)",
        id,
        owner,
        PUBLIC.equals(owner) || owner.startsWith("RECOVERY:") ? null : owner,
        kind,
        payload(value),
        now,
        now);
    return get(owner, kind, id);
  }

  public ObjectNode save(String owner, String kind, String id, Object value) {
    if (db.update(
            "UPDATE feature_records SET json_value=?,updated_at=? WHERE owner_id=? AND"
                + " record_type=? AND record_id=?",
            payload(value),
            Timestamp.from(Instant.now()),
            owner,
            kind,
            id)
        != 1) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
    return get(owner, kind, id);
  }

  public void delete(String owner, String kind, String id) {
    if (db.update(
            "DELETE FROM feature_records WHERE owner_id=? AND record_type=? AND record_id=?",
            owner,
            kind,
            id)
        != 1) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
  }

  public ObjectNode object() {
    return json.createObjectNode();
  }
}
