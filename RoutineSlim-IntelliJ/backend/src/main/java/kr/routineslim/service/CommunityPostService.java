package kr.routineslim.service;

import java.util.*;
import kr.routineslim.dto.CommentRequest;
import kr.routineslim.dto.PostRequest;
import kr.routineslim.entity.CommunityComment;
import kr.routineslim.entity.CommunityLike;
import kr.routineslim.entity.CommunityPost;
import kr.routineslim.repository.CommunityCommentRepository;
import kr.routineslim.repository.CommunityLikeRepository;
import kr.routineslim.repository.CommunityPostRepository;
import kr.routineslim.repository.CommunityReportRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CommunityPostService {
  private final NotificationService notifications;
  private final CommunityReportRepository reports;
  private final CommunityPostRepository posts;
  private final CommunityCommentRepository comments;
  private final CommunityLikeRepository likes;

  public CommunityPostService(
      CommunityPostRepository posts,
      CommunityCommentRepository comments,
      CommunityLikeRepository likes,
      CommunityReportRepository reports,
      NotificationService notifications) {
    this.notifications = notifications;
    this.reports = reports;
    this.posts = posts;
    this.comments = comments;
    this.likes = likes;
  }

  private void media(CommunityPost post, PostRequest r) {
    if (r.html() != null) post.html = r.html();
    if (r.images() != null) post.images = new ArrayList<>(r.images());
    if (r.tags() != null) post.tags = new ArrayList<>(r.tags());
  }

  public List<CommunityPost> list() {
    return posts.findAllByOrderByCreatedAtDesc();
  }

  public CommunityPost get(Long id) {
    return posts.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
  }

  @Transactional
  public CommunityPost create(String user, PostRequest r) {
    var post = new CommunityPost(user, r.title().trim(), r.category().trim(), r.content().trim());
    media(post, r);
    return posts.save(post);
  }

  @Transactional
  public CommunityPost update(String user, Long id, PostRequest r) {
    var post =
        posts
            .findByIdAndAuthorId(id, user)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    post.title = r.title().trim();
    post.category = r.category().trim();
    if (!post.content.equals(r.content().trim()) && r.html() == null) post.html = null;
    post.content = r.content().trim();
    media(post, r);
    return posts.save(post);
  }

  @Transactional
  public void delete(String user, Long id) {
    var post =
        posts
            .findByIdAndAuthorId(id, user)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    comments.deleteByPostId(id);
    likes.deleteByPostId(id);
    reports.deleteByPostId(id);
    posts.delete(post);
  }

  public List<CommunityComment> comments(Long postId) {
    get(postId);
    return comments.findByPostIdOrderByCreatedAtAsc(postId);
  }

  @Transactional
  public CommunityComment comment(String user, Long postId, CommentRequest r) {
    var post = get(postId);
    var comment = comments.saveAndFlush(new CommunityComment(postId, user, r.content().trim()));
    if (!post.authorId.equals(user))
      notifications.publish(
          post.authorId,
          "comment:" + comment.id,
          "내 게시글에 댓글이 달렸어요.",
          post.title,
          "community",
          String.valueOf(postId));
    return comment;
  }

  @Transactional
  public boolean toggleLike(String user, Long postId) {
    get(postId);
    if (likes.existsByPostIdAndUserId(postId, user)) {
      likes.deleteByPostIdAndUserId(postId, user);
      return false;
    }
    likes.save(new CommunityLike(postId, user));
    return true;
  }

  @Transactional
  public CommunityComment updateComment(
      String user, Long postId, Long commentId, CommentRequest request) {
    get(postId);
    var comment =
        comments
            .findById(commentId)
            .filter(c -> c.postId.equals(postId) && c.authorId.equals(user))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    comment.content = request.content().trim();
    return comments.save(comment);
  }

  @Transactional
  public void deleteComment(String user, Long postId, Long commentId) {
    get(postId);
    var comment =
        comments
            .findById(commentId)
            .filter(c -> c.postId.equals(postId) && c.authorId.equals(user))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    comments.delete(comment);
  }

  public boolean isLiked(String user, Long postId) {
    get(postId);
    return likes.existsByPostIdAndUserId(postId, user);
  }

  public long likeCount(Long postId) {
    get(postId);
    return likes.countByPostId(postId);
  }
}
