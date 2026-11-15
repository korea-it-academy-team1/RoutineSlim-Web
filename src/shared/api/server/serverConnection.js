import { createServerClient } from "../serverClient";
import { requireMemberId, clearMemberSession } from "./memberSession";
export const client = createServerClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL || "",
  getMemberId: requireMemberId,
  onUnauthorized: () => {
    clearMemberSession();
    window.dispatchEvent(new Event("routineslim:unauthorized"));
  },
});
export const request = (path, options) => client.request(path, options);
