package kr.routineslim.controller;

import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import java.util.*;
import kr.routineslim.dto.SupportInquiryRequest;
import kr.routineslim.security.SessionUser;
import kr.routineslim.service.SupportAdminService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class SupportController {
  private final SupportAdminService service;

  public SupportController(SupportAdminService service) {
    this.service = service;
  }

  @GetMapping("/support/notices")
  public List<ObjectNode> notices() {
    return service.publicArticles("notice");
  }

  @GetMapping("/support/faqs")
  public List<ObjectNode> faqs() {
    return service.publicArticles("faq");
  }

  @GetMapping("/support/inquiries")
  public List<ObjectNode> inquiries(HttpSession s) {
    return service.inquiries(SessionUser.require(s));
  }

  @PostMapping("/support/inquiries")
  public ObjectNode inquire(@Valid @RequestBody SupportInquiryRequest r, HttpSession s) {
    return service.inquire(SessionUser.require(s), r);
  }

  @DeleteMapping("/support/inquiries/{id}")
  public void remove(@PathVariable String id, HttpSession s) {
    service.deleteInquiry(SessionUser.require(s), id);
  }

  @GetMapping("/comparison/plans")
  public List<ObjectNode> plans() {
    return service.plans();
  }

  @GetMapping("/comparison/selection")
  public List<ObjectNode> selected(HttpSession s) {
    return service.selections(SessionUser.require(s));
  }

  public record Selection(@Size(max = 3) List<String> ids) {}

  @PutMapping("/comparison/selection")
  public void select(@Valid @RequestBody Selection r, HttpSession s) {
    service.select(SessionUser.require(s), r.ids());
  }
}
