package kr.routineslim.controller;

import jakarta.servlet.http.HttpSession;
import java.util.Map;
import kr.routineslim.security.SessionUser;
import kr.routineslim.service.UserDataService;
import org.springframework.web.bind.annotation.*;

/**
 * Legacy endpoints preserved for existing front-end. New clients should use /api/v1/subscriptions.
 */
@RestController
@RequestMapping("/api/data")
public class SubscriptionDataController {
  private final UserDataService service;

  public SubscriptionDataController(UserDataService service) {
    this.service = service;
  }

  @GetMapping("/{key}")
  public Map<String, String> get(@PathVariable String key, HttpSession session) {
    return Map.of("json", service.get(SessionUser.require(session), key));
  }

  @PutMapping("/{key}")
  public void put(
      @PathVariable String key, @RequestBody Map<String, String> body, HttpSession session) {
    service.save(SessionUser.require(session), key, body.get("json"));
  }
}
