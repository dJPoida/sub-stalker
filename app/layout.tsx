import type { Metadata } from "next";
import Link from "next/link";

import { signOutAction } from "@/app/auth/actions";
import { getCurrentUser } from "@/lib/auth";

import "./globals.css";

export const metadata: Metadata = {
  title: "Sub Stalker",
  description: "Subscription tracker dashboard",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  const navItems = user
    ? [
        { href: "/", label: "Dashboard" },
        { href: "/subscriptions", label: "Subscriptions" },
        { href: "/settings", label: "Settings" },
        { href: "/tools", label: "Tools" },
        { href: "/status", label: "Status" },
      ]
    : [
        { href: "/", label: "Dashboard" },
        { href: "/status", label: "Status" },
        { href: "/auth/sign-in", label: "Sign In" },
        { href: "/auth/sign-up", label: "Sign Up" },
      ];

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
            {user ? (
              <li className="nav-auth">
                <span className="nav-user">{user.email}</span>
                <form action={signOutAction}>
                  <button type="submit" className="nav-button">
                    Sign Out
                  </button>
                </form>
              </li>
            ) : null}
          </ul>
        </nav>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
