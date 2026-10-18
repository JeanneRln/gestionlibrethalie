import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" });

export const metadata: Metadata = {
  title: "Gestion libre",
  description: "Menus, grammages GEMRCN et stocks des centres de vacances",
};

export const dynamic = "force-dynamic";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${outfit.variable} ${fraunces.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
