import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";

// Request-local authority, established before provider dispatch. Tool arguments/history/source text cannot modify it.
const intent = new AsyncLocalStorage<{ enabled: boolean }>();
export function withPreparationIntent<T>(enabled: boolean, run: () => T): T { return intent.run({ enabled: enabled === true }, run); }
export function hasDirectPreparationIntent() { return intent.getStore()?.enabled === true; }
