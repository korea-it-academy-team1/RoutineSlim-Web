package kr.routineslim.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(
    name = "community_reports",
    uniqueConstraints = @UniqueConstraint(columnNames = {"post_id", "reporter_id"}))
public class CommunityReport {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  public Long id;

  @Column(name = "post_id", nullable = false)
  public Long postId;

  @Column(name = "reporter_id", nullable = false, length = 120)
  public String reporterId;

  @Column(nullable = false, length = 500)
  public String reason;

  @Column(nullable = false, length = 20)
  public String status = "PENDING";

  @Column(nullable = false)
  public Instant createdAt = Instant.now();

  protected CommunityReport() {}

  public CommunityReport(Long postId, String reporterId, String reason) {
    this.postId = postId;
    this.reporterId = reporterId;
    this.reason = reason;
  }
}
