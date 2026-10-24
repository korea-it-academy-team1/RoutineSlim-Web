package kr.routineslim.repository;

import java.util.*;
import kr.routineslim.entity.CommunityLike;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommunityLikeRepository extends JpaRepository<CommunityLike, Long> {
  boolean existsByPostIdAndUserId(Long postId, String userId);

  void deleteByPostIdAndUserId(Long postId, String userId);

  void deleteByPostId(Long postId);

  void deleteByUserId(String userId);

  long countByPostId(Long postId);
}
