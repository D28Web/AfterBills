import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getPrimaryIncomeContext } from '@/lib/income';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { FlaskConical, ShieldCheck, ShoppingBag, Save } from 'lucide-react';
import { toast } from 'sonner';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import WhatIfSimulator from '@/components/planning/WhatIfSimulator';
import AffordabilityChecker from '@/components/planning/AffordabilityChecker';
import PurchasePlanner from '@/components/planning/PurchasePlanner';
import ScenarioManager from '@/components/planning/ScenarioManager';

export default function WhatIf() {
  const queryClient = useQueryClient();
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: bills = [] } = useQuery({ queryKey: ['bills'], queryFn: () => base44.entities.Bill.list() });
  const { data: incomeStreams = [] } = useQuery({ queryKey: ['income-streams'], queryFn: () => base44.entities.IncomeStream.list() });

  const primaryCtx = getPrimaryIncomeContext(incomeStreams, user);
  const realIncome = primaryCtx.monthly_income;
  const currency = user?.currency || '£';

  const [activeTab, setActiveTab] = useState('what_if');
  const [loadedScenario, setLoadedScenario] = useState(null); // { id, type, data }
  const [pendingSave, setPendingSave] = useState(null); // { type, data }
  const [saveName, setSaveName] = useState('');
  const [saveNotes, setSaveNotes] = useState('');

  const saveMutation = useMutation({
    mutationFn: ({ name, type, data, notes }) => base44.entities.Scenario.create({ name, type, data, notes: notes || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenarios'] });
      toast.success('Scenario saved');
      setPendingSave(null);
      setSaveName('');
      setSaveNotes('');
    },
    onError: () => toast.error('Could not save scenario'),
  });

  const handleRequestSave = (type, data) => {
    setPendingSave({ type, data });
    setSaveName('');
    setSaveNotes('');
  };

  const confirmSave = () => {
    if (!saveName.trim() || !pendingSave) return;
    saveMutation.mutate({ name: saveName.trim(), type: pendingSave.type, data: pendingSave.data, notes: saveNotes });
  };

  const handleLoad = (scenario) => {
    setLoadedScenario({ id: scenario.id, type: scenario.type, data: scenario.data });
    setActiveTab(scenario.type);
    toast.success(`Loaded "${scenario.name}"`);
  };

  const tabKey = (type) => loadedScenario?.type === type ? loadedScenario.id : 'default';

  return (
    <PageContainer maxWidth="wide" className="space-y-6">
      <PageHeader
        title="Financial Planning"
        subtitle="Test commitments, plan purchases and run What If scenarios — all in one place"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="what_if" className="gap-1.5"><FlaskConical className="w-3.5 h-3.5" /> What If</TabsTrigger>
          <TabsTrigger value="affordability" className="gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Affordability</TabsTrigger>
          <TabsTrigger value="purchase" className="gap-1.5"><ShoppingBag className="w-3.5 h-3.5" /> Large Purchase</TabsTrigger>
          <TabsTrigger value="scenarios" className="gap-1.5"><Save className="w-3.5 h-3.5" /> Scenarios</TabsTrigger>
        </TabsList>

        <TabsContent value="what_if" className="mt-4">
          <WhatIfSimulator
            key={tabKey('what_if')}
            bills={bills}
            income={realIncome}
            primaryCtx={primaryCtx}
            currency={currency}
            initialData={loadedScenario?.type === 'what_if' ? loadedScenario.data : null}
            onRequestSave={handleRequestSave}
          />
        </TabsContent>

        <TabsContent value="affordability" className="mt-4">
          <AffordabilityChecker
            key={tabKey('affordability')}
            bills={bills}
            income={realIncome}
            primaryCtx={primaryCtx}
            currency={currency}
            initialData={loadedScenario?.type === 'affordability' ? loadedScenario.data : null}
            onRequestSave={handleRequestSave}
          />
        </TabsContent>

        <TabsContent value="purchase" className="mt-4">
          <PurchasePlanner
            key={tabKey('purchase')}
            bills={bills}
            income={realIncome}
            primaryCtx={primaryCtx}
            currency={currency}
            initialData={loadedScenario?.type === 'purchase' ? loadedScenario.data : null}
            onRequestSave={handleRequestSave}
          />
        </TabsContent>

        <TabsContent value="scenarios" className="mt-4">
          <ScenarioManager onLoad={handleLoad} currency={currency} />
        </TabsContent>
      </Tabs>

      <Dialog open={!!pendingSave} onOpenChange={(open) => !open && setPendingSave(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save scenario</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">Give this plan a name so you can reload and apply it later. Scenarios never modify your live data automatically.</p>
            <Input
              autoFocus
              placeholder="e.g. New car finance test"
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') confirmSave(); }}
            />
            <Textarea
              placeholder="Notes (optional) — e.g. what this scenario is testing"
              value={saveNotes}
              onChange={e => setSaveNotes(e.target.value)}
              rows={2}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={confirmSave} disabled={!saveName.trim() || saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}