package kr.routineslim.repository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.util.*;
@Repository public class MemberRepository {
 private final JdbcTemplate db;
 private final kr.routineslim.repository.SubscriptionRepository subscriptions;
 private final kr.routineslim.repository.PaymentRecordRepository payments;
 private final kr.routineslim.repository.CommunityPostRepository posts;
 private final kr.routineslim.repository.CommunityCommentRepository comments;
 private final kr.routineslim.repository.CommunityLikeRepository likes;
 private final kr.routineslim.repository.CommunityReportRepository reports;
 public MemberRepository(JdbcTemplate db, kr.routineslim.repository.SubscriptionRepository subscriptions,
     kr.routineslim.repository.PaymentRecordRepository payments,
     kr.routineslim.repository.CommunityPostRepository posts,
     kr.routineslim.repository.CommunityCommentRepository comments,
     kr.routineslim.repository.CommunityLikeRepository likes,
     kr.routineslim.repository.CommunityReportRepository reports) {
  this.db=db;this.subscriptions=subscriptions;this.payments=payments;
  this.posts=posts;this.comments=comments;this.likes=likes;this.reports=reports;
 }
 public Optional<String> passwordHash(String id){var rows=db.queryForList("SELECT password_hash FROM app_users WHERE id=?",id);return rows.isEmpty()?Optional.empty():Optional.of(String.valueOf(rows.get(0).get("password_hash")));}
 public void create(String id,String hash){db.update("INSERT INTO app_users(id,password_hash,display_name,email,profile_json) VALUES(?,?,?,?,?)",id,hash,id,id.contains("@")?id:"","{}");}
 public kr.routineslim.dto.MemberProfileResponse profile(String id){
  var rows=db.queryForList("SELECT id,display_name,email FROM app_users WHERE id=?",id);
  if(rows.isEmpty())throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND,"Member not found");
  var row=rows.get(0);
  return new kr.routineslim.dto.MemberProfileResponse(String.valueOf(row.get("id")),String.valueOf(row.get("display_name")),row.get("email")==null?"":String.valueOf(row.get("email")));
 }
 public void updateProfile(String id,String displayName,String email){
  int changed=db.update("UPDATE app_users SET display_name=?,email=? WHERE id=?",displayName,email,id);
  if(changed!=1)throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND,"Member not found");
 }
 public void changePassword(String id,String hash){db.update("UPDATE app_users SET password_hash=? WHERE id=?",hash,id);}
 public void delete(String id){
  // Remove dependents before the member record, within AuthService's transaction.
  for(var post:posts.findByAuthorId(id)){
   comments.deleteByPostId(post.id);
   likes.deleteByPostId(post.id);
   reports.deleteByPostId(post.id);
  }
  comments.deleteByAuthorId(id);
  likes.deleteByUserId(id);
  reports.deleteByReporterId(id);
  posts.deleteAll(posts.findByAuthorId(id));
  payments.deleteByUserId(id);
  subscriptions.deleteByUserId(id);
  db.update("DELETE FROM user_data WHERE user_id=?",id);
  db.update("DELETE FROM app_users WHERE id=?",id);
 }
}
