import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Download, LogOut, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function AccountDataSection({ user }) {
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const res = await base44.functions.invoke('export_my_data', {});
      if (res.data?.error) throw new Error(res.data.error);
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `afterbills-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Your data export has been downloaded.');
    } catch (e) {
      toast.error('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      const res = await base44.functions.invoke('delete_my_account', {});
      if (!res.data?.success) throw new Error(res.data?.error || 'Failed');
      setDialogOpen(false);
      toast.success('All your AfterBills data has been permanently deleted.');
      // Give the toast a moment to show before the hard redirect to the landing page.
      setTimeout(() => base44.auth.logout('/welcome'), 900);
    } catch (e) {
      toast.error('Account deletion failed. Please try again.');
      setDeleting(false);
    }
  };

  const canDelete = confirmText === 'DELETE' && !deleting;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border p-6 space-y-5"
    >
      <div>
        <h3 className="text-sm font-semibold font-heading">Account & Data</h3>
        <p className="text-xs text-muted-foreground mt-1">{user?.email}</p>
      </div>

      <div className="rounded-xl border border-border p-4 space-y-3">
        <div>
          <p className="text-sm font-medium">Export my data</p>
          <p className="text-xs text-muted-foreground mt-1">
            Download all your AfterBills data (bills, subcategories, income streams, savings goals, trips, contributions and expenses) as a structured JSON file. Use it as a backup or to migrate to another system.
          </p>
        </div>
        <Button onClick={handleExport} disabled={exporting} variant="outline" className="gap-2">
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {exporting ? 'Preparing export…' : 'Export My Data'}
        </Button>
      </div>

      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
        <div>
          <p className="text-sm font-medium text-destructive">Delete account</p>
          <p className="text-xs text-muted-foreground mt-1">
            Permanently delete all your AfterBills data and sign out. This action cannot be undone.
          </p>
        </div>
        <AlertDialog open={dialogOpen} onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) { setConfirmText(''); }
        }}>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="gap-2 text-destructive border-destructive/40 hover:bg-destructive/10">
              <Trash2 className="w-4 h-4" /> Delete Account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your AfterBills account?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently deletes every bill, subcategory, income stream, savings goal, trip, contribution and expense belonging to your account, then signs you out. The action is irreversible and your data cannot be recovered. To confirm, type <strong>DELETE</strong> below.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2">
              <Label htmlFor="delete-confirm">Type DELETE to confirm</Label>
              <Input
                id="delete-confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                autoComplete="off"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => { e.preventDefault(); handleDelete(); }}
                disabled={!canDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                {deleting ? 'Deleting…' : 'Delete permanently'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Button variant="outline" className="gap-2 text-destructive" onClick={() => base44.auth.logout()}>
        <LogOut className="w-4 h-4" /> Sign Out
      </Button>
    </motion.div>
  );
}