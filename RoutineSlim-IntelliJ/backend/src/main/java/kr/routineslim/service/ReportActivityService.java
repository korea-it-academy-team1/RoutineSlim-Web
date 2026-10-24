package kr.routineslim.service;

import java.time.*;
import java.util.*;
import kr.routineslim.dto.*;
import kr.routineslim.dto.SubscriptionNoteRequest;
import kr.routineslim.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ReportActivityService {
  private final JdbcTemplate db;
  private final FeatureRecordRepository records;
  private final SubscriptionRepository subscriptions;
  private final UserDataService legacy;

  public ReportActivityService(
      JdbcTemplate db,
      FeatureRecordRepository records,
      SubscriptionRepository subscriptions,
      UserDataService legacy) {
    this.db = db;
    this.records = records;
    this.subscriptions = subscriptions;
    this.legacy = legacy;
  }

  private long total(String user, YearMonth month) {
    return db.queryForObject(
        "SELECT COALESCE(SUM(amount),0) FROM payment_records WHERE user_id=? AND paid_on>=? AND"
            + " paid_on<=?",
        Long.class,
        user,
        month.atDay(1),
        month.atEndOfMonth());
  }

  public Map<String, Object> monthly(String user, String value) {
    YearMonth month = PlanningService.parseMonth(value), previous = month.minusMonths(1);
    long current = total(user, month), before = total(user, previous);
    long count =
        db.queryForObject(
            "SELECT COUNT(*) FROM payment_records WHERE user_id=? AND paid_on>=? AND paid_on<=?",
            Long.class,
            user,
            month.atDay(1),
            month.atEndOfMonth());
    boolean comparable =
        db.queryForObject(
                "SELECT COUNT(*) FROM payment_records WHERE user_id=? AND paid_on>=? AND"
                    + " paid_on<=?",
                Long.class,
                user,
                previous.atDay(1),
                previous.atEndOfMonth())
            > 0;
    var category =
        db.queryForList(
            "SELECT COALESCE(s.category,'기타') AS \"category\",SUM(p.amount) AS \"amount\" FROM"
                + " payment_records p LEFT JOIN subscriptions s ON s.id=p.subscription_id AND"
                + " s.user_id=p.user_id WHERE p.user_id=? AND p.paid_on>=? AND p.paid_on<=? GROUP"
                + " BY COALESCE(s.category,'기타') ORDER BY SUM(p.amount) DESC",
            user,
            month.atDay(1),
            month.atEndOfMonth());
    var history = new ArrayList<Map<String, Object>>();
    for (int i = 5; i >= 0; i--) {
      var m = month.minusMonths(i);
      history.add(Map.of("month", m.toString(), "amount", total(user, m)));
    }
    var out = new LinkedHashMap<String, Object>();
    out.put("month", value);
    out.put("total", current);
    out.put("previousTotal", before);
    out.put("hasPrevious", comparable);
    out.put("difference", comparable ? current - before : null);
    out.put("paymentCount", count);
    out.put("categories", category);
    out.put("history", history);
    return out;
  }

  public Map<String, Object> detail(String user, Long id) {
    legacy.get(user, "subscriptions");
    var s =
        subscriptions
            .findByIdAndUserId(id, user)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    var payments =
        db.queryForList(
            "SELECT id AS \"id\",description AS \"description\",amount AS \"amount\",paid_on AS"
                + " \"paidOn\" FROM payment_records WHERE user_id=? AND subscription_id=? ORDER BY"
                + " paid_on DESC,id DESC",
            user,
            id);
    var note =
        records.list(user, "subscription_note").stream()
            .filter(x -> x.path("subscriptionId").asLong() == id)
            .findFirst()
            .map(x -> x.path("note").asText())
            .orElse("");
    var changes =
        records.list(user, "subscription_change").stream()
            .filter(x -> x.path("subscriptionId").asLong() == id)
            .toList();
    return Map.of(
        "subscription",
        new SubscriptionResponse(
            s.id, s.name, s.category, s.amount, s.cycle, s.day, s.status, s.billingAnchorDate),
        "payments",
        payments,
        "totalPaid",
        payments.stream().mapToLong(x -> ((Number) x.get("amount")).longValue()).sum(),
        "note",
        note,
        "changes",
        changes);
  }

  @Transactional
  public void note(String user, Long id, SubscriptionNoteRequest request) {
    detail(user, id);
    var old =
        records.list(user, "subscription_note").stream()
            .filter(x -> x.path("subscriptionId").asLong() == id)
            .findFirst();
    var data = records.object();
    data.put("subscriptionId", id);
    data.put("note", request.note() == null ? "" : request.note());
    if (old.isPresent())
      records.save(user, "subscription_note", old.get().path("id").asText(), data);
    else records.create(user, "subscription_note", data);
  }

  public Map<String, Object> activity(String user) {
    var posts =
        db.queryForList(
            "SELECT id AS \"id\",title AS \"title\",category AS \"category\",created_at AS"
                + " \"createdAt\" FROM community_posts WHERE author_id=? ORDER BY created_at DESC",
            user);
    var comments =
        db.queryForList(
            "SELECT c.id AS \"id\",c.post_id AS \"postId\",c.content AS \"content\",c.created_at AS"
                + " \"createdAt\",p.title AS \"title\" FROM community_comments c JOIN"
                + " community_posts p ON p.id=c.post_id WHERE c.author_id=? ORDER BY c.created_at"
                + " DESC",
            user);
    var likes =
        db.queryForList(
            "SELECT p.id AS \"id\",p.title AS \"title\",p.category AS \"category\",p.created_at AS"
                + " \"createdAt\" FROM community_likes l JOIN community_posts p ON p.id=l.post_id"
                + " WHERE l.user_id=? ORDER BY p.created_at DESC",
            user);
    return Map.of("posts", posts, "comments", comments, "likes", likes);
  }
}
