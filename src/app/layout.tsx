import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import Navigation from "@/components/Navigation";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Siam May - Gimnasio Muay Thai & MMA",
  description: "Siam May - Tu gimnasio de artes marciales",
  icons: {
    icon: "/MMA2.webp",
    shortcut: "/MMA2.webp",
    apple: "/MMA2.webp",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={inter.className} suppressHydrationWarning>
      <body className={inter.variable}>
        <Navigation />
        <main>{children}</main>
        <Toaster />
      </body>
    </html>
  );
}
