import "./globals.css";

export const metadata = {
  title: "S&P 500 Top 10",
  description: "Simple price board",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
