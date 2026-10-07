import { ShieldAlert, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';

export default function AccountDisabled() {
  const { logout } = useAuth();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="p-4 bg-red-50 rounded-2xl w-fit mx-auto mb-5">
          <ShieldAlert className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="font-heading text-2xl font-bold text-foreground mb-2">Account disabled</h1>
        <p className="text-muted-foreground text-sm leading-relaxed mb-6">
          Your AfterBills account has been disabled by an administrator. If you believe this is a mistake, please contact support.
        </p>
        <Button variant="outline" className="gap-2" onClick={() => logout(true)}>
          <LogOut className="w-4 h-4" /> Sign out
        </Button>
      </div>
    </div>
  );
}