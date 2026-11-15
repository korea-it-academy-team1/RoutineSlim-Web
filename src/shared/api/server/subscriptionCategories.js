// IDs documented in the supplied server's PaymentDTO and seeded by V2.
// Override for an existing database with different IDs; there is no category-list API.
const defaults = { "OTT/영상": 1, 음악: 2, 클라우드: 3, 쇼핑: 4 };
export function getCategoryIds() {
  let overrides;
  try {
    overrides = JSON.parse(import.meta.env.VITE_SERVER_CATEGORY_IDS || "{}");
  } catch {
    throw new Error("VITE_SERVER_CATEGORY_IDS의 JSON 형식을 확인해주세요.");
  }
  if (
    !overrides ||
    Array.isArray(overrides) ||
    typeof overrides !== "object" ||
    Object.entries(overrides).some(
      ([name, id]) => !name.trim() || !Number.isSafeInteger(id) || id < 1,
    )
  )
    throw new Error("카테고리 설정은 이름과 양의 정수 ID를 가진 JSON 객체여야 합니다.");
  // A nonempty override replaces defaults to avoid misleading duplicate ID names.
  return Object.keys(overrides).length ? overrides : { ...defaults };
}
export function categoryName(id) {
  return (
    Object.entries(getCategoryIds()).find(([, value]) => value === Number(id))?.[0] ||
    `카테고리 ${id}`
  );
}
export function categoryId(name) {
  const ids = getCategoryIds();
  if (ids[name]) return ids[name];
  // Legacy video labels refer to the same seeded OTT category.
  if (["영상", "OTT"].includes(name)) return ids["OTT/영상"];
  const match = /^카테고리 ([1-9][0-9]*)$/.exec(name || "");
  return match ? Number(match[1]) : undefined;
}
