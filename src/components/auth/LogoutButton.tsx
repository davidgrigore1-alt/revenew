"use client";

import { ArrowRightOnRectangleIcon } from "@heroicons/react/24/outline";
import { clsx } from "clsx";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/status";

export function LogoutButton({ className }: { className?: string }) {
  async function logout() {
    if (isSupabaseConfigured) {
      const supabase = createSupabaseBrowserClient();
      await supabase?.auth.signOut();
    }

    window.location.href = "/auth/logout";
  }

  return (
    <button
      type="button"
      onClick={logout}
      className={clsx(
        "focus-ring flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-[rgb(var(--muted-foreground))] transition hover:bg-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]",
        className ?? "mt-6 w-full"
      )}
    >
      <ArrowRightOnRectangleIcon className="h-5 w-5" aria-hidden="true" />
      Ieșire
    </button>
  );
}
