package kr.routineslim.controller;
import jakarta.servlet.http.HttpSession;
import kr.routineslim.dto.Credentials;
import kr.routineslim.service.AuthService;
import kr.routineslim.security.SessionUser;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
@RestController @RequestMapping("/api") public class AccountController {
 private final AuthService auth;public AccountController(AuthService auth){this.auth=auth;}
 @PostMapping("/register") public Map<String,String> register(@RequestBody Credentials body,HttpSession session,jakarta.servlet.http.HttpServletRequest request){String id=body.id()==null?null:body.id().trim();auth.register(id,body.password());session.invalidate();HttpSession newSession=request.getSession(true);newSession.setAttribute("user",id);return Map.of("id",id);}
 @PostMapping("/login") public Map<String,String> login(@RequestBody Credentials body,HttpSession session,jakarta.servlet.http.HttpServletRequest request){auth.login(body.id(),body.password());session.invalidate();HttpSession newSession=request.getSession(true);newSession.setAttribute("user",body.id());return Map.of("id",body.id());}
 @GetMapping("/me") public Map<String,String> me(HttpSession session){return Map.of("id",SessionUser.require(session));}
 @PostMapping("/logout") public void logout(HttpSession session){session.invalidate();}
 @DeleteMapping("/me") public void delete(HttpSession session){auth.delete(SessionUser.require(session));session.invalidate();}
 public record PasswordChange(String currentPassword,String password){}
 @PutMapping("/password") public void changePassword(@RequestBody PasswordChange body,HttpSession session){auth.changePassword(SessionUser.require(session),body.currentPassword(),body.password());}
}
