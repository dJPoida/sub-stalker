import Link from "next/link";

import { getCurrentUser } from "@/lib/auth";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  return (
    <section className="card">
      <h1>Dashboard</h1>
      {user ? (
        <p>Signed in as {user.email}. Use the navigation to manage subscriptions and account settings.</p>
      ) : (
        <p>
          Welcome to Sub Stalker. <Link href="/auth/sign-up">Create an account</Link> to start tracking subscriptions.
        </p>
      )}
    </section>
  );
}
