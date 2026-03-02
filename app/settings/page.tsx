import { requireAuthenticatedUser } from "@/lib/auth";

export default async function SettingsPage() {
  const user = await requireAuthenticatedUser();

  return (
    <section className="card">
      <h1>Settings</h1>
      <p>Manage account preferences for {user.email}.</p>
      <p>Update profile, notifications, and billing preferences.</p>
    </section>
  );
}
