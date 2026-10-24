package kr.routineslim.controller;

import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.servlet.http.HttpSession;
import java.util.*;
import kr.routineslim.security.SessionUser;
import kr.routineslim.service.NotificationService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {
  private final NotificationService service;

  public NotificationController(NotificationService service) {
    this.service = service;
  }

  @GetMapping
  public List<ObjectNode> list(HttpSession s) {
    return service.list(SessionUser.require(s));
  }

  @PostMapping("/{id}/read")
  public void read(@PathVariable String id, HttpSession s) {
    service.read(SessionUser.require(s), id);
  }

  @PostMapping("/read-all")
  public void readAll(HttpSession s) {
    service.readAll(SessionUser.require(s));
  }

  @DeleteMapping("/{id}")
  public void delete(@PathVariable String id, HttpSession s) {
    service.delete(SessionUser.require(s), id);
  }
}
