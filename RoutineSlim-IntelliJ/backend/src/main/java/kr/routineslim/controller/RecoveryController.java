package kr.routineslim.controller;

import jakarta.servlet.http.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.*;
import kr.routineslim.service.RecoveryService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/recovery")
public class RecoveryController {
  private final RecoveryService service;

  public RecoveryController(RecoveryService service) {
    this.service = service;
  }

  public record Start(
      @NotBlank @Email @Size(max = 255) String email,
      @NotBlank @Pattern(regexp = "ID|PASSWORD") String purpose) {}

  public record Confirm(
      @NotBlank @Size(max = 36) String requestId,
      @NotBlank @Pattern(regexp = "[0-9]{6}") String code) {}

  public record Reset(
      @NotBlank @Size(max = 36) String requestId,
      @NotBlank @Size(max = 72) String password,
      @NotBlank String confirmPassword) {}

  @PostMapping("/start")
  public Map<String, Object> start(
      @Valid @RequestBody Start r, HttpSession s, HttpServletRequest request) {
    return service.start(r.email(), r.purpose(), s.getId(), request.getRemoteAddr());
  }

  @PostMapping("/confirm")
  public Map<String, Object> confirm(@Valid @RequestBody Confirm r, HttpSession s) {
    return service.confirm(s.getId(), r.requestId(), r.code());
  }

  @PostMapping("/reset")
  public void reset(@Valid @RequestBody Reset r, HttpSession s) {
    service.reset(s.getId(), r.requestId(), r.password(), r.confirmPassword());
    s.invalidate();
  }
}
