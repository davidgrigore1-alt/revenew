import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false
  }
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="dark min-h-screen bg-[rgb(var(--background))] [--focus-ring:var(--rn-accent-ring)] [--primary-active:var(--rn-accent-600)] [--primary-foreground:var(--rn-accent-foreground)] [--primary-hover:var(--rn-accent-300)] [--primary:var(--rn-accent-400)]" style={{ colorScheme: "dark" }}>{children}</div>;
}
