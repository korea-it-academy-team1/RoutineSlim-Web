package kr.routineslim.service;

import com.fasterxml.jackson.databind.node.ObjectNode;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import kr.routineslim.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationService {
  private final FeatureRecordRepository records;
  private final UserDataRepository users;
  private final SubscriptionRepository subscriptions;
  private final UserDataService legacy;
  private final PaymentService payments;

  public NotificationService(
      FeatureRecordRepository records,
      UserDataRepository users,
      SubscriptionRepository subscriptions,
      UserDataService legacy,
      PaymentService payments) {
    this.records = records;
    this.users = users;
    this.subscriptions = subscriptions;
    this.legacy = legacy;
    this.payments = payments;
  }

  @Transactional
  public void publish(
      String user, String source, String title, String content, String page, String reference) {
    if (!users.exists(user)) return;
    users.lockUser(user);
    var existing =
        records.list(user, "notification").stream()
            .filter(x -> source.equals(x.path("source").asText()))
            .findFirst();
    if (existing.isPresent()) {
      var n = existing.get();
      if (!title.equals(n.path("title").asText()) || !content.equals(n.path("content").asText())) {
        n.put("title", title);
        n.put("content", content);
        records.save(user, "notification", n.path("id").asText(), n);
      }
      return;
    }
    var n = records.object();
    n.put("source", source);
    n.put("title", title);
    n.put("content", content);
    n.put("page", page);
    n.put("reference", reference == null ? "" : reference);
    n.put("read", false);
    records.create(user, "notification", n);
  }

  @Transactional
  public List<ObjectNode> list(String user) {
    users.lockUser(user);
    legacy.get(user, "subscriptions");
    LocalDate today = LocalDate.now();
    int days = 7;
    try {
      String setting = users.get(user, "setting-reminder-days").replace("\"", "");
      if (!"null".equals(setting)) days = Integer.parseInt(setting);
    } catch (Exception ignored) {
    }
    for (var s : subscriptions.findByUserIdOrderByIdDesc(user)) {
      if (!"active".equals(s.status)) continue;
      LocalDate next = null;
      for (int i = 0; i <= 12 && next == null; i++)
        next =
            CalendarService.dates(s, YearMonth.from(today).plusMonths(i)).stream()
                .filter(d -> !d.isBefore(today))
                .findFirst()
                .orElse(null);
      if (next != null && ChronoUnit.DAYS.between(today, next) <= days)
        publish(
            user,
            "payment:" + s.id + ":" + next,
            s.name + " 결제 예정",
            next + " · " + s.amount + "원",
            "subscription-detail",
            String.valueOf(s.id));
    }
    for (var t : records.list(user, "trial")) {
      if (!"ACTIVE".equals(t.path("status").asText())) continue;
      LocalDate end = LocalDate.parse(t.path("endDate").asText());
      long remaining = ChronoUnit.DAYS.between(today, end);
      if (remaining >= 0 && remaining <= t.path("notifyDays").asInt(3))
        publish(
            user,
            "trial:" + t.path("id").asText() + ":" + end,
            t.path("name").asText() + " 무료체험 종료 예정",
            end + " 종료 · 유료 전환 전 확인해주세요.",
            "trials",
            "");
    }
    for (var notice : records.list(FeatureRecordRepository.PUBLIC, "notice"))
      if (notice.path("published").asBoolean())
        publish(
            user,
            "notice:" + notice.path("id").asText(),
            "새 공지: " + notice.path("title").asText(),
            notice.path("category").asText(),
            "support",
            "");
    try {
      String raw = users.get(user, "setting-budget").replace("\"", "");
      if (!raw.isBlank() && !raw.equals("null")) {
        long budget = Long.parseLong(raw), spent = payments.total(user, YearMonth.now());
        double forecast =
            subscriptions.findByUserIdOrderByIdDesc(user).stream()
                .filter(x -> "active".equals(x.status))
                .mapToDouble(ExpenseService::monthly)
                .sum();
        if (spent > budget || forecast > budget)
          publish(
              user,
              "budget:" + YearMonth.now() + ":" + (spent > budget ? "actual" : "forecast"),
              spent > budget ? "이번 달 실제 지출이 예산을 초과했어요." : "예상 구독료가 예산을 초과해요.",
              "실제 " + spent + "원 · 예상 " + Math.round(forecast) + "원 / 예산 " + budget + "원",
              "budget",
              "");
      }
    } catch (NumberFormatException ignored) {
    }

    return records.list(user, "notification").stream()
        .filter(n -> !n.path("hidden").asBoolean())
        .toList();
  }

  @Transactional
  public void read(String user, String id) {
    var n = records.get(user, "notification", id);
    n.put("read", true);
    records.save(user, "notification", id, n);
  }

  @Transactional
  public void readAll(String user) {
    for (var n : records.list(user, "notification")) {
      n.put("read", true);
      records.save(user, "notification", n.path("id").asText(), n);
    }
  }

  @Transactional
  public void delete(String user, String id) {
    var n = records.get(user, "notification", id);
    n.put("hidden", true);
    records.save(user, "notification", id, n);
  }
}
