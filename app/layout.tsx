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
        <div className="app-shell">
          <header className="app-header">
            <div className="header-inner">
              <Link className="brand" href="/">
                <span className="brand-mark" />
                <span className="brand-copy">
                  <strong>Sub Stalker</strong>
                  <span>Subscription intelligence</span>
                </span>
              </Link>
              <nav className="main-nav" aria-label="Primary">
                {navItems.map((item) => (
                  <Link className="nav-link" key={item.href} href={item.href}>
                    {item.label}
                  </Link>
                ))}
              </nav>
              {user ? (
                <div className="nav-auth">
                  <span className="nav-user">{user.email}</span>
                  <form action={signOutAction}>
                    <button className="button button-secondary button-small" type="submit">
                      Sign Out
                    </button>
                  </form>
                </div>
              ) : null}
            </div>
          </header>
          <main className="container">{children}</main>
        </div>
      </body>
    </html>
  );
}
