package kr.routineslim.repository;
import kr.routineslim.entity.CommunityPost;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface CommunityPostRepository extends JpaRepository<CommunityPost,Long>{ List<CommunityPost> findAllByOrderByCreatedAtDesc(); java.util.Optional<CommunityPost> findByIdAndAuthorId(Long id,String authorId); List<CommunityPost> findByAuthorId(String authorId); }
