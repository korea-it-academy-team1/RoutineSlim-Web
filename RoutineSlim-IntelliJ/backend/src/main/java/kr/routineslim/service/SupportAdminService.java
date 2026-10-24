package kr.routineslim.service;

import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.*;
import kr.routineslim.dto.ComparisonPlanRequest;
import kr.routineslim.dto.InquiryAnswerRequest;
import kr.routineslim.dto.SupportArticleRequest;
import kr.routineslim.dto.SupportInquiryRequest;
import kr.routineslim.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class SupportAdminService {
  private final FeatureRecordRepository records;
  private final JdbcTemplate db;
  private final AccountSecurityService security;
  private final AccountRestrictionService restrictions;
  private final NotificationService notifications;

  public SupportAdminService(
      FeatureRecordRepository records,
      JdbcTemplate db,
      AccountSecurityService security,
      AccountRestrictionService restrictions,
      NotificationService notifications) {
    this.records = records;
    this.db = db;
    this.security = security;
    this.restrictions = restrictions;
    this.notifications = notifications;
  }

  public void requireAdmin(String user) {
    if (!security.isAdmin(user))
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "관리자만 사용할 수 있습니다.");
  }

  public List<ObjectNode> publicArticles(String kind) {
    return records.list(FeatureRecordRepository.PUBLIC, kind).stream()
        .filter(x -> x.path("published").asBoolean())
        .toList();
  }

  public List<ObjectNode> plans() {
    return records.list(FeatureRecordRepository.PUBLIC, "plan").stream()
        .filter(x -> x.path("active").asBoolean())
        .toList();
  }

  public List<ObjectNode> selections(String user) {
    var selection = records.list(user, "comparison").stream().findFirst();
    if (selection.isEmpty()) return List.of();
    var available = plans();
    var ids = new HashSet<String>();
    selection.get().path("ids").forEach(x -> ids.add(x.asText()));
    return available.stream().filter(x -> ids.contains(x.path("id").asText())).toList();
  }

  @Transactional
  public void select(String user, List<String> ids) {
    db.queryForList("SELECT id FROM app_users WHERE id=? FOR UPDATE", user);
    if (ids == null || ids.size() > 3 || new HashSet<>(ids).size() != ids.size())
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "서로 다른 요금제를 최대 3개 선택해주세요.");
    for (String id : ids)
      if (!records.get(FeatureRecordRepository.PUBLIC, "plan", id).path("active").asBoolean())
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "비교할 수 없는 요금제입니다.");
    var old = records.list(user, "comparison").stream().findFirst();
    if (old.isPresent())
      records.save(user, "comparison", old.get().path("id").asText(), Map.of("ids", ids));
    else records.create(user, "comparison", Map.of("ids", ids));
  }

  public List<ObjectNode> inquiries(String user) {
    return records.list(user, "inquiry");
  }

  @Transactional
  public ObjectNode inquire(String user, SupportInquiryRequest request) {
    var n = records.object();
    n.put("category", request.category());
    n.put("title", request.title().trim());
    n.put("content", request.content().trim());
    n.put("status", "OPEN");
    n.put("answer", "");
    return records.create(user, "inquiry", n);
  }

  @Transactional
  public void deleteInquiry(String user, String id) {
    records.delete(user, "inquiry", id);
  }

  public List<ObjectNode> adminRecords(String user, String kind) {
    requireAdmin(user);
    checkKind(kind);
    return records.list(FeatureRecordRepository.PUBLIC, kind);
  }

  @Transactional
  public ObjectNode article(String user, String kind, String id, SupportArticleRequest request) {
    requireAdmin(user);
    if (!Set.of("notice", "faq").contains(kind))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
    return id == null
        ? records.create(FeatureRecordRepository.PUBLIC, kind, request)
        : records.save(FeatureRecordRepository.PUBLIC, kind, id, request);
  }

  @Transactional
  public ObjectNode plan(String user, String id, ComparisonPlanRequest request) {
    requireAdmin(user);
    if (request.sourceUrl() != null && !request.sourceUrl().isBlank())
      try {
        var uri = java.net.URI.create(request.sourceUrl());
        if (!Set.of("http", "https").contains(uri.getScheme())
            || uri.getHost() == null
            || uri.getUserInfo() != null) throw new IllegalArgumentException();
      } catch (Exception e) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "출처는 http 또는 https 주소로 입력해주세요.");
      }
    return id == null
        ? records.create(FeatureRecordRepository.PUBLIC, "plan", request)
        : records.save(FeatureRecordRepository.PUBLIC, "plan", id, request);
  }

  @Transactional
  public void deletePublic(String user, String kind, String id) {
    requireAdmin(user);
    checkKind(kind);
    records.delete(FeatureRecordRepository.PUBLIC, kind, id);
  }

  private void checkKind(String kind) {
    if (!Set.of("notice", "faq", "plan").contains(kind))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
  }

  public List<ObjectNode> adminInquiries(String user) {
    requireAdmin(user);
    return records.listAllOwners("inquiry");
  }

  @Transactional
  public ObjectNode answer(String user, String id, InquiryAnswerRequest request) {
    requireAdmin(user);
    var n =
        records.listAllOwners("inquiry").stream()
            .filter(x -> id.equals(x.path("id").asText()))
            .findFirst()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    String owner = n.path("ownerId").asText();
    n.put("answer", request.answer().trim());
    n.put("status", "ANSWERED");
    n.put("answeredAt", java.time.Instant.now().toString());
    var saved = records.save(owner, "inquiry", id, n);
    notifications.publish(
        owner,
        "inquiry:" + id + ":" + saved.path("updatedAt").asText(),
        "문의에 답변이 등록되었습니다.",
        n.path("title").asText(),
        "support",
        id);
    return saved;
  }

  public Map<String, Object> overview(String user) {
    requireAdmin(user);
    return Map.of(
        "members",
        db.queryForObject("SELECT COUNT(*) FROM app_users", Long.class),
        "suspended",
        db.queryForObject(
            "SELECT COUNT(*) FROM account_restrictions WHERE suspended=TRUE", Long.class),
        "posts",
        db.queryForObject("SELECT COUNT(*) FROM community_posts", Long.class),
        "reports",
        db.queryForObject(
            "SELECT COUNT(*) FROM community_reports WHERE status='PENDING'", Long.class),
        "openInquiries",
        records.listAllOwners("inquiry").stream()
            .filter(x -> "OPEN".equals(x.path("status").asText()))
            .count());
  }

  public Map<String, Object> members(String user, String query, int page, int size) {
    requireAdmin(user);
    page = Math.max(0, page);
    size = Math.max(1, Math.min(50, size));
    String term = "%" + (query == null ? "" : query.trim()) + "%";
    var list =
        db.queryForList(
            "SELECT u.id AS \"id\",u.display_name AS \"displayName\",u.email AS"
                + " \"email\",COALESCE(a.role,'USER') AS \"role\",COALESCE(r.suspended,FALSE) AS"
                + " \"suspended\" FROM app_users u LEFT JOIN account_security a ON a.user_id=u.id"
                + " LEFT JOIN account_restrictions r ON r.user_id=u.id WHERE u.id LIKE ? OR"
                + " u.display_name LIKE ? OR u.email LIKE ? ORDER BY u.id LIMIT ? OFFSET ?",
            term,
            term,
            term,
            size,
            (long) page * size);
    long total =
        db.queryForObject(
            "SELECT COUNT(*) FROM app_users WHERE id LIKE ? OR display_name LIKE ? OR email LIKE ?",
            Long.class,
            term,
            term,
            term);
    return Map.of("content", list, "page", page, "total", total, "size", size);
  }

  @Transactional
  public void suspend(String user, String id, boolean value) {
    requireAdmin(user);
    if (user.equals(id) || security.isAdmin(id))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "관리자 계정은 이용 정지할 수 없습니다.");
    restrictions.suspend(id, value);
  }
}
