package kr.routineslim.integration;

import static org.junit.jupiter.api.Assertions.*;

import java.time.*;
import java.util.*;
import kr.routineslim.dto.*;
import kr.routineslim.dto.ComparisonPlanRequest;
import kr.routineslim.dto.FreeTrialRequest;
import kr.routineslim.dto.InquiryAnswerRequest;
import kr.routineslim.dto.SavingsEntryRequest;
import kr.routineslim.dto.SavingsGoalRequest;
import kr.routineslim.dto.SubscriptionNoteRequest;
import kr.routineslim.dto.SupportArticleRequest;
import kr.routineslim.dto.SupportInquiryRequest;
import kr.routineslim.repository.*;
import kr.routineslim.service.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@SpringBootTest
@Transactional
class ExpandedFeaturesTest {
  @Autowired AuthenticationService auth;
  @Autowired PlanningService planning;
  @Autowired ReportActivityService reports;
  @Autowired SupportAdminService support;
  @Autowired NotificationService notifications;
  @Autowired SubscriptionService subscriptions;
  @Autowired PaymentService payments;
  @Autowired FeatureRecordRepository records;
  @Autowired JdbcTemplate db;
  @Autowired CommunityPostService community;
  @Autowired UserDataService data;
  @Autowired AccountRestrictionService restrictions;

  @BeforeEach
  void users() {
    auth.register("feature_user", "Password123!");
    auth.register("feature_other", "Password123!");
    auth.register("feature_admin", "Password123!");
    db.update("INSERT INTO account_security(user_id,role) VALUES('feature_admin','ADMIN')");
  }

  @Test
  void trialsArePrivateAndMutable() {
    var t =
        planning.trial(
            "feature_user",
            null,
            new FreeTrialRequest("Trial", "영상", LocalDate.now().plusDays(2), 9900L, 3, "ACTIVE"));
    assertEquals(1, planning.trials("feature_user").size());
    assertTrue(planning.trials("feature_other").isEmpty());
    assertThrows(
        ResponseStatusException.class,
        () ->
            planning.trial(
                "feature_other",
                t.path("id").asText(),
                new FreeTrialRequest("Attack", "영상", LocalDate.now(), 1L, 1, "ACTIVE")));
    planning.trial(
        "feature_user",
        t.path("id").asText(),
        new FreeTrialRequest("Trial", "영상", LocalDate.now().plusDays(2), 9900L, 3, "CANCELLED"));
    assertEquals("CANCELLED", planning.trials("feature_user").get(0).path("status").asText());
    planning.deleteTrial("feature_user", t.path("id").asText());
    assertTrue(planning.trials("feature_user").isEmpty());
  }

  @Test
  void monthlyGoalRejectsDuplicatesAndTracksRealSavings() {
    String month = YearMonth.now().toString();
    var g =
        planning.goal(
            "feature_user",
            null,
            new SavingsGoalRequest("Goal", month, 10000L, List.of("Check"), List.of(false)));
    assertThrows(
        ResponseStatusException.class,
        () ->
            planning.goal(
                "feature_user",
                null,
                new SavingsGoalRequest("Duplicate", month, 1L, List.of(), List.of())));
    var e =
        planning.saving(
            "feature_user",
            g.path("id").asText(),
            new SavingsEntryRequest("Saved", 4000L, LocalDate.now()));
    assertEquals(4000L, planning.goals("feature_user", month).get("saved"));
    assertThrows(
        ResponseStatusException.class,
        () ->
            planning.saving(
                "feature_other",
                g.path("id").asText(),
                new SavingsEntryRequest("Attack", 1L, LocalDate.now())));
    planning.deleteSaving("feature_user", e.path("id").asText());
    assertEquals(0L, planning.goals("feature_user", month).get("saved"));
  }

  @Test
  void paymentReportsUseRecordedPaymentsAndCorrectCategory() {
    var s =
        subscriptions.create(
            "feature_user",
            new SubscriptionRequest("Music", "음악", 3000L, "monthly", 1, "active", LocalDate.now()));
    payments.create("feature_user", new PaymentRequest(s.id(), "Recorded", 2000L, LocalDate.now()));
    payments.create("feature_user", new PaymentRequest(null, "Other", 1000L, LocalDate.now()));
    var report = reports.monthly("feature_user", YearMonth.now().toString());
    assertEquals(3000L, report.get("total"));
    assertEquals(false, report.get("hasPrevious"));
    assertNull(report.get("difference"));
    var categories = (List<?>) report.get("categories");
    assertEquals(2, categories.size());
    assertEquals(0L, reports.monthly("feature_other", YearMonth.now().toString()).get("total"));
  }

  @Test
  void subscriptionDetailIncludesNotePaymentsAndChanges() {
    var s =
        subscriptions.create(
            "feature_user",
            new SubscriptionRequest("Music", "음악", 3000L, "monthly", 1, "active", LocalDate.now()));
    subscriptions.update(
        "feature_user",
        s.id(),
        new SubscriptionRequest("Music", "음악", 4000L, "monthly", 1, "active", LocalDate.now()));
    payments.create("feature_user", new PaymentRequest(s.id(), "Bill", 4000L, LocalDate.now()));
    reports.note("feature_user", s.id(), new SubscriptionNoteRequest("Remember"));
    var detail = reports.detail("feature_user", s.id());
    assertEquals("Remember", detail.get("note"));
    assertEquals(4000L, detail.get("totalPaid"));
    assertEquals(2, ((List<?>) detail.get("changes")).size());
    assertThrows(ResponseStatusException.class, () -> reports.detail("feature_other", s.id()));
  }

  @Test
  void publicContentHidesDraftsAndRejectsOrdinaryEditors() {
    support.article(
        "feature_admin", "notice", null, new SupportArticleRequest("Draft", "안내", "Hidden", false));
    assertTrue(support.publicArticles("notice").isEmpty());
    var n =
        support.article(
            "feature_admin",
            "notice",
            null,
            new SupportArticleRequest("Published", "안내", "Visible", true));
    assertEquals(1, support.publicArticles("notice").size());
    assertThrows(
        ResponseStatusException.class,
        () ->
            support.article(
                "feature_user",
                "notice",
                null,
                new SupportArticleRequest("Attack", "안내", "X", true)));
    support.deletePublic("feature_admin", "notice", n.path("id").asText());
    assertTrue(support.publicArticles("notice").isEmpty());
  }

  @Test
  void comparisonsUsePublishedPlansAndPersistSelection() {
    var p =
        support.plan(
            "feature_admin",
            null,
            new ComparisonPlanRequest(
                "Service",
                "Basic",
                "영상",
                10000L,
                "monthly",
                List.of("Feature"),
                "https://example.com/plan",
                true));
    support.plan(
        "feature_admin",
        null,
        new ComparisonPlanRequest("Hidden", "Draft", "영상", 1L, "monthly", List.of(), "", false));
    assertEquals(1, support.plans().size());
    support.select("feature_user", List.of(p.path("id").asText()));
    assertEquals(1, support.selections("feature_user").size());
    assertTrue(support.selections("feature_other").isEmpty());
    assertThrows(
        ResponseStatusException.class,
        () ->
            support.plan(
                "feature_admin",
                null,
                new ComparisonPlanRequest(
                    "Invalid",
                    "Plan",
                    "영상",
                    1L,
                    "monthly",
                    List.of(),
                    "javascript:alert(1)",
                    true)));
  }

  @Test
  void inquiriesArePrivateAndAnswersNotifyOwner() {
    var q =
        support.inquire("feature_user", new SupportInquiryRequest("서비스 이용", "Question", "Help"));
    assertTrue(support.inquiries("feature_other").isEmpty());
    assertThrows(
        ResponseStatusException.class,
        () -> support.deleteInquiry("feature_other", q.path("id").asText()));
    support.answer("feature_admin", q.path("id").asText(), new InquiryAnswerRequest("Answered"));
    assertEquals("ANSWERED", support.inquiries("feature_user").get(0).path("status").asText());
    assertTrue(
        notifications.list("feature_user").stream()
            .anyMatch(n -> n.path("title").asText().contains("문의")));
  }

  @Test
  void notificationsAreDeduplicatedAndDeletedItemsStayHidden() {
    planning.trial(
        "feature_user",
        null,
        new FreeTrialRequest("Ending", "영상", LocalDate.now().plusDays(1), 9900L, 3, "ACTIVE"));
    var initial = notifications.list("feature_user");
    assertEquals(1, initial.size());
    assertEquals(1, notifications.list("feature_user").size());
    String id = initial.get(0).path("id").asText();
    notifications.read("feature_user", id);
    assertTrue(notifications.list("feature_user").get(0).path("read").asBoolean());
    assertThrows(ResponseStatusException.class, () -> notifications.read("feature_other", id));
    notifications.delete("feature_user", id);
    assertTrue(notifications.list("feature_user").isEmpty());
  }

  @Test
  void commentsAndBudgetGenerateUsefulNotifications() {
    var p = community.create("feature_user", new PostRequest("Post", "자유", "Body"));
    community.comment("feature_other", p.id, new CommentRequest("Reply"));
    data.save("feature_user", "setting-budget", "1000");
    payments.create("feature_user", new PaymentRequest(null, "Expense", 2000L, LocalDate.now()));
    var list = notifications.list("feature_user");
    assertTrue(list.stream().anyMatch(x -> x.path("source").asText().startsWith("comment:")));
    assertTrue(list.stream().anyMatch(x -> x.path("source").asText().startsWith("budget:")));
  }

  @Test
  void activityListsOnlyTheCurrentUsersItems() {
    var p = community.create("feature_user", new PostRequest("Mine", "자유", "Body"));
    community.comment("feature_other", p.id, new CommentRequest("Other reply"));
    community.toggleLike("feature_other", p.id);
    assertEquals(1, ((List<?>) reports.activity("feature_user").get("posts")).size());
    assertTrue(((List<?>) reports.activity("feature_user").get("comments")).isEmpty());
    assertEquals(1, ((List<?>) reports.activity("feature_other").get("comments")).size());
    assertEquals(1, ((List<?>) reports.activity("feature_other").get("likes")).size());
  }

  @Test
  void adminSuspensionProtectsAdminsAndBlocksLogin() {
    support.suspend("feature_admin", "feature_user", true);
    assertTrue(restrictions.suspended("feature_user"));
    assertThrows(ResponseStatusException.class, () -> auth.login("feature_user", "Password123!"));
    assertThrows(
        ResponseStatusException.class,
        () -> support.suspend("feature_user", "feature_other", true));
    assertThrows(
        ResponseStatusException.class,
        () -> support.suspend("feature_admin", "feature_admin", true));
    support.suspend("feature_admin", "feature_user", false);
    auth.login("feature_user", "Password123!");
    assertTrue(restrictions.revision("feature_user") >= 2);
  }

  @Test
  void adminMemberSearchHasStableFieldNames() {
    var result = support.members("feature_admin", "feature_user", 0, 20);
    var members = (List<?>) result.get("content");
    assertEquals(1, members.size());
    assertTrue(((Map<?, ?>) members.get(0)).containsKey("displayName"));
    assertFalse(((Map<?, ?>) members.get(0)).containsKey("password_hash"));
  }

  @Test
  void accountDeletionRemovesPrivateFeatureRecords() {
    planning.trial(
        "feature_user",
        null,
        new FreeTrialRequest("Trial", "영상", LocalDate.now(), 1L, 0, "ACTIVE"));
    auth.delete("feature_user");
    assertTrue(records.list("feature_user", "trial").isEmpty());
  }

  @Test
  void deletingSubscriptionKeepsPaymentsEditableWithoutDanglingReference() {
    var sub =
        subscriptions.create(
            "feature_user",
            new SubscriptionRequest("Music", "음악", 3000L, "monthly", 1, "active", LocalDate.now()));
    var payment =
        payments.create(
            "feature_user", new PaymentRequest(sub.id(), "Recorded", 2000L, LocalDate.now()));
    subscriptions.delete("feature_user", sub.id());
    var saved = payments.list("feature_user", YearMonth.now()).get(0);
    assertNull(saved.subscriptionId());
    assertEquals(2000L, saved.amount());
    assertEquals(
        2500L,
        payments
            .update(
                "feature_user",
                payment.id(),
                new PaymentRequest(saved.subscriptionId(), "Corrected", 2500L, LocalDate.now()))
            .amount());
    assertEquals(2500L, reports.monthly("feature_user", YearMonth.now().toString()).get("total"));
  }

  @Test
  void goalWithSavingsCannotMoveRecordsIntoAnotherMonth() {
    String month = YearMonth.now().toString();
    var goal =
        planning.goal(
            "feature_user",
            null,
            new SavingsGoalRequest("Goal", month, 10000L, List.of(), List.of()));
    String id = goal.path("id").asText();
    planning.saving("feature_user", id, new SavingsEntryRequest("Saved", 1000L, LocalDate.now()));
    assertThrows(
        ResponseStatusException.class,
        () ->
            planning.goal(
                "feature_user",
                id,
                new SavingsGoalRequest(
                    "Moved",
                    YearMonth.now().plusMonths(1).toString(),
                    10000L,
                    List.of(),
                    List.of())));
    assertEquals(1000L, planning.goals("feature_user", month).get("saved"));
  }
}
