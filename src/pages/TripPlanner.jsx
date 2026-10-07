import { Link } from 'react-router-dom';
import { Plane } from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';

// Trips have been consolidated into Savings. This page now redirects users.
export default function TripPlanner() {
  return (
    <PageContainer maxWidth="form" className="space-y-6">
      <div className="text-center py-16">
        <Plane className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
        <h2 className="text-lg font-semibold font-heading mb-2">Trips have moved to Savings</h2>
        <p className="text-sm text-muted-foreground mb-4">Your trip savings goals are now managed in the Savings page, alongside all your other savings goals.</p>
        <Link to="/savings" className="inline-flex items-center gap-1 text-primary font-medium underline underline-offset-2">
          Go to Savings
        </Link>
      </div>
    </PageContainer>
  );
}