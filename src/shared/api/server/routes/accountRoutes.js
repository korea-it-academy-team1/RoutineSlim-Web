import { unsupported } from "../unsupportedFeature";
import { client, request } from "../serverConnection";
import { clearMemberSession, storeMemberSession, isMemberRemembered } from "../memberSession";
export async function accountRoutes({ path, method, body }) {
  if (path === "/api/signup" && method === "POST") return client.signup(body);
  if (path === "/api/login" && method === "POST") {
    const id = await client.login({ memberName: body.id, memberPassword: body.password });
    return storeMemberSession(id, body.rememberMe);
  }
  if (path === "/api/me" && method === "GET") {
    let profile;
    try {
      profile = await request("/users/me");
    } catch (error) {
      if ([400, 404].includes(error.status)) {
        clearMemberSession();
        window.dispatchEvent(new Event("routineslim:unauthorized"));
      }
      throw error;
    }
    return storeMemberSession(profile.memberId, isMemberRemembered());
  }
  if (path === "/api/logout" && method === "POST") {
    clearMemberSession();
    return null;
  }
  if (path === "/api/me" && method === "DELETE") {
    await request("/users/withdrawUser", { method: "DELETE" });
    clearMemberSession();
    return null;
  }
  if (path === "/api/v1/members/me") {
    if (method === "PUT") {
      const current = await request("/users/getMyInfo");
      await request("/users/updateMyInfo", {
        method: "PUT",
        body: {
          name: body.displayName,
          email: body.email ?? current.email,
          phone: body.phone ?? current.phone,
        },
      });
    } else if (method !== "GET") return unsupported(path);
    const profile = await request("/users/getMyInfo");
    return {
      ...profile,
      id: profile.memberName,
      displayName: profile.name,
      emailVerified: false,
      limitedProfile: true,
    };
  }
  if (path.startsWith("/api/data/setting-")) {
    const name = path.slice("/api/data/setting-".length);
    if (!["budget", "reminder-days"].includes(name)) return unsupported(path);
    const profile = await request("/users/getMyInfo");
    if (method === "PUT") {
      const value = JSON.parse(body.json);
      if (name === "budget") {
        const amount = value === "" || value === null ? null : Number(value);
        if (amount !== null && (!Number.isSafeInteger(amount) || amount < 0 || amount > 2147483647))
          throw new Error("월 예산은 0~2,147,483,647원으로 입력해주세요.");
        await request("/users/monthly-budget", { method: "PUT", body: { monthlyBudget: amount } });
      } else {
        const days = Number(value);
        if (![0, 1, 3, 7].includes(days)) throw new Error("알림 일수를 확인해주세요.");
        await request("/users/notification-settings", {
          method: "PUT",
          body: {
            defaultNotificationDays: days,
            notificationTime: profile.notificationTime || "09:00:00",
          },
        });
      }
      return { json: JSON.stringify(value) };
    }
    if (method !== "GET") return unsupported(path);
    return {
      json: JSON.stringify(
        name === "budget"
          ? profile.monthlyBudget == null
            ? ""
            : String(profile.monthlyBudget)
          : profile.defaultNotificationDays,
      ),
    };
  }
}
