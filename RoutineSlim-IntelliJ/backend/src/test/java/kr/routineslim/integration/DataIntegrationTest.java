package kr.routineslim.integration;

import static org.junit.jupiter.api.Assertions.*;

import kr.routineslim.dto.PostRequest;
import kr.routineslim.repository.SubscriptionRepository;
import kr.routineslim.service.CommunityPostService;
import kr.routineslim.service.UserDataService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class DataIntegrationTest {
  @Autowired UserDataService data;
  @Autowired kr.routineslim.repository.MemberRepository members;
  @Autowired SubscriptionRepository subscriptions;
  @Autowired CommunityPostService community;

  @Test
  void legacySubscriptionSaveUpdatesJpaAndPreservesIds() {
    String user = "integration_test_subscriber";
    members.create(user, "integration_test_hash");
    data.save(
        user,
        "subscriptions",
        "[{\"name\":\"Test\",\"category\":\"OTT\",\"amount\":9900,\"cycle\":\"monthly\",\"day\":15,\"status\":\"active\"}]");
    assertEquals(1, subscriptions.findByUserIdOrderByIdDesc(user).size());
    long id = subscriptions.findByUserIdOrderByIdDesc(user).get(0).id;
    data.save(
        user,
        "subscriptions",
        "[{\"id\":"
            + id
            + ",\"name\":\"Updated\",\"category\":\"OTT\",\"amount\":11900,\"cycle\":\"monthly\",\"day\":15,\"status\":\"active\"}]");
    assertEquals(id, subscriptions.findByUserIdOrderByIdDesc(user).get(0).id);
  }

  @Test
  void subscriptionBillingDayColumnIsQuerySafe() {
    String user = "integration_billing_day_test";
    members.create(user, "integration_test_hash");
    var subscription =
        new kr.routineslim.entity.Subscription(user, "Test", "OTT", 9900, "monthly", 15, "active");
    subscriptions.saveAndFlush(subscription);
    var found = subscriptions.findByUserIdOrderByIdDesc(user);
    assertEquals(1, found.size());
    assertEquals(15, found.get(0).day);
  }

  @Test
  void communityPostCrud() {
    var post = community.create("integration_test_author", new PostRequest("제목", "절약", "본문"));
    assertEquals("제목", community.get(post.id).title);
    community.delete("integration_test_author", post.id);
  }
}
