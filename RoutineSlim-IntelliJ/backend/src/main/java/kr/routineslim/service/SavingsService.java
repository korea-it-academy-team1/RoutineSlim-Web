package kr.routineslim.service;

import kr.routineslim.dto.SavingsSummary;
import org.springframework.stereotype.Service;

@Service
public class SavingsService {
  private final SubscriptionService subs;

  public SavingsService(SubscriptionService subs) {
    this.subs = subs;
  }

  public SavingsSummary summary(String user) {
    var all = subs.list(user);
    long total = 0, review = 0;
    int count = 0;
    for (var s : all) {
      long monthly =
          Math.round(
              s.amount()
                  * ("yearly".equals(s.cycle())
                      ? 1.0 / 12
                      : "weekly".equals(s.cycle()) ? 52.0 / 12 : 1));
      total += monthly;
      if ("review".equals(s.status())) {
        review += monthly;
        count++;
      }
    }
    return new SavingsSummary(total, review, review * 12, all.size(), count);
  }
}
