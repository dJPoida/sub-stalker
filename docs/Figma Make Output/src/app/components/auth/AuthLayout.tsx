import { Link } from 'react-router';
import { Activity } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="font-semibold text-xl">Subscription Stalker</h1>
            <Link to="/status" className="text-sm flex items-center gap-1 hover:underline">
              <Activity className="w-4 h-4" />
              Status
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>

      <footer className="border-t py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          Track subscriptions, avoid surprise charges
        </div>
      </footer>
    </div>
  );
}
