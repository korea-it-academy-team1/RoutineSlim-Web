package kr.routineslim.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import kr.routineslim.repository.UserDataRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class UserDataService {
  private final MemberService members;
  private final UserDataRepository repo;
  private final ObjectMapper mapper;
  private final kr.routineslim.repository.SubscriptionRepository subscriptions;

  public UserDataService(
      UserDataRepository repo,
      ObjectMapper mapper,
      kr.routineslim.repository.SubscriptionRepository subscriptions,
      MemberService members) {
    this.members = members;
    this.repo = repo;
    this.mapper = mapper;
    this.subscriptions = subscriptions;
  }

  @org.springframework.transaction.annotation.Transactional
  public String get(String user, String key) {
    checkKey(key);
    if ("profile".equals(key)) return members.legacyProfile(user);
    if (!"subscriptions".equals(key)) return repo.get(user, key);
    repo.lockUser(user);
    if ("null".equals(repo.get(user, "subscriptions_migrated_v1"))) {
      String legacy = repo.get(user, key);
      if (!"null".equals(legacy)
          && !"[]".equals(legacy)
          && subscriptions.findByUserIdOrderByIdDesc(user).isEmpty())
        syncSubscriptions(user, legacy);
      repo.save(user, "subscriptions_migrated_v1", "true");
    }
    try {
      return mapper.writeValueAsString(
          subscriptions.findByUserIdOrderByIdDesc(user).stream()
              .map(
                  s ->
                      java.util.Map.of(
                          "id",
                          s.id,
                          "name",
                          s.name,
                          "category",
                          s.category,
                          "amount",
                          s.amount,
                          "cycle",
                          s.cycle,
                          "day",
                          s.day,
                          "status",
                          s.status,
                          "billingAnchorDate",
                          s.billingAnchorDate == null ? "" : s.billingAnchorDate.toString()))
              .toList());
    } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
      throw new ResponseStatusException(
          HttpStatus.INTERNAL_SERVER_ERROR, "Subscription serialization failed");
    }
  }

  @org.springframework.transaction.annotation.Transactional
  public void save(String user, String key, String json) {
    checkKey(key);
    if ("subscriptions_migrated_v1".equals(key))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reserved data key");
    repo.lockUser(user);
    if (json == null || json.length() > ("profile".equals(key) ? 7100000 : 1000000))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
    try {
      read(json);
    } catch (Exception e) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid JSON");
    }
    if ("profile".equals(key)) {
      members.saveLegacy(user, json);
      return;
    }
    if ("setting-reminder-days".equals(key)) {
      var n = read(json);
      if (!n.isIntegralNumber()
          || !n.canConvertToInt()
          || !java.util.List.of(0, 1, 3, 7).contains(n.intValue()))
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid reminder days");
    }
    if ("setting-budget".equals(key)) {
      var n = read(json);
      if (!(n.isTextual() && n.asText().isEmpty()) && (!n.asText().matches("[0-9]{1,15}")))
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid budget");
    }
    if ("subscriptions".equals(key)) {
      syncSubscriptions(user, json);
      repo.save(user, "subscriptions_migrated_v1", "true");
    }
    repo.save(user, key, json);
  }

  private com.fasterxml.jackson.databind.JsonNode read(String value) {
    try {
      var n = mapper.readTree(value);
      if (n == null) throw new IllegalArgumentException();
      return n;
    } catch (Exception e) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid JSON");
    }
  }

  private void syncSubscriptions(String user, String json) {
    try {
      var root = mapper.readTree(json);
      if (!root.isArray() || root.size() > 500)
        throw new org.springframework.web.server.ResponseStatusException(
            HttpStatus.BAD_REQUEST, "Invalid subscriptions");
      java.util.List<kr.routineslim.entity.Subscription> list = new java.util.ArrayList<>();
      var existing = new java.util.HashMap<Long, kr.routineslim.entity.Subscription>();
      for (var current : subscriptions.findByUserIdOrderByIdDesc(user))
        existing.put(current.id, current);
      var retained = new java.util.HashSet<Long>();
      var incomingIds = new java.util.HashSet<Long>();
      for (var n : root) {
        String name = n.path("name").asText("").trim(), category = n.path("category").asText("기타");
        long amount = n.path("amount").asLong(-1);
        int day = n.path("day").asInt(1);
        String cycle = n.path("cycle").asText("monthly"),
            status = n.path("status").asText("active");
        if (name.isEmpty()
            || name.length() > 255
            || category.isBlank()
            || category.length() > 255
            || !n.path("amount").isIntegralNumber()
            || !n.path("amount").canConvertToLong()
            || !n.path("day").isIntegralNumber()
            || !n.path("day").canConvertToInt()
            || !java.util.List.of("active", "review").contains(status)
            || amount < 0
            || day < 1
            || day > 31
            || !java.util.List.of("monthly", "weekly", "yearly").contains(cycle))
          throw new org.springframework.web.server.ResponseStatusException(
              HttpStatus.BAD_REQUEST, "Invalid subscription item");
        Long incomingId = null;
        try {
          incomingId = Long.parseLong(n.path("id").asText(""));
        } catch (NumberFormatException ignored) {
        }
        if (incomingId != null && !incomingIds.add(incomingId))
          throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Duplicate subscription id");
        var subscription = incomingId == null ? null : existing.get(incomingId);
        if (subscription == null)
          subscription =
              new kr.routineslim.entity.Subscription(
                  user,
                  name,
                  category,
                  amount,
                  cycle,
                  day,
                  "review".equals(status) ? "review" : "active");
        else {
          subscription.name = name;
          subscription.category = category;
          subscription.amount = amount;
          subscription.cycle = cycle;
          subscription.day = day;
          subscription.status = "review".equals(status) ? "review" : "active";
          retained.add(subscription.id);
        }
        if (n.hasNonNull("billingAnchorDate") && !n.get("billingAnchorDate").asText().isBlank()) {
          try {
            subscription.billingAnchorDate =
                java.time.LocalDate.parse(n.get("billingAnchorDate").asText());
          } catch (java.time.format.DateTimeParseException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid billingAnchorDate");
          }
        }
        if (!"monthly".equals(cycle) && subscription.billingAnchorDate == null)
          subscription.billingAnchorDate = java.time.LocalDate.now();
        list.add(subscription);
      }
      for (var old : existing.values()) if (!retained.contains(old.id)) subscriptions.delete(old);
      subscriptions.saveAll(list);
    } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
      throw new org.springframework.web.server.ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Invalid JSON");
    }
  }

  private void checkKey(String key) {
    if (!key.matches("[a-zA-Z0-9_-]{1,60}"))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
  }
}
