import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MoneyHunter AI",
  description: "Agentul AI care găsește bani pentru firma ta."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ro">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
