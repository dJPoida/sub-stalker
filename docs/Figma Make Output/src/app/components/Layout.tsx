import { Link, useLocation } from 'react-router';
import { useContext } from 'react';
import { AppContext } from '../App';
import { Button } from './ui/button';
import { LayoutDashboard, CreditCard, Settings, Wrench, Activity, LogOut } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const context = useContext(AppContext);
  const location = useLocation();
  
  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/subscriptions', label: 'Subscriptions', icon: CreditCard },
    { path: '/tools', label: 'Tools', icon: Wrench },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <h1 className="font-semibold text-xl">Subscription Stalker</h1>
              <nav className="hidden md:flex items-center gap-1">
                {navItems.map(item => (
                  <Link key={item.path} to={item.path}>
                    <Button
                      variant={isActive(item.path) ? 'default' : 'ghost'}
                      size="sm"
                      className="gap-2"
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </Button>
                  </Link>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-4">
              {context?.user && (
                <>
                  <span className="text-sm hidden md:inline">{context.user.email}</span>
                  <Button variant="ghost" size="sm" onClick={context.signOut}>
                    <LogOut className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>

      <footer className="border-t py-6 mt-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <Link to="/status" className="flex items-center gap-1 hover:underline">
                <Activity className="w-4 h-4" />
                System Status
              </Link>
            </div>
            <p className="text-muted-foreground">
              Track subscriptions, avoid surprise charges
            </p>
          </div>
        </div>
      </footer>

      {/* Mobile navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-background">
        <div className="flex items-center justify-around py-2">
          {navItems.map(item => (
            <Link key={item.path} to={item.path}>
              <Button
                variant={isActive(item.path) ? 'default' : 'ghost'}
                size="sm"
                className="flex-col h-auto py-2"
              >
                <item.icon className="w-5 h-5" />
                <span className="text-xs mt-1">{item.label}</span>
              </Button>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
