package kr.routineslim.repository;

import java.time.LocalDate;
import java.util.List;
import kr.routineslim.entity.PaymentRecord;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PaymentRecordRepository extends JpaRepository<PaymentRecord, Long> {
  List<PaymentRecord> findByUserIdAndPaidOnBetweenOrderByPaidOnDescIdDesc(
      String userId, LocalDate start, LocalDate end);

  java.util.Optional<PaymentRecord> findByIdAndUserId(Long id, String userId);

  List<PaymentRecord> findByUserIdAndSubscriptionId(String userId, Long subscriptionId);

  void deleteByUserId(String userId);
}
