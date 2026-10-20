package kr.routineslim.repository;
import kr.routineslim.entity.PaymentRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
public interface PaymentRecordRepository extends JpaRepository<PaymentRecord,Long>{
 List<PaymentRecord> findByUserIdAndPaidOnBetweenOrderByPaidOnDescIdDesc(String userId,LocalDate start,LocalDate end);
 java.util.Optional<PaymentRecord> findByIdAndUserId(Long id,String userId);
 void deleteByUserId(String userId);
}
