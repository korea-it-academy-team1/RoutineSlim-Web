package kr.routineslim.integration;

import static org.junit.jupiter.api.Assertions.*;

import java.time.LocalDate;
import java.util.List;
import kr.routineslim.controller.ReminderController;
import kr.routineslim.dto.*;
import kr.routineslim.entity.*;
import kr.routineslim.repository.*;
import kr.routineslim.service.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@SpringBootTest
@Transactional
class CompletedFeaturesTest {
  @Autowired jakarta.persistence.EntityManager entityManager;
  @Autowired CommunityPostService community;
  @Autowired CommunityPostRepository posts;
  @Autowired UserDataService data;
  @Autowired MemberRepository members;
  @Autowired SubscriptionRepository subscriptions;
  @Autowired ReminderController reminders;

  @Test
  void commentEditingRequiresAuthorAndCorrectPost() {
    var post = community.create("author", new PostRequest("title", "category", "body"));
    var other = community.create("other", new PostRequest("other", "category", "body"));
    var comment = community.comment("reader", post.id, new CommentRequest("before"));
    assertThrows(
        ResponseStatusException.class,
        () ->
            community.updateComment("stranger", post.id, comment.id, new CommentRequest("attack")));
    assertThrows(
        ResponseStatusException.class,
        () -> community.deleteComment("reader", other.id, comment.id));
    assertEquals(
        "after",
        community.updateComment("reader", post.id, comment.id, new CommentRequest("after"))
            .content);
    community.deleteComment("reader", post.id, comment.id);
    assertTrue(community.comments(post.id).isEmpty());
  }

  @Test
  void attachmentMetadataSurvivesOrdinaryPostEdit() {
    var post =
        community.create(
            "author",
            new PostRequest(
                "title", "category", "body", "<b>body</b>", List.of(), List.of("saving")));
    community.update("author", post.id, new PostRequest("updated", "category", "body"));
    posts.flush();
    entityManager.clear();
    assertEquals("<b>body</b>", community.get(post.id).html);
    assertEquals(List.of("saving"), community.get(post.id).tags);
  }

  @Test
  void accountSettingsAreIsolated() {
    members.create("settings_owner", "hash");
    members.create("settings_other", "hash");
    data.save("settings_owner", "setting-budget", "10000");
    assertEquals("10000", data.get("settings_owner", "setting-budget"));
    assertEquals("null", data.get("settings_other", "setting-budget"));
  }

  @Test
  void reminderDoesNotInventChargesBeforeFutureAnchor() {
    String user = "future_anchor";
    members.create(user, "hash");
    LocalDate today = LocalDate.now();
    var future =
        new Subscription(user, "Future", "Test", 1000, "monthly", today.getDayOfMonth(), "active");
    future.billingAnchorDate = today.plusMonths(2);
    subscriptions.save(future);
    var session = new MockHttpSession();
    session.setAttribute("user", user);
    assertTrue(reminders.upcoming(session).isEmpty());
  }

  @Test
  void imageValidationRejectsArbitraryPayloads() {
    assertFalse(
        new PostRequest("t", "c", "b", null, List.of("data:image/png;base64,PHNjcmlwdD4="), null)
            .isImagesValid());
    assertTrue(new PostRequest("t", "c", "b").isImagesValid());
  }
}
