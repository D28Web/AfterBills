import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { GripVertical, RotateCcw } from 'lucide-react';
import {
  Wallet, Shield, Bell, Calendar, CalendarDays, PiggyBank, Target, CreditCard, TrendingUp,
} from 'lucide-react';
import { SECTION_KEYS, SECTION_LABELS } from '@/lib/dashboardSections';

const SECTION_ICONS = {
  left_after_bills: Wallet,
  safe_to_spend: Shield,
  things_to_know: Bell,
  upcoming_commitments: Calendar,
  payday_planner: CalendarDays,
  savings: PiggyBank,
  emergency_fund: Target,
  sinking_funds: PiggyBank,
  debt: CreditCard,
  forecast: TrendingUp,
};

// Personalization dialog: drag to reorder, toggle to show/hide, restore default.
export default function DashboardCustomize({ open, onOpenChange, layout, onSave }) {
  const [localLayout, setLocalLayout] = useState(layout);

  useEffect(() => {
    if (open) setLocalLayout(layout);
  }, [open, layout]);

  const toggleHidden = (key) => {
    setLocalLayout(prev => {
      const isHidden = prev.hidden.includes(key);
      return {
        ...prev,
        hidden: isHidden ? prev.hidden.filter(k => k !== key) : [...prev.hidden, key],
      };
    });
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const newOrder = [...localLayout.order];
    const [moved] = newOrder.splice(result.source.index, 1);
    newOrder.splice(result.destination.index, 0, moved);
    setLocalLayout(prev => ({ ...prev, order: newOrder }));
  };

  const handleRestore = () => {
    setLocalLayout({ order: [...SECTION_KEYS], hidden: [] });
  };

  const handleDone = () => {
    onSave(localLayout);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold font-heading">Customize Dashboard</h3>
            <Button variant="ghost" size="sm" onClick={handleRestore}>
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Restore Default
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">Drag to reorder sections. Toggle to show or hide.</p>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="sections">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                  {localLayout.order.map((key, index) => {
                    const Icon = SECTION_ICONS[key];
                    const isHidden = localLayout.hidden.includes(key);
                    return (
                      <Draggable key={key} draggableId={key} index={index}>
                        {(prov) => (
                          <div
                            ref={prov.innerRef}
                            {...prov.draggableProps}
                            {...prov.dragHandleProps}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                              isHidden ? 'border-border bg-muted/50 opacity-60' : 'border-border bg-card hover:bg-muted/30'
                            }`}
                          >
                            <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                            <div className="p-1.5 rounded-lg bg-accent shrink-0">
                              <Icon className="w-3.5 h-3.5 text-primary" />
                            </div>
                            <span className={`flex-1 text-sm font-medium ${isHidden ? 'text-muted-foreground' : 'text-foreground'}`}>
                              {SECTION_LABELS[key]}
                            </span>
                            <Switch checked={!isHidden} onCheckedChange={() => toggleHidden(key)} />
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleDone}>Done</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}