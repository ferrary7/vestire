import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/UI/Navigation";
import ClientProvider from "@/components/UI/ClientProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Vestire - Digital Closet App",
  description: "Organize your wardrobe, create outfits, and get AI-powered fashion recommendations",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
      >
        <ClientProvider>
          <Navigation />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </main>
        </ClientProvider>
      </body>
    </html>
  );
}
