import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const scriptDirectory = path.dirname(currentFile);
const repositoryRoot = path.resolve(scriptDirectory, "../..");
const migrationsDirectory = path.join(repositoryRoot, "supabase/migrations");
const baselinePath = path.join(scriptDirectory, "migration-integrity-baseline.json");

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function lineNumberAt(source, index) {
  return source.slice(0, index).split("\n").length;
}

export function scanMigration(fileName, sql) {
  const findings = [];
  const addMatches = (rule, expression, allowJustification = false) => {
    for (const match of sql.matchAll(expression)) {
      const line = lineNumberAt(sql, match.index ?? 0);
      if (allowJustification) {
        const precedingLines = sql.split("\n").slice(Math.max(0, line - 4), line - 1);
        if (precedingLines.some((entry) => /^\s*--\s*safety-justification:\s*.{12,}$/i.test(entry))) continue;
      }
      findings.push(`${fileName}:${line} [${rule}]`);
    }
  };

  addMatches("DROP TABLE", /\bdrop\s+table\b/gi);
  addMatches("DROP SCHEMA", /\bdrop\s+schema\b/gi);
  addMatches("TRUNCATE", /\btruncate(?:\s+table)?\b/gi);
  addMatches("DROP COLUMN", /\balter\s+table[\s\S]{0,500}?\bdrop\s+column\b/gi);
  addMatches("RLS DISABLED", /\bdisable\s+row\s+level\s+security\b/gi);
  addMatches("forbidden businesses.owner_id", /\bbusinesses\b[\s\S]{0,200}?\bowner_id\b|\bowner_id\b[\s\S]{0,200}?\bbusinesses\b/gi);
  addMatches("service-role reference", /\bservice[_ -]?role\b/gi);
  addMatches("unsafe GRANT ALL", /\bgrant\s+all(?:\s+privileges)?\b/gi);
  addMatches("unsafe public grant", /\bgrant\s+(?:insert|update|delete|truncate|references|trigger|execute)[\s\S]{0,300}?\bto\s+(?:anon|public)\b/gi);
  addMatches("SECURITY DEFINER without justification", /\bsecurity\s+definer\b/gi, true);

  for (const match of sql.matchAll(/\bdelete\s+from\b[\s\S]*?(?:;|$)/gi)) {
    const statement = match[0];
    if (!/\bwhere\b/i.test(statement) || /\bwhere\s+(?:true|1\s*=\s*1)\b/i.test(statement)) {
      findings.push(`${fileName}:${lineNumberAt(sql, match.index ?? 0)} [DELETE without a constrained WHERE]`);
    }
  }

  return findings;
}

async function main() {
  const baseline = JSON.parse(await readFile(baselinePath, "utf8"));
  const migrationNames = (await readdir(migrationsDirectory)).filter((name) => name.endsWith(".sql")).sort();
  const findings = [];

  for (const [fileName, expectedHash] of Object.entries(baseline.files)) {
    if (!migrationNames.includes(fileName)) {
      findings.push(`${fileName} [reviewed migration is missing]`);
      continue;
    }
    const sql = await readFile(path.join(migrationsDirectory, fileName), "utf8");
    if (digest(sql) !== expectedHash) findings.push(`${fileName} [reviewed migration changed]`);
  }

  const newMigrations = migrationNames.filter((name) => !baseline.files[name]);
  for (const fileName of newMigrations) {
    findings.push(...scanMigration(fileName, await readFile(path.join(migrationsDirectory, fileName), "utf8")));
  }

  if (findings.length > 0) {
    console.error("Migration safety check failed. Review these file locations:");
    for (const finding of findings) console.error(`- ${finding}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Migration safety check passed: ${Object.keys(baseline.files).length} reviewed migrations verified; ${newMigrations.length} new migration(s) scanned.`);
}

if (path.resolve(process.argv[1] ?? "") === path.resolve(currentFile)) await main();