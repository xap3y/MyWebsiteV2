import type { Metadata } from "next";
import { Geist, Geist_Mono, Open_Sans } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "@XAP3Y",
    description: "Personal website of XAP3Y",
    keywords: ["XAP3Y", "XAP3X", "Martin Hoke", "ksapeks", "xapex", "xapey", "xap3j", "Hoke Martin", "ксап3й", "ксапей"],
    openGraph: {
        title: "@XAP3Y",
        description: "Personal website of XAP3Y",
        type: "website",
        locale: "en_US",
        siteName: "@XAP3Y",
        url: "https://xap3y.tech",
    },
    twitter: {
        title: "@XAP3Y",
        description: "Personal website of XAP3Y",
        site: "@XAP3Y",
        card: "summary_large_image",
        images: "https://xap3y.tech/og.png",
    },
    creator: "XAP3Y",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
          cz-shortcut-listen="true"
        className={`${geistSans.variable} ${geistMono.variable} h-[100vh] antialiased bg-primary text-whitesmoke scroll-smooth`}
      >
        {children}
      </body>
    </html>
  );
}
