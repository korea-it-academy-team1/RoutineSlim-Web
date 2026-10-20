package kr.routineslim.controller;
import jakarta.servlet.http.HttpSession;
import kr.routineslim.dto.PaymentEvent;
import kr.routineslim.service.CalendarService;
import kr.routineslim.security.SessionUser;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@RestController @RequestMapping("/api/v1/calendar") public class CalendarController {
 private final CalendarService service;public CalendarController(CalendarService service){this.service=service;}
 @GetMapping("/events") public List<PaymentEvent> events(@RequestParam int year,@RequestParam int month,HttpSession session){return service.events(SessionUser.require(session),year,month);}
}
