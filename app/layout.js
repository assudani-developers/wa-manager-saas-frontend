import "./globals.css";
import { Plus_Jakarta_Sans } from "next/font/google";
import SidebarNav from "./components/SidebarNav";
import AuthGuard from "./components/AuthGuard";
import AppFooter from "./components/AppFooter";
import ClientSwitcher from "./components/ClientSwitcher";
import NetworkStatusBanner from "./components/NetworkStatusBanner";
import { ToastProvider } from "./components/ToastProvider";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-sans",
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export const metadata = {
  title: "Assudani WA Automations | Enterprise WhatsApp Marketing & CRM",
  description: "Enterprise WhatsApp marketing, broadcast campaigns, real-time live chat, and customer CRM powered by Assudani WA Automations. Designed & developed by Assudani Group & piyushassudani.in",
  icons: {
    icon: "/logo.webp",
    shortcut: "/favicon.ico",
    apple: "/logo.webp",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={plusJakarta.variable} style={{ height: "100%", overflow: "hidden" }}>
      <body className={plusJakarta.className} style={{ margin: 0, height: "100%", overflow: "hidden" }}>
        <ToastProvider>
          <div className="app-layout" style={{ display: "flex", height: "100dvh", overflow: "hidden" }}>
            <SidebarNav />
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <NetworkStatusBanner />
              <ClientSwitcher />
              <div style={{ flex: 1, minWidth: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                <AuthGuard>
                  {children}
                </AuthGuard>
              </div>
              <AppFooter />
            </div>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
