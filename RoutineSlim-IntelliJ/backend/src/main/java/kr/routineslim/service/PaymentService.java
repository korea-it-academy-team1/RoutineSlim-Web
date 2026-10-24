package kr.routineslim.service;

import java.time.*;
import java.util.*;
import kr.routineslim.dto.PaymentRequest;
import kr.routineslim.dto.PaymentResponse;
import kr.routineslim.entity.PaymentRecord;
import kr.routineslim.repository.PaymentRecordRepository;
import kr.routineslim.repository.SubscriptionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PaymentService {
  private final PaymentRecordRepository records;
  private final SubscriptionRepository subscriptions;

  public PaymentService(PaymentRecordRepository records, SubscriptionRepository subscriptions) {
    this.records = records;
    this.subscriptions = subscriptions;
  }

  public List<PaymentResponse> list(String user, YearMonth month) {
    return records
        .findByUserIdAndPaidOnBetweenOrderByPaidOnDescIdDesc(
            user, month.atDay(1), month.atEndOfMonth())
        .stream()
        .map(this::map)
        .toList();
  }

  @Transactional
  public PaymentResponse create(String user, PaymentRequest request) {
    if (request.subscriptionId() != null
        && subscriptions.findByIdAndUserId(request.subscriptionId(), user).isEmpty())
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown subscription");
    return map(
        records.save(
            new PaymentRecord(
                user,
                request.subscriptionId(),
                request.description().trim(),
                request.amount(),
                request.paidOn())));
  }

  @Transactional
  public PaymentResponse update(String user, Long id, PaymentRequest request) {
    var row =
        records
            .findByIdAndUserId(id, user)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    if (request.subscriptionId() != null
        && subscriptions.findByIdAndUserId(request.subscriptionId(), user).isEmpty())
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown subscription");
    row.subscriptionId = request.subscriptionId();
    row.description = request.description().trim();
    row.amount = request.amount();
    row.paidOn = request.paidOn();
    return map(records.saveAndFlush(row));
  }

  @Transactional
  public void delete(String user, Long id) {
    var row =
        records
            .findByIdAndUserId(id, user)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    records.delete(row);
  }

  public long total(String user, YearMonth month) {
    return list(user, month).stream().mapToLong(PaymentResponse::amount).sum();
  }

  private PaymentResponse map(PaymentRecord p) {
    return new PaymentResponse(p.id, p.subscriptionId, p.description, p.amount, p.paidOn);
  }
}
