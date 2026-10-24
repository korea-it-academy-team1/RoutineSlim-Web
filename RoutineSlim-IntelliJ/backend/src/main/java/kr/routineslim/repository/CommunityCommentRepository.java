package kr.routineslim.repository;

import java.util.*;
import kr.routineslim.entity.CommunityComment;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommunityCommentRepository extends JpaRepository<CommunityComment, Long> {
  List<CommunityComment> findByPostIdOrderByCreatedAtAsc(Long postId);

  void deleteByPostId(Long postId);

  void deleteByAuthorId(String authorId);
}
