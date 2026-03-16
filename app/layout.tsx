import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Apparatus — Scientific Simulations",
  description:
    "Interactive scientific demonstrations and simulations for physics, chemistry, and quantum mechanics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
