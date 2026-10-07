import { Outlet, Link, useLocation } from 'react-router-dom';
import { Shield, LayoutDashboard, Users, ScrollText, ArrowLeft, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const ADMIN_NAV = [
  { path: '/admin', label: 'Overview', icon: LayoutDashboard },
  { path: '/admin/users', label: 'Users', icon: Users },
  { path: '/admin/audit-log', label: 'Audit Log', icon: ScrollText },
];

function NavLinks({ onNavigate }) {
  const location = useLocation();
  return (
    <>
      {ADMIN_NAV.map((item) => {
        const active = item.path === '/admin'
          ? location.pathname === '/admin'
          : location.pathname.startsWith(item.path);
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
              active
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            )}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

export default function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-slate-800 bg-slate-900 fixed inset-y-0 left-0 z-30">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-500 rounded-lg">
              <Shield className="w-4 h-4 text-slate-950" />
            </div>
            <div>
              <h1 className="font-heading text-base font-bold text-white tracking-tight leading-none">
                Administration
              </h1>
              <p className="text-[11px] text-slate-400 mt-1">AfterBills Control</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          <NavLinks />
        </nav>
        <div className="p-3 border-t border-slate-800">
          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to app
          </Link>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-slate-900 border-b border-slate-800 h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-amber-500 rounded-md">
            <Shield className="w-3.5 h-3.5 text-slate-950" />
          </div>
          <span className="font-heading text-sm font-bold text-white">Administration</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <motion.nav
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="lg:hidden fixed right-0 top-14 bottom-0 z-50 w-64 bg-slate-900 border-l border-slate-800 p-4 space-y-1"
            >
              <NavLinks onNavigate={() => setMobileOpen(false)} />
              <div className="pt-3 mt-3 border-t border-slate-800">
                <Link
                  to="/"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to app
                </Link>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 pt-14 lg:pt-0 bg-slate-100 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}