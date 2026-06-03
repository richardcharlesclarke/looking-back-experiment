import type { Metadata } from "next";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Evolvable Experiments",
  description: "Public reflective experiments from Evolvable."
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
