package kr.routineslim.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "community_posts")
public class CommunityPost {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  public Long id;

  @Column(name = "author_id", nullable = false, length = 120)
  public String authorId;

  @Column(nullable = false, length = 120)
  public String title;

  @Column(nullable = false, length = 40)
  public String category;

  @Column(nullable = false, length = 5000)
  public String content;

  @Column(nullable = false)
  public Instant createdAt;

  @Lob public String html;

  @Lob
  @Convert(converter = StringListConverter.class)
  public java.util.List<String> images = new java.util.ArrayList<>();

  @Lob
  @Convert(converter = StringListConverter.class)
  public java.util.List<String> tags = new java.util.ArrayList<>();

  protected CommunityPost() {}

  public CommunityPost(String author, String title, String category, String content) {
    this.authorId = author;
    this.title = title;
    this.category = category;
    this.content = content;
    this.createdAt = Instant.now();
  }
}
