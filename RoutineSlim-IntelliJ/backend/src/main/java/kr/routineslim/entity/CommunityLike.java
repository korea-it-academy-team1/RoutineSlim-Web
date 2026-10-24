package kr.routineslim.entity;

import jakarta.persistence.*;

@Entity
@Table(
    name = "community_likes",
    uniqueConstraints =
        @UniqueConstraint(
            name = "uq_like_post_user",
            columnNames = {"post_id", "user_id"}))
public class CommunityLike {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  public Long id;

  @Column(name = "post_id", nullable = false)
  public Long postId;

  @Column(name = "user_id", nullable = false, length = 120)
  public String userId;

  protected CommunityLike() {}

  public CommunityLike(Long postId, String user) {
    this.postId = postId;
    this.userId = user;
  }
}
