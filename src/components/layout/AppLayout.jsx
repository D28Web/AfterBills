import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Receipt, Calendar, BarChart3, Target, PiggyBank, FlaskConical, Plane, Settings, Shield, Menu, X, Wallet } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/bills', label: 'Bills', icon: Receipt },
  { path: '/calendar', label: 'Calendar', icon: Calendar },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/savings', label: 'Savings', icon: Target },
  { path: '/sinking-funds', label: 'Sinking Funds', icon: PiggyBank },
  { path: '/payday-planner', label: 'Payday Planner', icon: Wallet },
  { path: '/what-if', label: 'What If', icon: FlaskConical },
  { path: '/trips', label: 'Trips', icon: Plane },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function AppLayout() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();
  const isAdmin = user && (user.role === 'admin' || user.role === 'owner');
  const navItems = isAdmin ? [...NAV_ITEMS, { path: '/admin', label: 'Admin', icon: Shield }] : NAV_ITEMS;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-card fixed inset-y-0 left-0 z-30">
        <div className="p-6">
          <h1 className="font-heading text-xl font-bold text-foreground tracking-tight">
            After<span className="text-primary">Bills</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Know what's really left</p>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map(item => {
            const active = item.path === '/admin' ? location.pathname.startsWith('/admin') : location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                  item.path === '/admin' && !active && "text-primary hover:text-primary hover:bg-primary/10"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border h-14 flex items-center justify-between px-4">
        <h1 className="font-heading text-lg font-bold text-foreground tracking-tight">
          After<span className="text-primary">Bills</span>
        </h1>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <motion.nav
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="lg:hidden fixed right-0 top-14 bottom-0 z-50 w-64 bg-card border-l border-border p-4 space-y-1"
            >
              {navItems.map(item => {
                const active = item.path === '/admin' ? location.pathname.startsWith('/admin') : location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted",
                      item.path === '/admin' && !active && "text-primary hover:text-primary hover:bg-primary/10"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </motion.nav>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 pt-14 lg:pt-0">
        <Outlet />
      </main>
    </div>
  );
}