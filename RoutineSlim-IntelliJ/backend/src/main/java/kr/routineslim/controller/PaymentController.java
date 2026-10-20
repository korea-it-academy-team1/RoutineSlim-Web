package kr.routineslim.controller;
import kr.routineslim.security.SessionUser;
import kr.routineslim.dto.PaymentRequest;
import kr.routineslim.dto.PaymentResponse;
import kr.routineslim.service.PaymentService;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import java.time.YearMonth;
import java.util.*;
@RestController @RequestMapping("/api/v1/payments") public class PaymentController {
 private final PaymentService service;public PaymentController(PaymentService service){this.service=service;}
 @GetMapping public List<PaymentResponse> list(@RequestParam(required=false) String month,HttpSession session){return service.list(SessionUser.require(session),parse(month));}
 @GetMapping("/summary") public Map<String,Object> summary(@RequestParam(required=false) String month,HttpSession session){YearMonth m=parse(month);return Map.of("month",m.toString(),"actualPaid",service.total(SessionUser.require(session),m));}
 @PostMapping public PaymentResponse create(@Valid @RequestBody PaymentRequest request,HttpSession session){return service.create(SessionUser.require(session),request);}
 @DeleteMapping("/{id}") public void delete(@PathVariable Long id,HttpSession session){service.delete(SessionUser.require(session),id);}
 private YearMonth parse(String month){try{return month==null||month.isBlank()?YearMonth.now():YearMonth.parse(month);}catch(Exception e){throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST,"Invalid month (YYYY-MM)");}}
}
