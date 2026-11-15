import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "src");
function filesIn(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? filesIn(target) : [target];
  });
}
function resolveImport(file, target) {
  const base = path.resolve(path.dirname(file), target);
  return [base, `${base}.js`, `${base}.jsx`, `${base}.css`, path.join(base, "index.js")].find(
    (candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile(),
  );
}
const files = filesIn(source);
const graph = new Map();
const errors = [];
for (const file of files.filter((file) => /\.(js|jsx)$/.test(file))) {
  const text = fs.readFileSync(file, "utf8");
  const targets = [...text.matchAll(/['"](\.{1,2}\/[^'"\n]+)['"]/g)];
  const edges = [];
  for (const [, target] of targets) {
    const resolved = resolveImport(file, target);
    if (!resolved) {
      errors.push(`${path.relative(root, file)}: 경로 없음 ${target}`);
      continue;
    }
    edges.push(resolved);
    if (
      file.startsWith(path.join(source, "shared") + path.sep) &&
      ["features", "app"].some((folder) =>
        resolved.startsWith(path.join(source, folder) + path.sep),
      )
    )
      errors.push(`${path.relative(root, file)}: shared에서 상위 기능 참조 ${target}`);
  }
  graph.set(file, edges);
}
const reachable = new Set();
function visit(file) {
  if (reachable.has(file)) return;
  reachable.add(file);
  for (const next of graph.get(file) || []) visit(next);
}
visit(path.join(source, "app/main.jsx"));
const production = files.filter(
  (file) => /\.(js|jsx|css)$/.test(file) && !file.startsWith(path.join(source, "tests") + path.sep),
);
for (const file of production)
  if (!reachable.has(file)) errors.push(`미사용 파일: ${path.relative(root, file)}`);
const allowed = new Set(["app", "features", "shared", "tests"]);
for (const entry of fs.readdirSync(source))
  if (!allowed.has(entry)) errors.push(`src의 허용되지 않은 항목: ${entry}`);
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else
  console.log(
    `구조 검사 통과: 실행 코드 ${production.length}개, import 경로·공통 계층·미사용 파일 확인.`,
  );
