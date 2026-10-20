package kr.routineslim.controller;
import kr.routineslim.security.SessionUser;
import kr.routineslim.service.SubscriptionService;
import kr.routineslim.dto.SubscriptionRequest;
import kr.routineslim.dto.SubscriptionResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@RestController @RequestMapping("/api/v1/subscriptions")
public class SubscriptionController {
 private final SubscriptionService service;
 public SubscriptionController(SubscriptionService service){this.service=service;}
 @GetMapping public List<SubscriptionResponse> list(HttpSession session){return service.list(SessionUser.require(session));}
 @PostMapping public SubscriptionResponse create(@Valid @RequestBody SubscriptionRequest r,HttpSession session){return service.create(SessionUser.require(session),r);}
 @PutMapping("/{id}") public SubscriptionResponse update(@PathVariable Long id,@Valid @RequestBody SubscriptionRequest r,HttpSession session){return service.update(SessionUser.require(session),id,r);}
 @DeleteMapping("/{id}") public void delete(@PathVariable Long id,HttpSession session){service.delete(SessionUser.require(session),id);}
}
