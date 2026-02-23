import "./globals.css";
import Navbar from "../components/Navbar";

export const metadata = {
  title: "Dynasty Hub",
  description: "A simple ESPN-style dynasty landing page.",
  themeColor: "#0b0f14",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
