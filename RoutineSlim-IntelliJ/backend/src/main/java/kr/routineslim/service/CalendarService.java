package kr.routineslim.service;

import java.time.*;
import java.util.*;
import kr.routineslim.dto.PaymentEvent;
import kr.routineslim.entity.Subscription;
import kr.routineslim.repository.SubscriptionRepository;
import org.springframework.stereotype.Service;

@Service
public class CalendarService {
  private final UserDataService legacy;
  private final SubscriptionRepository repository;

  public CalendarService(SubscriptionRepository repository, UserDataService legacy) {
    this.repository = repository;
    this.legacy = legacy;
  }

  public List<PaymentEvent> events(String user, int year, int month) {
    legacy.get(user, "subscriptions");
    YearMonth target;
    try {
      if (year < 1 || year > 9999) throw new IllegalArgumentException();
      target = YearMonth.of(year, month);
    } catch (Exception e) {
      throw new org.springframework.web.server.ResponseStatusException(
          org.springframework.http.HttpStatus.BAD_REQUEST, "Invalid year or month");
    }
    List<PaymentEvent> events = new ArrayList<>();
    for (Subscription subscription : repository.findByUserIdOrderByIdDesc(user)) {
      for (LocalDate date : dates(subscription, target)) {
        events.add(
            new PaymentEvent(
                subscription.id,
                subscription.name,
                date,
                subscription.amount,
                subscription.category));
      }
    }
    events.sort(Comparator.comparing(PaymentEvent::date));
    return events;
  }

  // Legacy subscriptions lack an anchor date. Monthly schedules can still be shown;
  // weekly and yearly schedules must not be fabricated without a known start date.
  public static List<LocalDate> dates(Subscription subscription, YearMonth target) {
    LocalDate anchor = subscription.billingAnchorDate;
    if (subscription.day < 1 || subscription.day > 31) return List.of();
    String cycle = subscription.cycle;
    if ("monthly".equals(cycle)) {
      LocalDate date = target.atDay(Math.min(subscription.day, target.lengthOfMonth()));
      return anchor != null && date.isBefore(anchor) ? List.of() : List.of(date);
    }
    if (anchor == null) return List.of();
    if ("yearly".equals(cycle)) {
      if (target.getMonthValue() != anchor.getMonthValue() || target.getYear() < anchor.getYear())
        return List.of();
      return List.of(target.atDay(Math.min(anchor.getDayOfMonth(), target.lengthOfMonth())));
    }
    if ("weekly".equals(cycle)) {
      LocalDate first = target.atDay(1);
      if (anchor.isAfter(first)) first = anchor;
      long days = java.time.temporal.ChronoUnit.DAYS.between(anchor, first);
      long remainder = Math.floorMod(days, 7);
      if (remainder != 0) first = first.plusDays(7 - remainder);
      List<LocalDate> dates = new ArrayList<>();
      for (LocalDate date = first; YearMonth.from(date).equals(target); date = date.plusDays(7))
        dates.add(date);
      return dates;
    }
    return List.of();
  }
}
