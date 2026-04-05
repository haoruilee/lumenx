import "./globals.css";
import EnvConfigChecker from "@/components/EnvConfigChecker";
import EntryAuthGate from "@/components/auth/EntryAuthGate";
import { I18nProvider } from "@/i18n/provider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <title>LumenX Studio</title>
        <meta name="description" content="AI-Native Motion Comic Creation Platform" />
      </head>
      <body className="font-sans bg-background text-foreground antialiased">
        <I18nProvider>
          <EntryAuthGate>
            <EnvConfigChecker />
            {children}
          </EntryAuthGate>
        </I18nProvider>
      </body>
    </html>
  );
}
