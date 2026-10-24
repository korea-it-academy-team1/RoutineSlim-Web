package kr.routineslim.controller;

import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.util.*;
import kr.routineslim.dto.FreeTrialRequest;
import kr.routineslim.dto.SavingsEntryRequest;
import kr.routineslim.dto.SavingsGoalRequest;
import kr.routineslim.security.SessionUser;
import kr.routineslim.service.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class PlanningController {
  private final PlanningService service;

  public PlanningController(PlanningService service) {
    this.service = service;
  }

  @GetMapping("/trials")
  public List<ObjectNode> trials(HttpSession s) {
    return service.trials(SessionUser.require(s));
  }

  @PostMapping("/trials")
  public ObjectNode createTrial(@Valid @RequestBody FreeTrialRequest r, HttpSession s) {
    return service.trial(SessionUser.require(s), null, r);
  }

  @PutMapping("/trials/{id}")
  public ObjectNode updateTrial(
      @PathVariable String id, @Valid @RequestBody FreeTrialRequest r, HttpSession s) {
    return service.trial(SessionUser.require(s), id, r);
  }

  @DeleteMapping("/trials/{id}")
  public void deleteTrial(@PathVariable String id, HttpSession s) {
    service.deleteTrial(SessionUser.require(s), id);
  }

  @GetMapping("/goals")
  public Map<String, Object> goals(@RequestParam String month, HttpSession s) {
    return service.goals(SessionUser.require(s), month);
  }

  @PostMapping("/goals")
  public ObjectNode createGoal(@Valid @RequestBody SavingsGoalRequest r, HttpSession s) {
    return service.goal(SessionUser.require(s), null, r);
  }

  @PutMapping("/goals/{id}")
  public ObjectNode updateGoal(
      @PathVariable String id, @Valid @RequestBody SavingsGoalRequest r, HttpSession s) {
    return service.goal(SessionUser.require(s), id, r);
  }

  @DeleteMapping("/goals/{id}")
  public void deleteGoal(@PathVariable String id, HttpSession s) {
    service.deleteGoal(SessionUser.require(s), id);
  }

  @PostMapping("/goals/{id}/savings")
  public ObjectNode saving(
      @PathVariable String id, @Valid @RequestBody SavingsEntryRequest r, HttpSession s) {
    return service.saving(SessionUser.require(s), id, r);
  }

  @DeleteMapping("/savings-entries/{id}")
  public void deleteSaving(@PathVariable String id, HttpSession s) {
    service.deleteSaving(SessionUser.require(s), id);
  }
}
