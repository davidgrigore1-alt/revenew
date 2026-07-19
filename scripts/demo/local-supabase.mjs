import { spawn, spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { join } from "node:path";
import { stdin, stdout } from "node:process";
import { createClient } from "@supabase/supabase-js";

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);

export function assertLocalUrl(value, label, protocols) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${label} nu este un URL valid.`);
  }
  if (!LOCAL_HOSTS.has(parsed.hostname) || !protocols.includes(parsed.protocol)) {
    throw new Error(`${label} trebuie să indice exclusiv localhost.`);
  }
  return parsed;
}

function localCliInvocation(args) {
  const entrypoint = join(process.cwd(), "node_modules", "supabase", "dist", "supabase.js");
  return { command: process.execPath, args: [entrypoint, ...args] };
}

export function readLocalSupabaseStatus() {
  const invocation = localCliInvocation(["status", "-o", "json"]);
  const result = spawnSync(invocation.command, invocation.args, {
    cwd: process.cwd(),
    encoding: "utf8",
    windowsHide: true,
    env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: "1" }
  });
  if (result.status !== 0) {
    throw new Error("Stiva Supabase locală nu este disponibilă. Rulează `npx supabase start` și încearcă din nou.");
  }
  let status;
  try {
    status = JSON.parse(result.stdout);
  } catch {
    throw new Error("Răspunsul Supabase CLI nu a putut fi validat.");
  }
  const apiUrl = status.API_URL;
  const dbUrl = status.DB_URL;
  const anonKey = status.ANON_KEY ?? status.PUBLISHABLE_KEY;
  const serviceRoleKey = status.SERVICE_ROLE_KEY ?? status.SECRET_KEY;
  assertLocalUrl(apiUrl, "Supabase API", ["http:", "https:"]);
  assertLocalUrl(dbUrl, "Supabase DB", ["postgres:", "postgresql:"]);
  if (!anonKey || !serviceRoleKey) throw new Error("Cheile locale Supabase lipsesc din statusul CLI.");
  return { apiUrl, dbUrl, anonKey, serviceRoleKey };
}

export function createLocalAdminClient() {
  const local = readLocalSupabaseStatus();
  return {
    local,
    client: createClient(local.apiUrl, local.serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  };
}

export function runLocalSql(sql, { json = false } = {}) {
  readLocalSupabaseStatus();
  const docker = process.platform === "win32" ? "docker.exe" : "docker";
  const containers = spawnSync(docker, ["ps", "--filter", "publish=54322", "--format", "{{.Names}}"], {
    cwd: process.cwd(), encoding: "utf8", windowsHide: true
  });
  if (containers.status !== 0) throw new Error("Containerul PostgreSQL local nu poate fi identificat.");
  const names = containers.stdout.trim().split(/\r?\n/).filter(Boolean);
  if (names.length !== 1 || !/^supabase_db_[A-Za-z0-9_.-]+$/.test(names[0])) {
    throw new Error("Nu există un singur container PostgreSQL Supabase publicat pe portul local așteptat.");
  }
  const result = spawnSync(docker, ["exec", "-i", names[0], "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-t", "-A"], {
    cwd: process.cwd(), input: sql, encoding: "utf8", windowsHide: true, maxBuffer: 10 * 1024 * 1024
  });
  if (result.status !== 0) throw new Error(`Operația PostgreSQL locală a eșuat: ${result.stderr.trim().split(/\r?\n/).at(-1) ?? "eroare necunoscută"}`);
  return json ? JSON.parse(result.stdout.trim() || "null") : result.stdout.trim();
}

export async function requireDemoPassword() {
  const fromEnvironment = process.env.REVENEW_DEMO_PASSWORD?.trim();
  if (fromEnvironment) return fromEnvironment;
  if (!stdin.isTTY) {
    throw new Error("Setează variabila locală REVENEW_DEMO_PASSWORD sau rulează comanda într-un terminal interactiv.");
  }
  const terminal = createInterface({ input: stdin, output: stdout });
  const password = (await terminal.question("Parola contului demo local (nu va fi salvată): ")).trim();
  terminal.close();
  if (!password) throw new Error("Parola demo locală este obligatorie.");
  return password;
}

export function runWithLocalEnvironment(command, args) {
  const local = readLocalSupabaseStatus();
  const child = spawn(command, args, {
    cwd: process.cwd(),
    stdio: "inherit",
    windowsHide: true,
    env: {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: local.apiUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: local.anonKey,
      REVENEW_ACCESS_MODE: "preview",
      EMAIL_SENDING_MODE: "disabled",
      RESEND_API_KEY: "",
      OPENAI_API_KEY: ""
    }
  });
  child.on("exit", (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    else process.exitCode = code ?? 1;
  });
}

export async function must(result, context) {
  const resolved = await result;
  if (resolved.error) throw new Error(`${context}: ${resolved.error.message}`);
  return resolved.data;
}
