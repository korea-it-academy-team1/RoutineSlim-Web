export function getApiConfig() {
  const mode = import.meta.env.VITE_API_MODE || "server-dev";
  if (!["server-dev", "original"].includes(mode)) {
    throw new Error("VITE_API_MODE는 server-dev 또는 original로 설정해주세요.");
  }
  return {
    mode,
    baseUrl: (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, ""),
  };
}
