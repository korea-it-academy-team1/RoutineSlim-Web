package kr.routineslim.controller;

import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.util.*;
import kr.routineslim.dto.CommentRequest;
import kr.routineslim.dto.PostRequest;
import kr.routineslim.entity.CommunityComment;
import kr.routineslim.entity.CommunityPost;
import kr.routineslim.security.SessionUser;
import kr.routineslim.service.CommunityPostService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/community/posts")
public class CommunityPostController {
  private final CommunityPostService service;

  public CommunityPostController(CommunityPostService service) {
    this.service = service;
  }

  @GetMapping
  public List<CommunityPost> list(HttpSession session) {
    SessionUser.require(session);
    return service.list();
  }

  @GetMapping("/{id}")
  public CommunityPost get(@PathVariable Long id, HttpSession session) {
    SessionUser.require(session);
    return service.get(id);
  }

  @PostMapping
  public CommunityPost create(@Valid @RequestBody PostRequest request, HttpSession session) {
    return service.create(SessionUser.require(session), request);
  }

  @PutMapping("/{id}")
  public CommunityPost update(
      @PathVariable Long id, @Valid @RequestBody PostRequest request, HttpSession session) {
    return service.update(SessionUser.require(session), id, request);
  }

  @DeleteMapping("/{id}")
  public void delete(@PathVariable Long id, HttpSession session) {
    service.delete(SessionUser.require(session), id);
  }

  @GetMapping("/{id}/comments")
  public List<CommunityComment> comments(@PathVariable Long id, HttpSession session) {
    SessionUser.require(session);
    return service.comments(id);
  }

  @PostMapping("/{id}/comments")
  public CommunityComment comment(
      @PathVariable Long id, @Valid @RequestBody CommentRequest request, HttpSession session) {
    return service.comment(SessionUser.require(session), id, request);
  }

  @PutMapping("/{id}/comments/{commentId}")
  public CommunityComment updateComment(
      @PathVariable Long id,
      @PathVariable Long commentId,
      @Valid @RequestBody CommentRequest request,
      HttpSession session) {
    return service.updateComment(SessionUser.require(session), id, commentId, request);
  }

  @DeleteMapping("/{id}/comments/{commentId}")
  public void deleteComment(
      @PathVariable Long id, @PathVariable Long commentId, HttpSession session) {
    service.deleteComment(SessionUser.require(session), id, commentId);
  }

  @GetMapping("/{id}/likes/count")
  public Map<String, Object> count(@PathVariable Long id, HttpSession session) {
    String user = SessionUser.require(session);
    return Map.of("likes", service.likeCount(id), "liked", service.isLiked(user, id));
  }

  @PostMapping("/{id}/likes/toggle")
  public Map<String, Object> like(@PathVariable Long id, HttpSession session) {
    boolean liked = service.toggleLike(SessionUser.require(session), id);
    return Map.of("liked", liked, "likes", service.likeCount(id));
  }
}
