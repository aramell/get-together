import { Fredoka, Karla, Space_Mono } from "next/font/google";
import { Metadata } from "next";
import "./globals.css";
import "@/styles/celebration.css";
import { AmplifyProvider } from "./amplify-provider";

const fredoka = Fredoka({
  variable: "--font-fredoka",
  weight: ["500", "600", "700"],
  subsets: ["latin"],
});

const karla = Karla({
  variable: "--font-karla",
  subsets: ["latin"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  weight: ["400", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${fredoka.variable} ${karla.variable} ${spaceMono.variable} antialiased text-base leading-relaxed`}
      >
        <AmplifyProvider>
          {children}
        </AmplifyProvider>
      </body>
    </html>
  );
}
