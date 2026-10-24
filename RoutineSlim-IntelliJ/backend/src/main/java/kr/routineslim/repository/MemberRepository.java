package kr.routineslim.repository;

import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class MemberRepository {
  private final kr.routineslim.repository.FeatureRecordRepository features;
  private final JdbcTemplate db;
  private final kr.routineslim.repository.SubscriptionRepository subscriptions;
  private final kr.routineslim.repository.PaymentRecordRepository payments;
  private final kr.routineslim.repository.CommunityPostRepository posts;
  private final kr.routineslim.repository.CommunityCommentRepository comments;
  private final kr.routineslim.repository.CommunityLikeRepository likes;
  private final kr.routineslim.repository.CommunityReportRepository reports;

  public MemberRepository(
      JdbcTemplate db,
      kr.routineslim.repository.SubscriptionRepository subscriptions,
      kr.routineslim.repository.PaymentRecordRepository payments,
      kr.routineslim.repository.CommunityPostRepository posts,
      kr.routineslim.repository.CommunityCommentRepository comments,
      kr.routineslim.repository.CommunityLikeRepository likes,
      kr.routineslim.repository.CommunityReportRepository reports,
      kr.routineslim.repository.FeatureRecordRepository features) {
    this.features = features;
    this.db = db;
    this.subscriptions = subscriptions;
    this.payments = payments;
    this.posts = posts;
    this.comments = comments;
    this.likes = likes;
    this.reports = reports;
  }

  public Optional<String> verifiedLoginId(String email) {
    var ids =
        db.query(
            "SELECT u.id FROM app_users u JOIN account_security s ON s.user_id=u.id WHERE"
                + " s.verified_email=? AND u.id NOT LIKE 'oauth_%'",
            (rs, n) -> rs.getString(1), email.trim().toLowerCase(java.util.Locale.ROOT));
    return ids.size() == 1 ? Optional.of(ids.get(0)) : Optional.empty();
  }

  public Optional<String> passwordHash(String id) {
    var rows = db.queryForList("SELECT password_hash FROM app_users WHERE id=?", id);
    return rows.isEmpty()
        ? Optional.empty()
        : Optional.of(String.valueOf(rows.get(0).get("password_hash")));
  }

  public void create(String id, String hash) {
    db.update(
        "INSERT INTO app_users(id,password_hash,display_name,email,profile_json) VALUES(?,?,?,?,?)",
        id,
        hash,
        id,
        id.contains("@") ? id : "",
        "{}");
  }

  public kr.routineslim.dto.MemberProfileResponse profile(String id) {
    var rows = db.queryForList("SELECT id,display_name,email FROM app_users WHERE id=?", id);
    if (rows.isEmpty())
      throw new org.springframework.web.server.ResponseStatusException(
          org.springframework.http.HttpStatus.NOT_FOUND, "Member not found");
    var row = rows.get(0);
    return new kr.routineslim.dto.MemberProfileResponse(
        String.valueOf(row.get("id")),
        String.valueOf(row.get("display_name")),
        row.get("email") == null ? "" : String.valueOf(row.get("email")));
  }

  public void updateProfile(String id, String displayName, String email) {
    int changed =
        db.update("UPDATE app_users SET display_name=?,email=? WHERE id=?", displayName, email, id);
    if (changed != 1)
      throw new org.springframework.web.server.ResponseStatusException(
          org.springframework.http.HttpStatus.NOT_FOUND, "Member not found");
  }

  public void changePassword(String id, String hash) {
    db.update("UPDATE app_users SET password_hash=? WHERE id=?", hash, id);
  }

  public void delete(String id) {
    // Remove dependents before the member record, within AuthenticationService's transaction.
    for (var post : posts.findByAuthorId(id)) {
      comments.deleteByPostId(post.id);
      likes.deleteByPostId(post.id);
      reports.deleteByPostId(post.id);
    }
    comments.deleteByAuthorId(id);
    likes.deleteByUserId(id);
    reports.deleteByReporterId(id);
    posts.deleteAll(posts.findByAuthorId(id));
    payments.deleteByUserId(id);
    subscriptions.deleteByUserId(id);
    db.update(
        "DELETE FROM signup_email_codes WHERE email IN (SELECT verified_email FROM account_security"
            + " WHERE user_id=?) OR email IN (SELECT LOWER(email) FROM app_users WHERE id=?)",
        id,
        id);
    for (var proof : features.listAllOwners("recovery")) {
      boolean match = false;
      for (var candidate : proof.path("ids")) if (id.equals(candidate.asText())) match = true;
      if (match)
        features.delete(proof.path("ownerId").asText(), "recovery", proof.path("id").asText());
    }
    db.update("DELETE FROM feature_records WHERE owner_id=?", id);
    db.update("DELETE FROM user_data WHERE user_id=?", id);
    db.update("DELETE FROM app_users WHERE id=?", id);
  }
}
