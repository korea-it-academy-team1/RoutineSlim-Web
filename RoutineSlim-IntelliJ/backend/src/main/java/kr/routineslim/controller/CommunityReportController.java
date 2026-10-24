package kr.routineslim.controller;

import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.*;
import kr.routineslim.entity.CommunityReport;
import kr.routineslim.repository.CommunityPostRepository;
import kr.routineslim.repository.CommunityReportRepository;
import kr.routineslim.security.SessionUser;
import org.springframework.http.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/community")
public class CommunityReportController {
  private final kr.routineslim.service.AccountSecurityService security;
  private final kr.routineslim.service.CommunityPostService community;
  private final CommunityReportRepository reports;
  private final CommunityPostRepository posts;

  public CommunityReportController(
      CommunityReportRepository reports,
      CommunityPostRepository posts,
      kr.routineslim.service.CommunityPostService community,
      kr.routineslim.service.AccountSecurityService security) {
    this.security = security;
    this.community = community;
    this.reports = reports;
    this.posts = posts;
  }

  public record ReportRequest(@NotBlank @Size(max = 500) String reason) {}

  @PostMapping("/posts/{id}/reports")
  @Transactional
  public Map<String, String> report(
      @PathVariable Long id, @Valid @RequestBody ReportRequest request, HttpSession session) {
    String user = SessionUser.require(session);
    if (!posts.existsById(id)) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
    if (reports.existsByPostIdAndReporterId(id, user))
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Already reported");
    reports.save(new CommunityReport(id, user, request.reason().trim()));
    return Map.of("status", "received");
  }

  // Operator account is explicitly configured through environment, not a public query parameter.
  private void requireAdmin(HttpSession session) {
    String user = SessionUser.require(session);
    if (!security.isAdmin(user)) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
  }

  @GetMapping("/moderation")
  public Map<String, Boolean> moderation(HttpSession session) {
    return Map.of("admin", security.isAdmin(SessionUser.require(session)));
  }

  @DeleteMapping("/moderation/posts/{id}")
  @Transactional
  public void removeReported(@PathVariable Long id, HttpSession session) {
    requireAdmin(session);
    var post =
        posts.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    community.delete(post.authorId, id);
  }

  @GetMapping("/reports")
  public List<CommunityReport> pending(HttpSession session) {
    requireAdmin(session);
    return reports.findByStatusOrderByCreatedAtDesc("PENDING");
  }

  @PostMapping("/reports/{id}/resolve")
  @Transactional
  public Map<String, String> resolve(@PathVariable Long id, HttpSession session) {
    requireAdmin(session);
    CommunityReport report =
        reports.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    report.status = "RESOLVED";
    return Map.of("status", "resolved");
  }
}
