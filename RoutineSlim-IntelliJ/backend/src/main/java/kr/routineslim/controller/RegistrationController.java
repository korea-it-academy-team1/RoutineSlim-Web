package kr.routineslim.controller;

import jakarta.servlet.http.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.Map;
import kr.routineslim.service.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/registration")
public class RegistrationController {
  private final EmailVerificationService verification;
  private final RegistrationService registration;

  public RegistrationController(
      EmailVerificationService verification, RegistrationService registration) {
    this.verification = verification;
    this.registration = registration;
  }

  public record EmailRequest(@NotBlank @Email @Size(max = 255) String email) {}

  public record VerifyRequest(
      @NotBlank @Size(max = 36) String verificationId,
      @NotBlank @Pattern(regexp = "[0-9]{6}") String code) {}

  @GetMapping("/policy")
  public Map<String, Object> policy() {
    return Map.of(
        "termsVersion",
        RegistrationService.TERMS_VERSION,
        "privacyVersion",
        RegistrationService.PRIVACY_VERSION,
        "mailAvailable",
        verification.mailAvailable(),
        "terms",
        "RoutineSlim은 구독·고정비 관리와 커뮤니티 기능을 제공합니다. 계정과 비밀번호를 안전하게 관리하고 타인의 개인정보를 도용하거나 불법·유해 게시물을"
            + " 등록하지 않아야 합니다. 회원은 마이페이지에서 탈퇴할 수 있습니다.",
        "privacy",
        "수집 항목: 아이디, 이름, 이메일, 암호화한 비밀번호. 이용 목적: 회원 식별, 이메일 인증, 계정 및 서비스 제공. 보유 기간: 회원 탈퇴 시까지이며 탈퇴 시"
            + " 계정과 연결된 데이터를 삭제합니다. 필수 수집·이용 동의를 거부할 수 있지만 회원가입은 제한됩니다.");
  }

  @GetMapping("/id-availability")
  public Map<String, Boolean> available(@RequestParam String id) {
    return Map.of("available", registration.idAvailable(id));
  }

  @PostMapping("/email/send")
  public EmailVerificationService.Challenge send(
      @Valid @RequestBody EmailRequest body, HttpSession session, HttpServletRequest request) {
    return verification.send(body.email(), session.getId(), request.getRemoteAddr());
  }

  @PostMapping("/email/verify")
  public Map<String, Boolean> verify(@Valid @RequestBody VerifyRequest body, HttpSession session) {
    verification.verify(body.verificationId(), body.code(), session.getId());
    return Map.of("verified", true);
  }
}
