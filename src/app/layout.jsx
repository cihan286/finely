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

export const metadata = {
  title: {
    default: "Finely – Financial clarity for modern businesses",
    template: "%s | Finely",
  },
  description:
    "Track expenses automatically, see your cash flow in real time, and turn your business's financial data into clear, actionable insights.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${arimo.variable} ${lexend.variable}`}
      data-scroll-behavior="smooth"
    >
      <body>{children}</body>
    </html>
  );
}
