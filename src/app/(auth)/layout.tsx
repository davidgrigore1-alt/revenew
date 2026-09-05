import type { Metadata } from "next";
import { AuthTheme } from "@/components/auth/AuthTheme";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false
  }
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthTheme>{children}</AuthTheme>;
}
