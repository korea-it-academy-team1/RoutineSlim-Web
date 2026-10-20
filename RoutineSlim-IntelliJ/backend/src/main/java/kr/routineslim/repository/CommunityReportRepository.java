package kr.routineslim.repository;
import kr.routineslim.entity.CommunityReport;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface CommunityReportRepository extends JpaRepository<CommunityReport,Long>{boolean existsByPostIdAndReporterId(Long postId,String reporterId);List<CommunityReport> findByStatusOrderByCreatedAtDesc(String status);void deleteByPostId(Long postId);void deleteByReporterId(String reporterId);}
