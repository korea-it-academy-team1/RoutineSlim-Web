package kr.routineslim.controller;

import jakarta.servlet.http.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import kr.routineslim.security.SessionUser;
import kr.routineslim.service.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/members/me/email")
public class EmailChangeController {
  private final EmailChangeService service;
  private final EmailVerificationService verification;

  public EmailChangeController(EmailChangeService service, EmailVerificationService verification) {
    this.service = service;
    this.verification = verification;
  }

  public record Send(
      @NotBlank @Email @Size(max = 255) String email,
      @NotBlank @Size(max = 128) String currentPassword) {}

  public record Change(
      @NotBlank @Email @Size(max = 255) String email,
      @NotBlank @Size(max = 128) String currentPassword,
      @NotBlank @Size(max = 36) String verificationId,
      @NotBlank @Pattern(regexp = "[0-9]{6}") String code) {}

  @PostMapping("/send")
  public EmailVerificationService.Challenge send(
      @Valid @RequestBody Send body, HttpSession session, HttpServletRequest request) {
    return service.send(
        SessionUser.require(session),
        body.email(),
        body.currentPassword(),
        session.getId(),
        request.getRemoteAddr());
  }

  @PutMapping
  public kr.routineslim.dto.MemberProfileResponse change(
      @Valid @RequestBody Change body, HttpSession session) {
    String user = SessionUser.require(session);
    verification.verify(body.verificationId(), body.code(), session.getId());
    return service.change(
        user, body.email(), body.currentPassword(), body.verificationId(), session.getId());
  }
}
