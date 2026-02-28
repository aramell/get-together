'use client'

import { Geist, Geist_Mono } from "next/font/google";
import { Authenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import "./globals.css";
import { AmplifyProvider } from "./amplify-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AmplifyProvider>
          <Authenticator>
            {({ signOut, user }) => (
              <div>
                {children}
              </div>
            )}
          </Authenticator>
        </AmplifyProvider>
      </body>
    </html>
  );
}
