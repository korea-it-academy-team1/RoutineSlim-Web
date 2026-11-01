import { parsePostTags } from "./parseTags";
import { apiRequest } from "../../global/api/apiClient";

export function deleteActivity(tab, x) {
  return apiRequest(
    "/api/v1/community/posts/" + (tab === "comments" ? x.postId + "/comments/" + x.id : x.id),
    { method: "DELETE" },
  );
}

export function toggleActivityPostLike(x) {
  return apiRequest(`/api/v1/community/posts/${x.id}/likes/toggle`, {
    method: "POST",
  });
}

export function getActivityPath() {
  return "/api/v1/activity/me";
}

export function getPosts() {
  return apiRequest("/api/v1/community/posts");
}

export function getInitialPost(initialPostId) {
  return apiRequest("/api/v1/community/posts/" + encodeURIComponent(initialPostId));
}

export function getPost(post) {
  return apiRequest(`/api/v1/community/posts/${post.id}`);
}

export function getPostComments(post) {
  return apiRequest(`/api/v1/community/posts/${post.id}/comments`);
}

export function getPostLikeCount(post) {
  return apiRequest(`/api/v1/community/posts/${post.id}/likes/count`);
}

export function recordPostView(post) {
  return apiRequest(`/api/v1/community/posts/${post.id}/views`, {
    method: "POST",
  });
}

export function createPost(draft) {
  return apiRequest("/api/v1/community/posts", {
    method: "POST",
    body: {
      ...draft,
      tags: parsePostTags(draft.tags),
    },
  });
}

export function updatePost(selected, edit) {
  return apiRequest(`/api/v1/community/posts/${selected.id}`, {
    method: "PUT",
    body: {
      ...edit,
      tags: parsePostTags(edit.tags),
    },
  });
}

export function createComment(selected, value) {
  return apiRequest(`/api/v1/community/posts/${selected.id}/comments`, {
    method: "POST",
    body: { content: value },
  });
}

export function updateComment(selected, c, value) {
  return apiRequest(`/api/v1/community/posts/${selected.id}/comments/${c.id}`, {
    method: "PUT",
    body: { content: value.trim() },
  });
}

export function deleteComment(selected, c) {
  return apiRequest(`/api/v1/community/posts/${selected.id}/comments/${c.id}`, {
    method: "DELETE",
  });
}

export function togglePostLike(selected) {
  return apiRequest(`/api/v1/community/posts/${selected.id}/likes/toggle`, {
    method: "POST",
  });
}

export function reportPost(selected, reason) {
  return apiRequest(`/api/v1/community/posts/${selected.id}/reports`, {
    method: "POST",
    body: { reason: reason.trim() },
  });
}

export function deletePost(selected) {
  return apiRequest(`/api/v1/community/posts/${selected.id}`, {
    method: "DELETE",
  });
}

export function saveDraft(draft) {
  return apiRequest("/api/v1/community/draft", {
    method: "PUT",
    body: draft,
  });
}

export function getDraft() {
  return apiRequest("/api/v1/community/draft");
}

export function restoreDraft(saved) {
  return apiRequest("/api/v1/community/draft", {
    method: "PUT",
    body: saved,
  });
}

export function deleteDraft() {
  return apiRequest("/api/v1/community/draft", {
    method: "DELETE",
  });
}
