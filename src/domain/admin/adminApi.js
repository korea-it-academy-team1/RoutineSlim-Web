import { apiRequest } from "../../global/api/apiClient";

export function getModerationAccess() {
  return apiRequest("/api/v1/community/moderation");
}

export function getResourcePath(tab, kind, query, page) {
  return tab === "members"
    ? `/api/v1/admin/members?query=${encodeURIComponent(query)}&page=${page}&size=20`
    : tab === "inquiries"
      ? "/api/v1/admin/inquiries"
      : kind
        ? "/api/v1/admin/content/" + kind
        : null;
}

export function saveResource(tab, kind, form) {
  let url, body;
  if (tab === "inquiries") {
    url = "/api/v1/admin/inquiries/" + form.id + "/answer";
    body = { answer: form.answer };
  } else if (tab === "plans") {
    url = "/api/v1/admin/plans" + (form.id ? "/" + form.id : "");
    body = {
      service: form.service,
      plan: form.plan,
      category: form.category,
      amount: Number(form.amount),
      cycle: form.cycle,
      features: form.featuresText
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean),
      sourceUrl: form.sourceUrl || "",
      active: form.active,
    };
  } else {
    url = "/api/v1/admin/content/" + kind + (form.id ? "/" + form.id : "");
    body = {
      title: form.title,
      category: form.category,
      content: form.content,
      published: form.published,
    };
  }
  return apiRequest(url, { method: form.id ? "PUT" : "POST", body });
}

export function deleteContent(kind, x) {
  return apiRequest("/api/v1/admin/content/" + kind + "/" + x.id, {
    method: "DELETE",
  });
}

export function setMemberSuspension(x) {
  return apiRequest(`/api/v1/admin/members/${encodeURIComponent(x.id)}/suspension`, {
    method: "PUT",
    body: { suspended: !x.suspended },
  });
}

export function getAdminOverviewPath() {
  return "/api/v1/admin/overview";
}

export function getReports() {
  return apiRequest("/api/v1/community/reports");
}

export function resolveReport(report) {
  return apiRequest(`/api/v1/community/reports/${report.id}/resolve`, {
    method: "POST",
  });
}

export function setPostHidden(report) {
  return apiRequest(`/api/v1/community/moderation/posts/${report.postId}`, {
    method: "DELETE",
  });
}
