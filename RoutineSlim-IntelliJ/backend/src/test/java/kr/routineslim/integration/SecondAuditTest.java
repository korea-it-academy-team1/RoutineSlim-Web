package kr.routineslim.integration;

import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.*;
import kr.routineslim.dto.*;
import kr.routineslim.repository.*;
import kr.routineslim.service.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@SpringBootTest
@Transactional
class SecondAuditTest {
  @Autowired MemberRepository members;
  @Autowired MemberService profiles;
  @Autowired UserDataRepository raw;
  @Autowired UserDataService data;
  @Autowired SubscriptionService subscriptions;
  @Autowired ExpenseService expenses;
  @Autowired PaymentService payments;
  @Autowired CalendarService calendar;
  @Autowired AuthenticationService auth;
  @Autowired ObjectMapper json;

  @Test
  void oldAndNewProfileApisShareAllFields() throws Exception {
    String id = "audit_profile";
    members.create(id, "hash");
    data.save(
        id,
        "profile",
        "{\"name\":\"Original\",\"email\":\"a@example.com\",\"phone\":\"010-1234-5678\",\"birth\":\"2000-01-01\",\"address\":\"Seoul\"}");
    assertEquals("Original", profiles.get(id).displayName());
    assertEquals("Seoul", profiles.get(id).address());
    profiles.update(id, new MemberProfileRequest("Updated", "b@example.com"));
    var old = json.readTree(data.get(id, "profile"));
    assertEquals("Updated", old.get("name").asText());
    assertEquals("010-1234-5678", old.get("phone").asText());
  }

  @Test
  void profilePhotosCanBeSavedAndRemoved() {
    String id = "audit_photo";
    members.create(id, "hash");
    String photo = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
    profiles.update(id, new MemberProfileRequest("Name", "", null, null, null, null, photo));
    assertEquals(photo, profiles.get(id).photo());
    profiles.update(id, new MemberProfileRequest("Name", "", null, null, null, null, ""));
    assertEquals("", profiles.get(id).photo());
    assertThrows(
        ResponseStatusException.class,
        () ->
            profiles.update(
                id,
                new MemberProfileRequest(
                    "Name", "", null, null, null, null, "data:image/png;base64,PHNjcmlwdD4=")));
  }

  @Test
  void oldSubscriptionsMigrateBeforeDashboardAndNewCreation() {
    String id = "audit_migration";
    members.create(id, "hash");
    raw.save(
        id,
        "subscriptions",
        "[{\"name\":\"Old\",\"category\":\"music\",\"amount\":1000,\"cycle\":\"monthly\",\"day\":1,\"status\":\"active\"}]");
    assertEquals(1000, expenses.summary(id).monthlyTotal());
    subscriptions.create(
        id,
        new SubscriptionRequest("New", "music", 2000L, "monthly", 1, "active", LocalDate.now()));
    assertEquals(2, subscriptions.list(id).size());
    assertEquals(3000, expenses.summary(id).monthlyTotal());
  }

  @Test
  void paymentEditingKeepsOwnerAndDate() {
    String id = "audit_payment";
    members.create(id, "hash");
    var p =
        payments.create(id, new PaymentRequest(null, "Before", 1000L, LocalDate.of(2026, 10, 1)));
    assertThrows(
        ResponseStatusException.class,
        () ->
            payments.update(
                "stranger", p.id(), new PaymentRequest(null, "Attack", 1L, LocalDate.now())));
    var changed =
        payments.update(
            id, p.id(), new PaymentRequest(null, "After", 2000L, LocalDate.of(2026, 9, 1)));
    assertEquals("After", changed.description());
    assertTrue(payments.list(id, YearMonth.of(2026, 10)).isEmpty());
    assertEquals(2000, payments.total(id, YearMonth.of(2026, 9)));
  }

  @Test
  void invalidCalendarMonthReturns400() {
    String id = "audit_calendar";
    members.create(id, "hash");
    var error = assertThrows(ResponseStatusException.class, () -> calendar.events(id, 2026, 13));
    assertEquals(400, error.getStatusCode().value());
  }

  @Test
  void missingAnnualAnchorGetsExplicitCreationDate() {
    String id = "audit_anchor";
    members.create(id, "hash");
    var s =
        subscriptions.create(
            id, new SubscriptionRequest("Annual", "music", 1000L, "yearly", 1, "active", null));
    assertEquals(LocalDate.now(), s.billingAnchorDate());
  }

  @Test
  void invalidSettingsAndEmptyJsonAreRejected() {
    String id = "audit_settings";
    members.create(id, "hash");
    assertThrows(
        ResponseStatusException.class, () -> data.save(id, "setting-reminder-days", "4294967296"));
    assertThrows(ResponseStatusException.class, () -> data.save(id, "setting-budget", "-100"));
    assertThrows(ResponseStatusException.class, () -> data.save(id, "subscriptions", ""));
    assertThrows(
        ResponseStatusException.class, () -> data.save(id, "subscriptions_migrated_v1", "null"));
  }

  @Test
  @Transactional(propagation = Propagation.NOT_SUPPORTED)
  void duplicateBackupIdsRollBackAllChanges() {
    String id = "audit_backup";
    members.create(id, "hash");
    try {
      var original =
          subscriptions.create(
              id, new SubscriptionRequest("Before", "music", 1000L, "monthly", 1, "active", null));
      String item =
          "{\"id\":"
              + original.id()
              + ",\"name\":\"Changed\",\"category\":\"music\",\"amount\":2000,\"cycle\":\"monthly\",\"day\":1,\"status\":\"active\"}";
      assertThrows(
          ResponseStatusException.class,
          () -> data.save(id, "subscriptions", "[" + item + "," + item + "]"));
      assertEquals("Before", subscriptions.list(id).get(0).name());
      assertEquals(1000, subscriptions.list(id).get(0).amount());
    } finally {
      auth.delete(id);
    }
  }

  @Test
  void oversizedPasswordAndReservedSocialIdsAreRejected() {
    assertThrows(
        ResponseStatusException.class, () -> auth.register("audit_password", "a".repeat(73)));
    assertThrows(
        ResponseStatusException.class, () -> auth.register("oauth_google_fake", "password123"));
  }

  @Test
  @Transactional(propagation = Propagation.NOT_SUPPORTED)
  void concurrentFirstReadsOnlyMigrateOnce() throws Exception {
    String id = "audit_parallel";
    members.create(id, "hash");
    var executor = java.util.concurrent.Executors.newFixedThreadPool(2);
    try {
      raw.save(
          id,
          "subscriptions",
          "[{\"name\":\"Old\",\"category\":\"music\",\"amount\":1000,\"cycle\":\"monthly\",\"day\":1,\"status\":\"active\"}]");
      var first = executor.submit(() -> expenses.summary(id));
      var second = executor.submit(() -> subscriptions.list(id));
      assertEquals(1000, first.get(10, java.util.concurrent.TimeUnit.SECONDS).monthlyTotal());
      assertEquals(1, second.get(10, java.util.concurrent.TimeUnit.SECONDS).size());
      assertEquals(1, subscriptions.list(id).size());
    } finally {
      executor.shutdownNow();
      auth.delete(id);
    }
  }

  @Test
  void mysqlSchemaHasCompatibleTextTypes() throws Exception {
    try (var connection =
            java.sql.DriverManager.getConnection(
                "jdbc:h2:mem:audit_mysql_ddl;MODE=MySQL", "sa", "");
        var statement = connection.createStatement()) {
      String sql =
          new String(
              getClass().getResourceAsStream("/schema-mysql.sql").readAllBytes(),
              java.nio.charset.StandardCharsets.UTF_8);
      for (String part : sql.split(";")) if (!part.isBlank()) statement.execute(part);
      statement.executeUpdate(
          "INSERT INTO app_users(id,password_hash,display_name,profile_json)"
              + " VALUES('u','h','n','{}')");
    }
  }
}
