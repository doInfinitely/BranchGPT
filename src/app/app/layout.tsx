import { ThemeProvider } from "@/lib/theme";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
