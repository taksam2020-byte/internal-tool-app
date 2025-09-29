import type { Metadata } from "next";
import 'bootstrap/dist/css/bootstrap.min.css';
import AppLayout from "@/components/AppLayout";
import { SettingsProvider } from "@/context/SettingsContext";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "社内ツール",
  description: "社内向けWebアプリケーション",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        <AuthProvider>
          <SettingsProvider>
            <AppLayout>
              {children}
            </AppLayout>
          </SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}