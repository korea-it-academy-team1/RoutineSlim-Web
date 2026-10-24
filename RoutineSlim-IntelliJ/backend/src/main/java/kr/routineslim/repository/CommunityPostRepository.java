package kr.routineslim.repository;

import java.util.*;
import kr.routineslim.entity.CommunityPost;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommunityPostRepository extends JpaRepository<CommunityPost, Long> {
  List<CommunityPost> findAllByOrderByCreatedAtDesc();

  java.util.Optional<CommunityPost> findByIdAndAuthorId(Long id, String authorId);

  List<CommunityPost> findByAuthorId(String authorId);
}
