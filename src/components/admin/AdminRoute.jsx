import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

export default function AdminRoute() {
  const { user, isAuthenticated, isLoadingAuth, authChecked } = useAuth();

  if (isLoadingAuth || !authChecked) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-950">
        <div className="w-8 h-8 border-4 border-slate-700 border-t-amber-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !user) return <Navigate to="/welcome" replace />;

  if (user.role !== 'admin' && user.role !== 'owner') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}