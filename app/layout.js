import "./globals.css";
import SidebarNav from "./components/SidebarNav";
import AuthGuard from "./components/AuthGuard";
import AppFooter from "./components/AppFooter";
import ClientSwitcher from "./components/ClientSwitcher";
import { ToastProvider } from "./components/ToastProvider";

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
    <html lang="en" style={{ height: "100%", overflow: "hidden" }}>
      <body style={{ margin: 0, height: "100%", overflow: "hidden" }}>
        <ToastProvider>
          <div className="app-layout" style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
            <SidebarNav />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <ClientSwitcher />
              <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
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
