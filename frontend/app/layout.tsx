import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import "mapbox-gl/dist/mapbox-gl.css";

export const metadata: Metadata = {
  title: "RideShare",
  description: "Get a ride in minutes.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-night text-fog">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
