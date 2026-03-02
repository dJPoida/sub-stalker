import { requireAuthenticatedUser } from "@/lib/auth";

export default async function SubscriptionsPage() {
  const user = await requireAuthenticatedUser();

  return (
    <section className="card">
      <h1>Subscriptions</h1>
      <p>Signed in as {user.email}.</p>
      <p>Your active and canceled subscriptions will appear here.</p>
    </section>
  );
}
