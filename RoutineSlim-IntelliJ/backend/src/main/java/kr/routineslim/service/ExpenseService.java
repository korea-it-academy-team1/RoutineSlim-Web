package kr.routineslim.service;

import kr.routineslim.dto.ExpenseSummary;
import kr.routineslim.entity.Subscription;
import kr.routineslim.repository.SubscriptionRepository;
import org.springframework.stereotype.Service;
import java.util.*;

@Service
public class ExpenseService {
 private final SubscriptionRepository repo;

 public ExpenseService(SubscriptionRepository repo){
  this.repo = repo;
 }

 public static double monthly(Subscription s){
  return "yearly".equals(s.cycle) ? s.amount / 12.0 : "weekly".equals(s.cycle) ? s.amount * 52.0 / 12.0 : s.amount;
 }

 public ExpenseSummary summary(String user){
  var items = repo.findByUserIdOrderByIdDesc(user);
  Map<String, Double> by = new TreeMap<>();
  double total = 0;

  for(var s : items){
   if(!"active".equals(s.status)) continue;
   double amount = monthly(s);
   total += amount;
   by.merge(s.category, amount, Double::sum);
  }

  // .count()의 결과인 long을 (int)로 캐스팅하여 에러 해결
  int activeCount = (int) items.stream().filter(s -> "active".equals(s.status)).count();

  return new ExpenseSummary(total, total * 12, activeCount, by);
 }
}
