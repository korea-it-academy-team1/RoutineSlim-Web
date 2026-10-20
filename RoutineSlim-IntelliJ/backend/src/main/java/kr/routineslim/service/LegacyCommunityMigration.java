package kr.routineslim.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import kr.routineslim.entity.CommunityComment;
import kr.routineslim.entity.CommunityLike;
import kr.routineslim.entity.CommunityPost;
import kr.routineslim.entity.CommunityReport;
import kr.routineslim.repository.CommunityCommentRepository;
import kr.routineslim.repository.CommunityLikeRepository;
import kr.routineslim.repository.CommunityPostRepository;
import kr.routineslim.repository.CommunityReportRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** One-time migration. The original JSON remains available as a backup. */
@Component
public class LegacyCommunityMigration implements ApplicationRunner {
 private final JdbcTemplate db;
 private final ObjectMapper mapper;
 private final CommunityPostRepository posts;
 private final CommunityCommentRepository comments;
 private final CommunityLikeRepository likes;
 public LegacyCommunityMigration(JdbcTemplate db,ObjectMapper mapper,CommunityPostRepository posts,CommunityCommentRepository comments,CommunityLikeRepository likes){
  this.db=db;this.mapper=mapper;this.posts=posts;this.comments=comments;this.likes=likes;
 }
 @Override @Transactional public void run(ApplicationArguments args) throws Exception {
  if(!db.queryForList("SELECT data_key FROM community_data WHERE data_key='jpa_migration_v1'").isEmpty())return;
  var rows=db.queryForList("SELECT json_value FROM community_data WHERE data_key='posts'");
  if(rows.isEmpty()){db.update("INSERT INTO community_data(data_key,json_value) VALUES('jpa_migration_v1','empty')");return;}
  JsonNode root=mapper.readTree(String.valueOf(rows.get(0).get("json_value")));
  if(!root.isArray())return;
  for(JsonNode item:root){
   String owner=item.path("owner").asText("").trim();
   String title=item.path("title").asText("").trim();
   String category=item.path("category").asText("생활/기타").trim();
   String content=item.path("content").asText("").trim();
   if(owner.isBlank()||title.isBlank()||content.isBlank())continue;
   CommunityPost post=posts.save(new CommunityPost(owner,limit(title,120),limit(category,40),limit(content,5000)));
   JsonNode cs=item.path("comments");
   if(cs.isArray())for(JsonNode c:cs){String author=c.path("author").asText("").trim(),body=c.path("text").asText("").trim();if(!author.isBlank()&&!body.isBlank())comments.save(new CommunityComment(post.id,limit(author,120),limit(body,2000)));}
   JsonNode users=item.path("likedBy");
   if(users.isArray())for(JsonNode u:users){String user=u.asText("").trim();if(!user.isBlank()&&user.length()<=120&&!likes.existsByPostIdAndUserId(post.id,user))likes.save(new CommunityLike(post.id,user));}
  }
  db.update("INSERT INTO community_data(data_key,json_value) VALUES('jpa_migration_v1','done')");
 }
 private String limit(String text,int n){return text.length()<=n?text:text.substring(0,n);}
}
