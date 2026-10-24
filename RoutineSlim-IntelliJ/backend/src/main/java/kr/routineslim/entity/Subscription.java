package kr.routineslim.entity;

import jakarta.persistence.*;

@Entity
@Table(
    name = "subscriptions",
    indexes = @Index(name = "idx_subscriptions_user", columnList = "user_id"))
public class Subscription {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  public Long id;

  @Column(name = "user_id", nullable = false, length = 120)
  public String userId;

  @Column(nullable = false)
  public String name;

  @Column(nullable = false)
  public String category;

  @Column(nullable = false)
  public long amount;

  @Column(nullable = false)
  public String cycle;

  @Column(name = "billing_day", nullable = false)
  public int day;

  @Column(nullable = false)
  public String status;

  @Column(name = "billing_anchor_date")
  public java.time.LocalDate billingAnchorDate;

  protected Subscription() {}

  public Subscription(
      String userId,
      String name,
      String category,
      long amount,
      String cycle,
      int day,
      String status) {
    this.userId = userId;
    this.name = name;
    this.category = category;
    this.amount = amount;
    this.cycle = cycle;
    this.day = day;
    this.status = status;
  }
}
