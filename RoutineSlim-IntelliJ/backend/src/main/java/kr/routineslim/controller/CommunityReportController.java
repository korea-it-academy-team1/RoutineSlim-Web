package kr.routineslim.controller;
import kr.routineslim.security.SessionUser;
import kr.routineslim.entity.CommunityReport;
import kr.routineslim.repository.CommunityCommentRepository;
import kr.routineslim.repository.CommunityLikeRepository;
import kr.routineslim.repository.CommunityPostRepository;
import kr.routineslim.repository.CommunityReportRepository;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
@RestController @RequestMapping("/api/v1/community") public class CommunityReportController {
 private final CommunityReportRepository reports;private final CommunityPostRepository posts;
 public CommunityReportController(CommunityReportRepository reports,CommunityPostRepository posts){this.reports=reports;this.posts=posts;}
 public record ReportRequest(@NotBlank @Size(max=500) String reason){}
 @PostMapping("/posts/{id}/reports") @Transactional public Map<String,String> report(@PathVariable Long id,@Valid @RequestBody ReportRequest request,HttpSession session){
  String user=SessionUser.require(session);if(!posts.existsById(id))throw new ResponseStatusException(HttpStatus.NOT_FOUND);
  if(reports.existsByPostIdAndReporterId(id,user))throw new ResponseStatusException(HttpStatus.CONFLICT,"Already reported");
  reports.save(new CommunityReport(id,user,request.reason().trim()));return Map.of("status","received");
 }
 // Operator account is explicitly configured through environment, not a public query parameter.
 private void requireAdmin(HttpSession session,@Value("${routineslim.admin-id:}") String admin){
  String user=SessionUser.require(session);if(admin.isBlank()||!admin.equals(user))throw new ResponseStatusException(HttpStatus.FORBIDDEN);
 }
 @GetMapping("/reports") public List<CommunityReport> pending(HttpSession session,@Value("${routineslim.admin-id:}") String admin){requireAdmin(session,admin);return reports.findByStatusOrderByCreatedAtDesc("PENDING");}
 @PostMapping("/reports/{id}/resolve") @Transactional public Map<String,String> resolve(@PathVariable Long id,HttpSession session,@Value("${routineslim.admin-id:}") String admin){requireAdmin(session,admin);CommunityReport report=reports.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));report.status="RESOLVED";return Map.of("status","resolved");}
}
