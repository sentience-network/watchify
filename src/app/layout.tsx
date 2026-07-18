import type { Metadata } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import { AuthProvider } from "@/components/AuthProvider";
import { WatchifyProvider } from "@/lib/store";
import { SITE_DESCRIPTION, SITE_NAME, absoluteUrl } from "@/lib/site";
import { LaunchAnalytics } from "@/components/LaunchAnalytics";
import { PwaRegister } from "@/components/PwaRegister";
import "./globals.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700", "800"],
});

const body = Figtree({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(absoluteUrl("/")),
  title: {
    default: `${SITE_NAME} — Watch together across every screen`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  manifest: "/manifest.webmanifest",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a1210" },
    { media: "(prefers-color-scheme: light)", color: "#0d9488" },
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: SITE_NAME,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
  icons: {
    icon: [{ url: "/icons/icon-192.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/icon-192.svg" }],
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Watch together across every screen`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "https://image.tmdb.org/t/p/w780/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg",
        width: 1200,
        height: 630,
        alt: SITE_NAME,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Watch together across every screen`,
    description: SITE_DESCRIPTION,
    images: [
      "https://image.tmdb.org/t/p/w780/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg",
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} antialiased`}>
        <AuthProvider>
          <WatchifyProvider>
            <LaunchAnalytics />
            <PwaRegister />
            {children}
          </WatchifyProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
