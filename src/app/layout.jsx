import { Arimo, Lexend } from "next/font/google";
import "./globals.css";

const arimo = Arimo({
  variable: "--arimo",
  subsets: ["latin"],
});

const lexend = Lexend({
  variable: "--lexend",
  subsets: ["latin"],
});

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${arimo.variable} ${lexend.variable}`}>
      <body>{children}</body>
    </html>
  );
}
