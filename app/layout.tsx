import type { Metadata } from "next";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Looking Back | Evolvable Experiments",
  description: "A public reflective experiment about what we want our lives to have been."
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
