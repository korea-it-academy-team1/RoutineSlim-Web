package kr.routineslim.controller;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import kr.routineslim.security.SessionUser;
import kr.routineslim.dto.MemberProfileRequest;
import kr.routineslim.dto.MemberProfileResponse;
import kr.routineslim.service.MemberService;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/v1/members/me")
public class MemberController {
 private final MemberService service;
 public MemberController(MemberService service){this.service=service;}
 @GetMapping public MemberProfileResponse get(HttpSession session){return service.get(SessionUser.require(session));}
 @PutMapping public MemberProfileResponse update(@Valid @RequestBody MemberProfileRequest body,HttpSession session){return service.update(SessionUser.require(session),body);}
}
