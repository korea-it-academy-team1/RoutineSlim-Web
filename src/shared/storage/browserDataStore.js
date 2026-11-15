const PREFIX = "routineslim:browser-data:v1:";
const fresh = () => ({ goals: [], selection: [], notifications: { read: [], dismissed: [] } });
const fail = (message) => {
  throw new Error(message);
};
const text = (x, max = 120) => typeof x === "string" && x.trim().length > 0 && x.length <= max;
const money = (x) => Number.isSafeInteger(x) && x > 0 && x <= 1000000000;
const month = (x) => typeof x === "string" && /^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/.test(x);
const date = (x) =>
  typeof x === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(x) &&
  Number.isFinite(Date.parse(x)) &&
  new Date(x + "T00:00:00Z").toISOString().slice(0, 10) === x;
const id = () => crypto.randomUUID();
function validate(data) {
  if (
    !data ||
    !Array.isArray(data.goals) ||
    data.goals.length > 240 ||
    !Array.isArray(data.selection) ||
    data.selection.length > 3 ||
    data.selection.some((x) => !text(x, 100)) ||
    new Set(data.selection).size !== data.selection.length ||
    !data.notifications
  )
    fail("백업 데이터 형식을 확인해주세요.");
  for (const key of ["read", "dismissed"]) {
    const list = data.notifications[key];
    if (!Array.isArray(list) || list.length > 1000 || list.some((x) => !text(x, 200)))
      fail("알림 확인 데이터 형식이 올바르지 않습니다.");
  }
  const ids = new Set(),
    months = new Set(),
    entries = new Set();
  for (const g of data.goals) {
    if (
      !text(g.id, 100) ||
      ids.has(g.id) ||
      !month(g.month) ||
      months.has(g.month) ||
      !text(g.title) ||
      !money(g.target) ||
      !Array.isArray(g.tasks) ||
      g.tasks.length > 20 ||
      g.tasks.some((x) => !text(x)) ||
      new Set(g.tasks).size !== g.tasks.length ||
      !Array.isArray(g.completed) ||
      g.completed.length !== g.tasks.length ||
      g.completed.some((x) => typeof x !== "boolean") ||
      !Array.isArray(g.entries) ||
      g.entries.length > 1000
    )
      fail("절약 목표의 이름·월·금액·실천 항목을 확인해주세요.");
    ids.add(g.id);
    months.add(g.month);
    for (const e of g.entries) {
      if (
        !text(e.id, 100) ||
        entries.has(e.id) ||
        !text(e.title) ||
        !money(e.amount) ||
        !date(e.date) ||
        !e.date.startsWith(g.month + "-")
      )
        fail("절약 기록의 이름·금액·날짜를 확인해주세요. 날짜는 목표 월에 속해야 합니다.");
      entries.add(e.id);
    }
  }
  return data;
}
export function readBrowserData(member) {
  let raw;
  try {
    raw = localStorage.getItem(PREFIX + member);
  } catch {
    fail("브라우저 저장소를 사용할 수 없습니다. 저장소 설정을 확인해주세요.");
  }
  if (raw === null) return fresh();
  try {
    return validate(JSON.parse(raw));
  } catch {
    fail(
      "브라우저 저장 데이터가 손상되었습니다. 데이터를 지우지 말고 정상 백업 파일로 복원해주세요.",
    );
  }
}
function save(member, data) {
  validate(data);
  const raw = JSON.stringify(data);
  if (new TextEncoder().encode(raw).length > 1500000)
    fail("저장할 데이터가 너무 큽니다. 오래된 기록을 정리해주세요.");
  try {
    localStorage.setItem(PREFIX + member, raw);
  } catch {
    fail("브라우저에 저장하지 못했습니다. 저장 공간과 사이트 저장소 권한을 확인해주세요.");
  }
}
export function browserRoute(path) {
  return /^\/api\/v1\/(goals(?:\/|$)|savings-entries\/|comparison\/selection$|browser-data$)/.test(
    path,
  );
}
export function validateBrowserBackup(member, body) {
  if (
    !body ||
    body.format !== "routineslim-browser-backup" ||
    body.version !== 1 ||
    body.memberId !== member
  )
    fail("이 계정의 RoutineSlim 백업 파일이 아닙니다.");
  return validate(body.data);
}
export function requestBrowserData(member, route, method, body, query) {
  if (route === "/api/v1/browser-data" && method === "PUT") {
    const restored = validateBrowserBackup(member, body);
    save(member, restored);
    return { restored: true };
  }
  const data = readBrowserData(member);
  if (route === "/api/v1/browser-data" && method === "GET")
    return {
      format: "routineslim-browser-backup",
      version: 1,
      memberId: member,
      exportedAt: new Date().toISOString(),
      data,
    };
  if (route === "/api/v1/comparison/selection") {
    if (method === "GET") return data.selection.map((id) => ({ id }));
    if (method === "PUT") {
      data.selection = body.ids;
      save(member, data);
      return data.selection;
    }
  }
  if (route === "/api/v1/goals" && method === "GET") {
    const selected = query.get("month");
    if (!month(selected)) fail("목표 월을 확인해주세요.");
    const goal = data.goals.find((g) => g.month === selected) || null;
    const saved = (goal?.entries || []).reduce((n, e) => n + e.amount, 0);
    return {
      goal,
      entries: goal?.entries || [],
      saved,
      percent: goal ? Math.round((saved / goal.target) * 100) : 0,
    };
  }
  const match = route.match(/^\/api\/v1\/goals(?:\/([^/]+))?(?:\/(savings))?$/);
  if (match) {
    const current = match[1] ? data.goals.find((g) => g.id === match[1]) : null;
    if (match[1] && !current) fail("이 브라우저에서 목표를 찾을 수 없습니다.");
    if (match[2] === "savings" && method === "POST") {
      const entry = { id: id(), title: body.title, amount: body.amount, date: body.date };
      current.entries.push(entry);
      save(member, data);
      return entry;
    }
    if (
      !match[2] &&
      ["POST", "PUT"].includes(method) &&
      ((method === "POST" && !match[1]) || (method === "PUT" && current))
    ) {
      const goal = {
        id: current?.id || id(),
        title: body.title,
        month: body.month,
        target: body.target,
        tasks: body.tasks,
        completed: body.completed,
        entries: current?.entries || [],
      };
      if (current) data.goals[data.goals.indexOf(current)] = goal;
      else data.goals.push(goal);
      save(member, data);
      return goal;
    }
    if (!match[2] && method === "DELETE" && current) {
      data.goals = data.goals.filter((g) => g.id !== current.id);
      save(member, data);
      return null;
    }
  }
  const entry = route.match(/^\/api\/v1\/savings-entries\/([^/]+)$/);
  if (entry && method === "DELETE") {
    const owner = data.goals.find((g) => g.entries.some((e) => e.id === entry[1]));
    if (!owner) fail("절약 기록을 찾을 수 없습니다.");
    owner.entries = owner.entries.filter((e) => e.id !== entry[1]);
    save(member, data);
    return null;
  }
  fail("이 작업은 브라우저 저장 기능에서 지원하지 않습니다.");
}
export function applyNotificationState(member, items, action, target) {
  const data = readBrowserData(member),
    state = data.notifications;
  if (action === "read-all")
    state.read = [...new Set([...state.read, ...items.map((x) => x.id)])].slice(-1000);
  if (["read", "delete"].includes(action)) {
    if (!items.some((x) => x.id === target))
      fail("알림을 찾을 수 없습니다. 목록을 새로고침해주세요.");
    const key = action === "read" ? "read" : "dismissed";
    state[key] = [...new Set([...state[key], target])].slice(-1000);
  }
  if (action) save(member, data);
  return items
    .filter((x) => !state.dismissed.includes(x.id))
    .map((x) => ({ ...x, read: state.read.includes(x.id) }));
}
