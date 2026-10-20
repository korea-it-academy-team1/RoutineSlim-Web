package kr.routineslim.controller;

import jakarta.servlet.http.HttpSession;
import kr.routineslim.security.SessionUser;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

/** Legacy bulk-write endpoint is retired to prevent divergent community stores. */
@RestController @RequestMapping("/api/community")
public class CommunityController {
 @PutMapping("/posts") public void retired(HttpSession session){
  SessionUser.require(session);
  throw new ResponseStatusException(HttpStatus.GONE,"Use /api/v1/community/posts instead");
 }
}
