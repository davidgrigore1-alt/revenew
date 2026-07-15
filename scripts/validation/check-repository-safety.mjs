import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const scriptDirectory = path.dirname(currentFile);
const repositoryRoot = path.resolve(scriptDirectory, "../..");
const ownPath = "scripts/validation/check-repository-safety.mjs";

export function forbiddenFileReason(fileName) {
  const lower = fileName.replaceAll("\\", "/").toLowerCase();
  const base = path.posix.basename(lower);
  if (/^\.env(?:\..+)?$/.test(base) && base !== ".env.example") return "runtime environment file";
  if (lower.startsWith(".next/") || lower.includes("/node_modules/") || lower.startsWith("node_modules/")) return "generated dependency/build directory";
  if (/\.codex.*(?:browser|profile)/.test(lower)) return "Codex browser profile";
  if (/(^|\/)(?:playwright-report|test-results|screenshots?|traces?|artifacts)(\/|$)/.test(lower)) return "browser/test artifact";
  if (/\.(?:log|csv)$/.test(lower)) return "temporary log or CSV";
  if (["login-output.html", "login-headers.txt"].includes(base)) return "login diagnostic artifact";
  if (/(?:screenshot|browser-trace|trace\.zip)/.test(base)) return "browser diagnostic artifact";
  return null;
}

const secretPatterns = [
  { label: "private key", expression: new RegExp(["-----BEGIN", "(?:RSA |EC |OPENSSH )?PRIVATE KEY-----"].join(" ")) },
  { label: "OpenAI-style API key", expression: new RegExp(["sk", "(?:proj-)?[A-Za-z0-9_-]{20,}"].join("-")) },
  { label: "GitHub token", expression: new RegExp(["gh", "[pousr]_[A-Za-z0-9]{30,}"].join("")) },
  { label: "Google API key", expression: new RegExp(["AI", "za[A-Za-z0-9_-]{30,}"].join("")) },
  { label: "Slack token", expression: new RegExp(["xox", "[baprs]-[A-Za-z0-9-]{20,}"].join("")) },
  { label: "non-empty service-role key", expression: new RegExp(["SUPABASE", "SERVICE", "ROLE", "KEY"].join("_") + String.raw`\s*[:=]\s*["']?[^\s"']{20,}`, "i") }
];

export function secretLabelsForContent(content) {
  return secretPatterns.filter((pattern) => pattern.expression.test(content)).map((pattern) => pattern.label);
}

async function main() {
  const listed = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], { cwd: repositoryRoot, encoding: "utf8" });
  const files = listed.split("\0").filter(Boolean).map((name) => name.replaceAll("\\", "/"));
  const findings = new Map();
  const flag = (fileName, reason) => {
    const reasons = findings.get(fileName) ?? new Set();
    reasons.add(reason);
    findings.set(fileName, reasons);
  };

  for (const fileName of files) {
    const reason = forbiddenFileReason(fileName);
    if (reason) flag(fileName, reason);
  }

  const requiredIgnores = [
    ".next", "node_modules", ".env", ".env.local", ".env.development.local",
    ".env.test.local", ".env.production.local", "*.log", ".codex-e2e-browser-profile/", "artifacts/"
  ];
  const gitignore = await readFile(path.join(repositoryRoot, ".gitignore"), "utf8");
  const ignoreLines = new Set(gitignore.split(/\r?\n/).map((line) => line.trim()).filter(Boolean));
  for (const expected of requiredIgnores) {
    if (!ignoreLines.has(expected)) flag(".gitignore", `missing ignore rule: ${expected}`);
  }

  for (const fileName of files) {
    if (fileName === ownPath || fileName === "package-lock.json") continue;
    let buffer;
    try {
      buffer = await readFile(path.join(repositoryRoot, fileName));
    } catch {
      continue;
    }
    if (buffer.length > 2_000_000 || buffer.includes(0)) continue;
    for (const label of secretLabelsForContent(buffer.toString("utf8"))) flag(fileName, label);
  }

  if (findings.size > 0) {
    console.error("Repository safety check failed. Only file names are reported:");
    for (const [fileName, reasons] of [...findings.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      console.error(`- ${fileName} [${[...reasons].join(", ")}]`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Repository safety check passed: ${files.length} tracked or committable file(s) checked; required ignore rules verified.`);
}

if (path.resolve(process.argv[1] ?? "") === path.resolve(currentFile)) await main();