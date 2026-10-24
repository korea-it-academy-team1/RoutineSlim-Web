package kr.routineslim.controller;

import jakarta.servlet.http.HttpSession;
import kr.routineslim.dto.SavingsSummary;
import kr.routineslim.security.SessionUser;
import kr.routineslim.service.SavingsService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/savings")
public class SavingsController {
  private final SavingsService service;

  public SavingsController(SavingsService service) {
    this.service = service;
  }

  @GetMapping("/summary")
  public SavingsSummary summary(HttpSession session) {
    return service.summary(SessionUser.require(session));
  }
}
