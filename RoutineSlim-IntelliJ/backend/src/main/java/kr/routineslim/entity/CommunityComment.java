package kr.routineslim.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(
    name = "community_comments",
    indexes = @Index(name = "idx_comments_post", columnList = "post_id"))
public class CommunityComment {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  public Long id;

  @Column(name = "post_id", nullable = false)
  public Long postId;

  @Column(name = "author_id", nullable = false, length = 120)
  public String authorId;

  @Column(nullable = false, length = 2000)
  public String content;

  @Column(nullable = false)
  public Instant createdAt;

  protected CommunityComment() {}

  public CommunityComment(Long postId, String author, String content) {
    this.postId = postId;
    this.authorId = author;
    this.content = content;
    this.createdAt = Instant.now();
  }
}
