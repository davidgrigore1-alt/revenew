import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { themeInitScript } from "@/components/theme/theme-script";
import { brand } from "@/lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: brand.name,
  title: {
    default: brand.title,
    template: `%s | ${brand.name}`
  },
  description: brand.description,
  openGraph: {
    title: brand.title,
    description: brand.description,
    type: "website",
    locale: "ro_RO"
  },
  twitter: {
    card: "summary",
    title: brand.title,
    description: brand.description
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ro" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript() }} />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
