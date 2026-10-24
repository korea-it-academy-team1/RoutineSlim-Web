package kr.routineslim.service;

import java.util.List;
import kr.routineslim.dto.SubscriptionRequest;
import kr.routineslim.dto.SubscriptionResponse;
import kr.routineslim.entity.Subscription;
import kr.routineslim.repository.SubscriptionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class SubscriptionService {
  private final kr.routineslim.repository.FeatureRecordRepository records;
  private final UserDataService legacy;
  private final SubscriptionRepository repository;
  private final kr.routineslim.repository.PaymentRecordRepository payments;

  public SubscriptionService(
      SubscriptionRepository repository,
      UserDataService legacy,
      kr.routineslim.repository.FeatureRecordRepository records,
      kr.routineslim.repository.PaymentRecordRepository payments) {
    this.payments = payments;
    this.records = records;
    this.repository = repository;
    this.legacy = legacy;
  }

  public List<SubscriptionResponse> list(String user) {
    legacy.get(user, "subscriptions");
    return repository.findByUserIdOrderByIdDesc(user).stream().map(this::map).toList();
  }

  @Transactional
  public SubscriptionResponse create(String user, SubscriptionRequest request) {
    legacy.get(user, "subscriptions");
    validate(request);
    Subscription created =
        new Subscription(
            user,
            request.name(),
            request.category(),
            request.amount(),
            request.cycle(),
            request.day(),
            normalize(request.status()));
    created.billingAnchorDate =
        request.billingAnchorDate() != null
            ? request.billingAnchorDate()
            : java.time.LocalDate.now();
    repository.saveAndFlush(created);
    history(user, created, "REGISTER", null);
    return map(created);
  }

  @Transactional
  public SubscriptionResponse update(String user, Long id, SubscriptionRequest request) {
    legacy.get(user, "subscriptions");
    validate(request);
    Subscription s =
        repository
            .findByIdAndUserId(id, user)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    var before = map(s);
    s.name = request.name();
    s.category = request.category();
    s.amount = request.amount();
    s.cycle = request.cycle();
    s.day = request.day();
    s.status = normalize(request.status());
    s.billingAnchorDate =
        request.billingAnchorDate() != null ? request.billingAnchorDate() : s.billingAnchorDate;
    repository.save(s);
    history(user, s, "UPDATE", before);
    return map(s);
  }

  @Transactional
  public void delete(String user, Long id) {
    legacy.get(user, "subscriptions");
    Subscription s =
        repository
            .findByIdAndUserId(id, user)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    history(user, s, "DELETE", map(s));
    for (var payment : payments.findByUserIdAndSubscriptionId(user, id)) {
      payment.subscriptionId = null;
    }
    repository.delete(s);
  }

  private void history(String user, Subscription s, String action, SubscriptionResponse before) {
    var data = new java.util.LinkedHashMap<String, Object>();
    data.put("subscriptionId", s.id);
    data.put("action", action);
    data.put("before", before);
    data.put("after", map(s));
    records.create(user, "subscription_change", data);
  }

  private String normalize(String status) {
    return "review".equals(status) ? "review" : "active";
  }

  private void validate(SubscriptionRequest r) {
    if (r.amount() == null
        || r.amount() < 0
        || r.name() == null
        || r.name().isBlank()
        || r.category() == null
        || r.category().isBlank()
        || r.name().length() > 255
        || r.category().length() > 255
        || r.day() < 1
        || r.day() > 31
        || (r.cycle() == null || !List.of("monthly", "weekly", "yearly").contains(r.cycle()))
        || (r.status() != null && !List.of("active", "review").contains(r.status())))
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Invalid subscription data or missing billing anchor date");
  }

  private SubscriptionResponse map(Subscription s) {
    return new SubscriptionResponse(
        s.id, s.name, s.category, s.amount, s.cycle, s.day, s.status, s.billingAnchorDate);
  }
}
