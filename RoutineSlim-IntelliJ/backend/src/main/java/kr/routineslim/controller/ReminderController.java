package kr.routineslim.controller;

import jakarta.servlet.http.HttpSession;
import java.time.*;
import java.util.*;
import kr.routineslim.entity.Subscription;
import kr.routineslim.repository.SubscriptionRepository;
import kr.routineslim.security.SessionUser;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/reminders")
public class ReminderController {
  private final kr.routineslim.service.UserDataService legacy;
  private final SubscriptionRepository subscriptions;

  public ReminderController(
      SubscriptionRepository subscriptions, kr.routineslim.service.UserDataService legacy) {
    this.subscriptions = subscriptions;
    this.legacy = legacy;
  }

  public record Reminder(
      Long subscriptionId, String name, String date, long amount, long daysUntil, String type) {}

  @GetMapping
  public List<Reminder> upcoming(HttpSession session) {
    String user = SessionUser.require(session);
    legacy.get(user, "subscriptions");
    LocalDate today = LocalDate.now();
    List<Reminder> out = new ArrayList<>();
    for (Subscription s : subscriptions.findByUserIdOrderByIdDesc(user)) {
      if (!"active".equals(s.status) || s.day < 1 || s.day > 31 || s.amount < 0) continue;
      LocalDate next = null;
      for (int offset = 0; offset <= 12 && next == null; offset++) {
        next =
            kr.routineslim.service.CalendarService.dates(
                    s, YearMonth.from(today).plusMonths(offset))
                .stream()
                .filter(d -> !d.isBefore(today))
                .findFirst()
                .orElse(null);
      }
      if (next == null) continue;
      long days = java.time.temporal.ChronoUnit.DAYS.between(today, next);
      if (days <= 7)
        out.add(
            new Reminder(
                s.id,
                s.name,
                next.toString(),
                s.amount,
                days,
                days == 0 ? "오늘 결제 예정" : days <= 1 ? "내일 결제 예정" : "결제 예정"));
    }
    out.sort(Comparator.comparingLong(Reminder::daysUntil));
    return out;
  }
}
