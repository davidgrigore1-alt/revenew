import type { ReactNode } from "react";

/** Fixed auth presentation; never writes the saved workspace theme. */
export function AuthTheme({ children }: { children: ReactNode }) {
  return <div className="auth-theme">{children}</div>;
}
