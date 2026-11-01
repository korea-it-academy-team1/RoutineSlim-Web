import { createRoutineSlimApiClient } from "./routineSlimApiClient";
/** Optional bridge to the supplied Server-dev contract; never invents missing server data. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SESSION_KEY = "routineslim.server-dev.member.v1";
let memoryId = null;
const unsupported = (path) => {
  const error = new Error("현재 연결된 서버에서 이 기능을 지원하지 않습니다.");
  error.code = "API_NOT_AVAILABLE";
  error.endpoint = path;
  throw error;
};
function categoryMap() {
  try {
    return JSON.parse(import.meta.env.VITE_SERVER_CATEGORY_IDS || "{}");
  } catch {
    throw new Error("VITE_SERVER_CATEGORY_IDS의 JSON 형식을 확인해주세요.");
  }
}
function currentId() {
  if (memoryId) return memoryId;
  try {
    return sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}
function clearSession() {
  memoryId = null;
  for (const storage of [sessionStorage, localStorage]) {
    try {
      storage.removeItem(SESSION_KEY);
    } catch {
      /* Memory is still cleared. */
    }
  }
}
function signedInId() {
  const id = currentId();
  if (!id || !UUID.test(id)) {
    clearSession();
    window.dispatchEvent(new Event("routineslim:unauthorized"));
    throw new Error("로그인이 필요합니다.");
  }
  return id;
}
const client = createRoutineSlimApiClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL || "",
  getMemberId: signedInId,
  onUnauthorized: () => {
    clearSession();
    window.dispatchEvent(new Event("routineslim:unauthorized"));
  },
});
const send = (path, options) => client.request(path, options);

function toWeb(row) {
  const categories = categoryMap();
  const category = Object.keys(categories).find(
    (key) => Number(categories[key]) === row.categoryId,
  );
  return {
    ...row,
    category: category || `카테고리 ${row.categoryId}`,
    cycle: row.billingCycle?.toLowerCase(),
    day: row.billingDay,
    billingAnchorDate: row.startDate,
    status: row.status === "ACTIVE" ? "active" : row.status.toLowerCase(),
  };
}
function toServer(body, existing) {
  if (body.status && body.status !== "active")
    throw new Error(
      "첨부 서버는 원본 웹의 절약 검토(review) 상태를 지원하지 않습니다. 서버에 별도 필드를 추가해야 합니다.",
    );
  const categoryId = Number(
    categoryMap()[body.category] ??
      (existing && body.category === existing.category ? existing.categoryId : NaN),
  );
  if (!Number.isSafeInteger(categoryId) || categoryId < 1)
    throw new Error("선택한 카테고리의 실제 서버 ID를 VITE_SERVER_CATEGORY_IDS에 설정해주세요.");
  const billingCycle = { monthly: "MONTHLY", yearly: "YEARLY", weekly: "WEEKLY" }[body.cycle];
  if (!billingCycle) throw new Error("지원하지 않는 결제 주기입니다.");
  const startDate = body.billingAnchorDate;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate || ""))
    throw new Error("올바른 기준일을 선택해주세요.");
  if (billingCycle === "MONTHLY" && Number(body.day) !== Number(startDate.slice(8)))
    throw new Error(
      "첨부 서버는 기준일의 날짜를 결제일로 사용합니다. 기준일과 결제일을 맞춰주세요.",
    );
  if (existing && existing.status !== "active")
    throw new Error(
      "체험·정지·해지 상태는 원본 웹의 상태와 달라 이 화면에서 변경할 수 없습니다. 서버 상태 API를 사용해주세요.",
    );
  if (existing && existing.cycleInterval !== 1)
    throw new Error("첨부 서버의 다중 결제 간격은 원본 웹에서 편집할 수 없습니다.");
  const name = String(body.name || "").trim();
  if (!name || name.length > 100) throw new Error("서비스 이름은 1~100자로 입력해주세요.");
  if (!Number.isSafeInteger(body.amount) || body.amount < 0 || body.amount > 2147483647)
    throw new Error("결제 금액은 0~2,147,483,647원의 정수로 입력해주세요.");
  return {
    name,
    categoryId,
    amount: body.amount,
    billingCycle,
    startDate,
    presetId: existing?.presetId ?? null,
    cardId: existing?.cardId ?? null,
    currency: existing?.currency ?? "KRW",
    cycleInterval: 1,
    trialEndDate: existing?.trialEndDate ?? null,
    notifyEnabled: existing?.notifyEnabled ?? true,
    notifyDaysBefore: existing?.notifyDaysBefore ?? null,
    memo: existing?.memo ?? null,
  };
}
export async function requestServerApi(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const body = options.body;
  if (path === "/api/login" && method === "POST") {
    const id = await client.login({ memberName: body.id, memberPassword: body.password });
    clearSession();
    memoryId = id;
    try {
      (body.rememberMe ? localStorage : sessionStorage).setItem(SESSION_KEY, id);
    } catch {
      /* Current tab still works. */
    }
    return { id };
  }
  if (path === "/api/me" && method === "GET") return { id: signedInId() };
  if (path === "/api/logout" && method === "POST") {
    clearSession();
    return null;
  }
  const match = path.match(/^\/api\/v1\/subscriptions(?:\/([a-zA-Z0-9-]+))?$/);
  if (match) {
    const id = match[1];
    if (id && !UUID.test(id)) throw new Error("올바른 구독 UUID가 아닙니다.");
    if (method === "GET") {
      const result = await send(path);
      return id ? toWeb(result) : result.filter((s) => s.status === "ACTIVE").map(toWeb);
    }
    if (method === "POST" && !id)
      return toWeb(await send(path, { method, body: { ...toServer(body), status: "ACTIVE" } }));
    if (method === "PUT" && id) {
      const existing = toWeb(await send(path));
      return toWeb(await send(path, { method, body: toServer(body, existing) }));
    }
    if (method === "DELETE" && id) return send(path, { method });
  }
  return unsupported(path);
}
