package kr.routineslim.calendar;

import static org.junit.jupiter.api.Assertions.*;

import java.time.*;
import kr.routineslim.entity.Subscription;
import kr.routineslim.service.CalendarService;
import org.junit.jupiter.api.Test;

class CalendarServiceTest {
  @Test
  void yearlyOnlyOccursOnAnniversaryMonth() {
    Subscription s = new Subscription("u", "A", "video", 10000, "yearly", 31, "active");
    s.billingAnchorDate = LocalDate.of(2025, 1, 31);
    assertEquals(1, CalendarService.dates(s, YearMonth.of(2026, 1)).size());
    assertTrue(CalendarService.dates(s, YearMonth.of(2026, 2)).isEmpty());
  }

  @Test
  void weeklyUsesSevenDayIntervals() {
    Subscription s = new Subscription("u", "A", "video", 1000, "weekly", 1, "active");
    s.billingAnchorDate = LocalDate.of(2026, 10, 1);
    assertEquals(
        java.util.List.of(
            LocalDate.of(2026, 10, 1),
            LocalDate.of(2026, 10, 8),
            LocalDate.of(2026, 10, 15),
            LocalDate.of(2026, 10, 22),
            LocalDate.of(2026, 10, 29)),
        CalendarService.dates(s, YearMonth.of(2026, 10)));
  }

  @Test
  void legacyYearlyWithoutAnchorIsNotInvented() {
    Subscription s = new Subscription("u", "A", "video", 1000, "yearly", 1, "active");
    assertTrue(CalendarService.dates(s, YearMonth.of(2026, 10)).isEmpty());
  }
}
