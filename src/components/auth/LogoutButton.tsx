"use client";

import { useRouter } from "next/navigation";
import { ArrowRightOnRectangleIcon } from "@heroicons/react/24/outline";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/status";

export function LogoutButton() {
  const router = useRouter();

  async function logout() {
    if (isSupabaseConfigured) {
      const supabase = createSupabaseBrowserClient();
      await supabase?.auth.signOut();
    }

    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={logout}
      className="mt-6 flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-zinc-400 transition hover:bg-white/[0.06] hover:text-white"
    >
      <ArrowRightOnRectangleIcon className="h-5 w-5" aria-hidden="true" />
      Ieșire
    </button>
  );
}
