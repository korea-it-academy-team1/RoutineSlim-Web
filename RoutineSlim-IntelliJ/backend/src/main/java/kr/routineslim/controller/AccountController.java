package kr.routineslim.controller;

import jakarta.servlet.http.HttpSession;
import java.util.Map;
import kr.routineslim.dto.LoginRequest;
import kr.routineslim.security.SessionUser;
import kr.routineslim.service.AuthenticationService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class AccountController {
  private final kr.routineslim.service.AccountRestrictionService restrictions;
  private final AuthenticationService auth;
  private final kr.routineslim.service.RegistrationService registration;

  public AccountController(
      AuthenticationService auth,
      kr.routineslim.service.RegistrationService registration,
      kr.routineslim.service.AccountRestrictionService restrictions) {
    this.restrictions = restrictions;
    this.auth = auth;
    this.registration = registration;
  }

  @PostMapping("/register")
  public Map<String, String> register(
      @jakarta.validation.Valid @RequestBody kr.routineslim.dto.RegistrationRequest body,
      HttpSession session) {
    String id = registration.register(body, session.getId());
    session.invalidate();
    return Map.of("id", id, "message", "회원가입이 완료되었습니다. 로그인해주세요.");
  }

  @PostMapping("/login")
  public Map<String, String> login(
      @RequestBody LoginRequest body,
      HttpSession session,
      jakarta.servlet.http.HttpServletRequest request,
      jakarta.servlet.http.HttpServletResponse response) {
    String id = auth.authenticate(body.id(), body.password());
    session.invalidate();
    HttpSession newSession = request.getSession(true);
    boolean remember = Boolean.TRUE.equals(body.rememberMe());
    newSession.setMaxInactiveInterval(remember ? 14 * 24 * 60 * 60 : 30 * 60);
    String path = request.getContextPath().isEmpty() ? "/" : request.getContextPath();
    var cookie =
        org.springframework.http.ResponseCookie.from("JSESSIONID", newSession.getId())
            .httpOnly(true)
            .secure(
                request.isSecure()
                    || request.getServletContext().getSessionCookieConfig().isSecure())
            .sameSite("Lax")
            .path(path)
            .maxAge(remember ? java.time.Duration.ofDays(14) : java.time.Duration.ofSeconds(-1))
            .build();
    response.addHeader("Set-Cookie", cookie.toString());
    newSession.setAttribute("user", id);
    newSession.setAttribute("accountRevision", restrictions.revision(id));
    return Map.of("id", id);
  }

  @GetMapping("/me")
  public Map<String, String> me(HttpSession session) {
    return Map.of("id", SessionUser.require(session));
  }

  @PostMapping("/logout")
  public void logout(HttpSession session) {
    session.invalidate();
  }

  @DeleteMapping("/me")
  public void delete(HttpSession session) {
    auth.delete(SessionUser.require(session));
    session.invalidate();
  }

  public record PasswordChange(String currentPassword, String password) {}

  @PutMapping("/password")
  public void changePassword(@RequestBody PasswordChange body, HttpSession session) {
    String user = SessionUser.require(session);
    auth.changePassword(user, body.currentPassword(), body.password());
    session.setAttribute("accountRevision", restrictions.revision(user));
  }
}
