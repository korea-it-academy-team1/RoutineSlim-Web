package kr.routineslim.integration;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import kr.routineslim.service.AuthenticationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = "routineslim.admin-id=api_admin")
@AutoConfigureMockMvc
@Transactional
class CommunityApiTest {
  @Autowired MockMvc mvc;
  @Autowired ObjectMapper json;
  @Autowired AuthenticationService auth;
  @Autowired kr.routineslim.service.CommunityPostService community;

  private MockHttpServletRequestBuilder secure(MockHttpServletRequestBuilder request)
      throws Exception {
    var response = mvc.perform(get("/api/csrf")).andReturn().getResponse();
    String token = json.readTree(response.getContentAsString()).get("token").asText();
    return request.cookie(new Cookie("XSRF-TOKEN", token)).header("X-XSRF-TOKEN", token);
  }

  @Test
  void apiRequiresSessionAndCsrf() throws Exception {
    mvc.perform(get("/api/v1/community/posts")).andExpect(status().isUnauthorized());
    mvc.perform(post("/api/v1/community/posts").contentType("application/json").content("{}"))
        .andExpect(status().isForbidden());
  }

  @Test
  void commentCrudAndLikeStateThroughHttp() throws Exception {
    auth.register("api_author", "password123");
    var session = new MockHttpSession();
    session.setAttribute("user", "api_author");
    var response =
        mvc.perform(
                secure(
                    post("/api/v1/community/posts")
                        .session(session)
                        .contentType("application/json")
                        .content(
                            "{\"title\":\"title\",\"category\":\"category\",\"content\":\"body\",\"tags\":[\"tag\"]}")))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse();
    long id = json.readTree(response.getContentAsString()).get("id").asLong();
    String path = "/api/v1/community/posts/" + id;
    mvc.perform(secure(post(path + "/likes/toggle").session(session)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.liked").value(true));
    mvc.perform(get(path + "/likes/count").session(session))
        .andExpect(jsonPath("$.likes").value(1))
        .andExpect(jsonPath("$.liked").value(true));
    var created =
        mvc.perform(
                secure(
                    post(path + "/comments")
                        .session(session)
                        .contentType("application/json")
                        .content("{\"content\":\"comment\"}")))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse();
    long commentId = json.readTree(created.getContentAsString()).get("id").asLong();
    mvc.perform(
            secure(
                put(path + "/comments/" + commentId)
                    .session(session)
                    .contentType("application/json")
                    .content("{\"content\":\"edited\"}")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content").value("edited"));
    auth.register("another_author", "password123");
    var stranger = new MockHttpSession();
    stranger.setAttribute("user", "another_author");
    mvc.perform(secure(delete(path + "/comments/" + commentId).session(stranger)))
        .andExpect(status().isNotFound());
    mvc.perform(secure(delete(path + "/comments/" + commentId).session(session)))
        .andExpect(status().isOk());
    mvc.perform(get(path + "/comments").session(session))
        .andExpect(jsonPath("$.length()").value(0));
  }

  @Test
  void postApiRejectsInvalidImageBytes() throws Exception {
    auth.register("author", "password123");
    var session = new MockHttpSession();
    session.setAttribute("user", "author");
    mvc.perform(
            secure(
                post("/api/v1/community/posts")
                    .session(session)
                    .contentType("application/json")
                    .content(
                        "{\"title\":\"title\",\"category\":\"category\",\"content\":\"body\",\"images\":[\"data:image/png;base64,PHNjcmlwdD4=\"]}")))
        .andExpect(status().isBadRequest());
  }

  @Test
  void moderationIsRestrictedAndCanRemoveReportedPosts() throws Exception {
    auth.register("api_admin", "password123");
    auth.register("api_reporter", "password123");
    var admin = new MockHttpSession();
    admin.setAttribute("user", "api_admin");
    var reporter = new MockHttpSession();
    reporter.setAttribute("user", "api_reporter");
    var post =
        community.create(
            "api_reporter", new kr.routineslim.dto.PostRequest("reported", "category", "body"));
    mvc.perform(
            secure(
                post("/api/v1/community/posts/" + post.id + "/reports")
                    .session(reporter)
                    .contentType("application/json")
                    .content("{\"reason\":\"spam\"}")))
        .andExpect(status().isOk());
    mvc.perform(get("/api/v1/community/moderation").session(reporter))
        .andExpect(jsonPath("$.admin").value(false));
    mvc.perform(get("/api/v1/community/reports").session(reporter))
        .andExpect(status().isForbidden());
    mvc.perform(get("/api/v1/community/reports").session(admin))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].reason").value("spam"));
    mvc.perform(secure(delete("/api/v1/community/moderation/posts/" + post.id).session(reporter)))
        .andExpect(status().isForbidden());
    mvc.perform(secure(delete("/api/v1/community/moderation/posts/" + post.id).session(admin)))
        .andExpect(status().isOk());
    mvc.perform(get("/api/v1/community/posts/" + post.id).session(reporter))
        .andExpect(status().isNotFound());
  }

  @Test
  void deletedMembersCannotUseOtherExistingSessions() throws Exception {
    auth.register("api_deleted", "password123");
    var session = new MockHttpSession();
    session.setAttribute("user", "api_deleted");
    auth.delete("api_deleted");
    mvc.perform(get("/api/v1/community/posts").session(session))
        .andExpect(status().isUnauthorized());
  }
}
