package kr.routineslim.repository;

import java.util.*;
import kr.routineslim.entity.CommunityReport;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommunityReportRepository extends JpaRepository<CommunityReport, Long> {
  boolean existsByPostIdAndReporterId(Long postId, String reporterId);

  List<CommunityReport> findByStatusOrderByCreatedAtDesc(String status);

  void deleteByPostId(Long postId);

  void deleteByReporterId(String reporterId);
}
