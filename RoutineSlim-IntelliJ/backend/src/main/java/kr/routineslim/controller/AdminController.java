package kr.routineslim.controller;

import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.util.*;
import kr.routineslim.dto.AccountSuspensionRequest;
import kr.routineslim.dto.ComparisonPlanRequest;
import kr.routineslim.dto.InquiryAnswerRequest;
import kr.routineslim.dto.SupportArticleRequest;
import kr.routineslim.security.SessionUser;
import kr.routineslim.service.SupportAdminService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin")
public class AdminController {
  private final SupportAdminService service;

  public AdminController(SupportAdminService service) {
    this.service = service;
  }

  @GetMapping("/overview")
  public Map<String, Object> overview(HttpSession s) {
    return service.overview(SessionUser.require(s));
  }

  @GetMapping("/members")
  public Map<String, Object> members(
      @RequestParam(defaultValue = "") String query,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size,
      HttpSession s) {
    return service.members(SessionUser.require(s), query, page, size);
  }

  @PutMapping("/members/{id}/suspension")
  public void suspension(
      @PathVariable String id, @RequestBody AccountSuspensionRequest r, HttpSession s) {
    service.suspend(SessionUser.require(s), id, r.suspended());
  }

  @GetMapping("/content/{kind}")
  public List<ObjectNode> content(@PathVariable String kind, HttpSession s) {
    return service.adminRecords(SessionUser.require(s), kind);
  }

  @PostMapping("/content/{kind}")
  public ObjectNode createArticle(
      @PathVariable String kind, @Valid @RequestBody SupportArticleRequest r, HttpSession s) {
    return service.article(SessionUser.require(s), kind, null, r);
  }

  @PutMapping("/content/{kind}/{id}")
  public ObjectNode updateArticle(
      @PathVariable String kind,
      @PathVariable String id,
      @Valid @RequestBody SupportArticleRequest r,
      HttpSession s) {
    return service.article(SessionUser.require(s), kind, id, r);
  }

  @DeleteMapping("/content/{kind}/{id}")
  public void deleteArticle(@PathVariable String kind, @PathVariable String id, HttpSession s) {
    service.deletePublic(SessionUser.require(s), kind, id);
  }

  @PostMapping("/plans")
  public ObjectNode createPlan(@Valid @RequestBody ComparisonPlanRequest r, HttpSession s) {
    return service.plan(SessionUser.require(s), null, r);
  }

  @PutMapping("/plans/{id}")
  public ObjectNode updatePlan(
      @PathVariable String id, @Valid @RequestBody ComparisonPlanRequest r, HttpSession s) {
    return service.plan(SessionUser.require(s), id, r);
  }

  @GetMapping("/inquiries")
  public List<ObjectNode> inquiries(HttpSession s) {
    return service.adminInquiries(SessionUser.require(s));
  }

  @PutMapping("/inquiries/{id}/answer")
  public ObjectNode answer(
      @PathVariable String id, @Valid @RequestBody InquiryAnswerRequest r, HttpSession s) {
    return service.answer(SessionUser.require(s), id, r);
  }
}
