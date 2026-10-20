package kr.routineslim.controller;
import kr.routineslim.security.SessionUser;
import kr.routineslim.entity.Subscription;
import kr.routineslim.repository.SubscriptionRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.web.bind.annotation.*;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
@RestController @RequestMapping("/api/v1/reminders") public class ReminderController {
 private final SubscriptionRepository subscriptions;
 public ReminderController(SubscriptionRepository subscriptions){this.subscriptions=subscriptions;}
 public record Reminder(Long subscriptionId,String name,String date,long amount,long daysUntil,String type){}
 private static LocalDate annualDate(LocalDate anchor,int year){return LocalDate.of(year,anchor.getMonthValue(),Math.min(anchor.getDayOfMonth(),YearMonth.of(year,anchor.getMonthValue()).lengthOfMonth()));}
 @GetMapping public List<Reminder> upcoming(HttpSession session){
  String user=SessionUser.require(session);LocalDate today=LocalDate.now();List<Reminder> out=new ArrayList<>();
  for(Subscription s:subscriptions.findByUserIdOrderByIdDesc(user)){
   if(!"active".equals(s.status)||s.day<1||s.day>31||s.amount<0)continue;
   LocalDate anchor=s.billingAnchorDate!=null?s.billingAnchorDate:today;
   LocalDate next;
   if("yearly".equals(s.cycle)){
    next=annualDate(anchor,today.getYear());if(next.isBefore(today))next=annualDate(anchor,today.getYear()+1);
   }else if("weekly".equals(s.cycle)){
    long weeks=Math.max(0,(ChronoUnit.DAYS.between(anchor,today)+6)/7);next=anchor.plusWeeks(weeks);
   }else{
    next=today.withDayOfMonth(Math.min(s.day,today.lengthOfMonth()));
    if(next.isBefore(today)){LocalDate month=today.plusMonths(1);next=month.withDayOfMonth(Math.min(s.day,month.lengthOfMonth()));}
   }
   long days=ChronoUnit.DAYS.between(today,next);
   if(days<=7)out.add(new Reminder(s.id,s.name,next.toString(),s.amount,days,days==0?"오늘 결제 예정":days<=1?"내일 결제 예정":"결제 예정"));
  }
  out.sort(Comparator.comparingLong(Reminder::daysUntil));return out;
 }
}
