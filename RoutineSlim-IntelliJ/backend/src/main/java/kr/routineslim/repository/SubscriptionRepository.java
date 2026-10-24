package kr.routineslim.repository;

import java.util.List;
import java.util.Optional;
import kr.routineslim.entity.Subscription;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SubscriptionRepository extends JpaRepository<Subscription, Long> {
  List<Subscription> findByUserIdOrderByIdDesc(String userId);

  @org.springframework.data.jpa.repository.Modifying
  @org.springframework.data.jpa.repository.Query(
      "delete from Subscription s where s.userId = :userId")
  void deleteByUserId(@org.springframework.data.repository.query.Param("userId") String userId);

  Optional<Subscription> findByIdAndUserId(Long id, String userId);
}
