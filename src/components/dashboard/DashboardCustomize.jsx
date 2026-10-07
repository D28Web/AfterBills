import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { GripVertical, RotateCcw, LayoutGrid } from 'lucide-react';
import {
  Wallet, Bell, Calendar, CalendarDays, PiggyBank, CreditCard, TrendingUp,
  BarChart3, Lightbulb, Sparkles,
} from 'lucide-react';
import {
  SECTION_LABELS, MODE_PRESETS, MODE_LABELS, DASHBOARD_MODES, DEFAULT_MODE,
} from '@/lib/dashboardSections';

const SECTION_ICONS = {
  hero: Wallet,
  payday_planner: CalendarDays,
  upcoming_commitments: Calendar,
  things_to_know: Bell,
  goals_funds: PiggyBank,
  debt: CreditCard,
  forecast: TrendingUp,
  income_breakdown: PiggyBank,
  period_comparison: BarChart3,
  pay_periods: Sparkles,
  full_insights: Lightbulb,
};

// Personalization dialog: pick a preset mode, then drag to reorder and
// toggle to show/hide individual sections. Manual edits switch to "custom".
export default function DashboardCustomize({ open, onOpenChange, layout, currentMode, onSave }) {
  const [localLayout, setLocalLayout] = useState(layout);
  const [localMode, setLocalMode] = useState(currentMode || DEFAULT_MODE);

  useEffect(() => {
    if (open) {
      setLocalLayout(layout);
      setLocalMode(currentMode || DEFAULT_MODE);
    }
  }, [open, layout, currentMode]);

  const applyPreset = (mode) => {
    const preset = MODE_PRESETS[mode];
    if (!preset) return;
    setLocalLayout(preset);
    setLocalMode(mode);
  };

  const toggleHidden = (key) => {
    setLocalLayout(prev => {
      const isHidden = prev.hidden.includes(key);
      return {
        ...prev,
        hidden: isHidden ? prev.hidden.filter(k => k !== key) : [...prev.hidden, key],
      };
    });
    setLocalMode('custom');
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const newOrder = [...localLayout.order];
    const [moved] = newOrder.splice(result.source.index, 1);
    newOrder.splice(result.destination.index, 0, moved);
    setLocalLayout(prev => ({ ...prev, order: newOrder }));
    setLocalMode('custom');
  };

  const handleRestore = () => {
    setLocalLayout(MODE_PRESETS[DEFAULT_MODE]);
    setLocalMode(DEFAULT_MODE);
  };

  const handleDone = () => {
    onSave(localLayout, localMode);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold font-heading">Customize Dashboard</h3>
            <Button variant="ghost" size="sm" onClick={handleRestore}>
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
            </Button>
          </div>

          {/* Mode presets */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <LayoutGrid className="w-3.5 h-3.5" /> Preset
            </div>
            <div className="grid grid-cols-3 gap-2">
              {DASHBOARD_MODES.map(mode => (
                <button
                  key={mode}
                  onClick={() => applyPreset(mode)}
                  className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                    localMode === mode
                      ? 'bg-primary/5 border-primary/30 text-primary'
                      : 'border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  {MODE_LABELS[mode]}
                </button>
              ))}
            </div>
            {localMode === 'custom' && (
              <p className="text-xs text-muted-foreground">Custom layout — drag and toggle below to adjust.</p>
            )}
          </div>

          <div className="border-t border-border pt-3">
            <p className="text-sm text-muted-foreground mb-3">Drag to reorder sections. Toggle to show or hide.</p>
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
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleDone}>Done</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}