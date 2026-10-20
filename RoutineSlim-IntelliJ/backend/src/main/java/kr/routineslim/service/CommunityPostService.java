package kr.routineslim.service;
import kr.routineslim.dto.CommentRequest;
import kr.routineslim.dto.PostRequest;
import kr.routineslim.entity.CommunityComment;
import kr.routineslim.entity.CommunityLike;
import kr.routineslim.entity.CommunityPost;
import kr.routineslim.entity.CommunityReport;
import kr.routineslim.repository.CommunityCommentRepository;
import kr.routineslim.repository.CommunityLikeRepository;
import kr.routineslim.repository.CommunityPostRepository;
import kr.routineslim.repository.CommunityReportRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
@Service public class CommunityPostService {
 private final CommunityReportRepository reports;private final CommunityPostRepository posts;private final CommunityCommentRepository comments;private final CommunityLikeRepository likes;
 public CommunityPostService(CommunityPostRepository posts,CommunityCommentRepository comments,CommunityLikeRepository likes,CommunityReportRepository reports){this.reports=reports;this.posts=posts;this.comments=comments;this.likes=likes;}
 public List<CommunityPost> list(){return posts.findAllByOrderByCreatedAtDesc();}
 public CommunityPost get(Long id){return posts.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));}
 @Transactional public CommunityPost create(String user,PostRequest r){return posts.save(new CommunityPost(user,r.title().trim(),r.category().trim(),r.content().trim()));}
 @Transactional public CommunityPost update(String user,Long id,PostRequest r){var post=posts.findByIdAndAuthorId(id,user).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));post.title=r.title().trim();post.category=r.category().trim();post.content=r.content().trim();return posts.save(post);}
 @Transactional public void delete(String user,Long id){var post=posts.findByIdAndAuthorId(id,user).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));comments.deleteByPostId(id);likes.deleteByPostId(id);reports.deleteByPostId(id);posts.delete(post);}
 public List<CommunityComment> comments(Long postId){get(postId);return comments.findByPostIdOrderByCreatedAtAsc(postId);}
 @Transactional public CommunityComment comment(String user,Long postId,CommentRequest r){get(postId);return comments.save(new CommunityComment(postId,user,r.content().trim()));}
 @Transactional public boolean toggleLike(String user,Long postId){get(postId);if(likes.existsByPostIdAndUserId(postId,user)){likes.deleteByPostIdAndUserId(postId,user);return false;}likes.save(new CommunityLike(postId,user));return true;}
 public long likeCount(Long postId){get(postId);return likes.countByPostId(postId);}
}
