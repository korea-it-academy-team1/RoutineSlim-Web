package kr.routineslim.entity;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(
    name = "payment_records",
    indexes = @Index(name = "idx_payment_owner_date", columnList = "user_id,paid_on"))
public class PaymentRecord {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  public Long id;

  @Column(name = "user_id", nullable = false, length = 120)
  public String userId;

  @Column(name = "subscription_id")
  public Long subscriptionId;

  @Column(nullable = false, length = 150)
  public String description;

  @Column(nullable = false)
  public long amount;

  @Column(name = "paid_on", nullable = false)
  public LocalDate paidOn;

  protected PaymentRecord() {}

  public PaymentRecord(
      String userId, Long subscriptionId, String description, long amount, LocalDate paidOn) {
    this.userId = userId;
    this.subscriptionId = subscriptionId;
    this.description = description;
    this.amount = amount;
    this.paidOn = paidOn;
  }
}
