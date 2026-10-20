package kr.routineslim.controller;
import jakarta.servlet.http.HttpSession;
import kr.routineslim.security.SessionUser;
import kr.routineslim.dto.ExpenseSummary;
import kr.routineslim.service.ExpenseService;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/v1/expenses") public class ExpenseController {
 private final ExpenseService service;public ExpenseController(ExpenseService service){this.service=service;}
 @GetMapping("/summary") public ExpenseSummary summary(HttpSession session){return service.summary(SessionUser.require(session));}
}
