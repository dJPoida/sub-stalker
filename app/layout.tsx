import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sub Stalker",
  description: "Subscription tracker dashboard",
};

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/subscriptions", label: "Subscriptions" },
  { href: "/settings", label: "Settings" },
  { href: "/status", label: "Status" },
  { href: "/auth/sign-in", label: "Sign In" },
  { href: "/auth/sign-up", label: "Sign Up" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <nav className="nav">
          <ul>
            {navItems.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
