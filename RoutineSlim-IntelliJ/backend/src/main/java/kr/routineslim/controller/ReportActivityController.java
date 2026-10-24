package kr.routineslim.controller;

import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.util.*;
import kr.routineslim.dto.SubscriptionNoteRequest;
import kr.routineslim.security.SessionUser;
import kr.routineslim.service.ReportActivityService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class ReportActivityController {
  private final ReportActivityService service;

  public ReportActivityController(ReportActivityService service) {
    this.service = service;
  }

  @GetMapping("/reports/monthly")
  public Map<String, Object> monthly(@RequestParam String month, HttpSession s) {
    return service.monthly(SessionUser.require(s), month);
  }

  @GetMapping("/subscriptions/{id}/detail")
  public Map<String, Object> detail(@PathVariable Long id, HttpSession s) {
    return service.detail(SessionUser.require(s), id);
  }

  @PutMapping("/subscriptions/{id}/note")
  public void note(
      @PathVariable Long id, @Valid @RequestBody SubscriptionNoteRequest note, HttpSession s) {
    service.note(SessionUser.require(s), id, note);
  }

  @GetMapping("/activity/me")
  public Map<String, Object> activity(HttpSession s) {
    return service.activity(SessionUser.require(s));
  }
}
