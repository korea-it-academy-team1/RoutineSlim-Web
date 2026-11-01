import { apiRequest } from "../../global/api/apiClient";

export function getProfile() {
  return apiRequest("/api/v1/members/me");
}

export function updateProfile(profile) {
  return apiRequest("/api/v1/members/me", {
    method: "PUT",
    body: {
      displayName: profile.displayName,
      email: profile.email,
      phone: profile.phone,
      birth: profile.birth,
      address: profile.address,
      addressDetail: profile.addressDetail,
      photo: profile.photo,
    },
  });
}

export function sendEmailChangeCode(emailDraft, emailPassword) {
  return apiRequest("/api/v1/members/me/email/send", {
    method: "POST",
    body: { email: emailDraft, currentPassword: emailPassword },
  });
}

export function changeEmail(emailDraft, emailPassword, emailProof, emailCode) {
  return apiRequest("/api/v1/members/me/email", {
    method: "PUT",
    body: {
      email: emailDraft,
      currentPassword: emailPassword,
      verificationId: emailProof,
      code: emailCode,
    },
  });
}

export function changePassword(currentPassword, newPassword) {
  return apiRequest("/api/password", {
    method: "PUT",
    body: { currentPassword, password: newPassword },
  });
}

export function deleteAccount() {
  return apiRequest("/api/me", { method: "DELETE" });
}

export function restoreSubscriptions(items) {
  return apiRequest("/api/data/subscriptions", {
    method: "PUT",
    body: { json: JSON.stringify(items) },
  });
}

export function getSetting(name) {
  return apiRequest("/api/data/setting-" + name);
}

export function migrateSetting(name, current) {
  return apiRequest("/api/data/setting-" + name, {
    method: "PUT",
    body: { json: JSON.stringify(current) },
  });
}

export function saveSetting(name, next) {
  return apiRequest("/api/data/setting-" + name, {
    method: "PUT",
    body: { json: JSON.stringify(next) },
  });
}
