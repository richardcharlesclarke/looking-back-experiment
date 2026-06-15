import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "evolvable.me Initiatives",
  description: "Public reflective initiatives from evolvable.me."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://use.typekit.net/mov4cer.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
