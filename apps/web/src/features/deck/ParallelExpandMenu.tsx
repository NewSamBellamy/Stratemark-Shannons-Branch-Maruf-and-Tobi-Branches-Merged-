import { useState } from 'react';
import { Check, ChevronDown, Layers3, Search } from 'lucide-react';
import type { CardType } from '@mi/contracts';
import { useExpandDeck } from '@/hooks/data';
import { useApiKey } from '@/lib/settings/apiKey';
import { cn } from '@/lib/cn';

const OPTIONS: Array<{ type: CardType; label: string }> = [
  { type: 'company', label: 'More companies' },
  { type: 'infrastructure', label: 'More infrastructure' },
  { type: 'distribution', label: 'More distribution' },
  { type: 'insight', label: 'More insights' },
  { type: 'vice', label: 'More vice signals' },
  { type: 'culture', label: 'More culture signals' },
  { type: 'barrier', label: 'More barriers to entry' },
];

/** One explicit expansion control; selected focuses run concurrently, not serially. */
export function ParallelExpandMenu({ marketId }: { marketId: string | undefined }) {
  const hasKey = useApiKey((state) => state.hasKey);
  const expand = useExpandDeck(marketId);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<CardType[]>(['company']);
  const [message, setMessage] = useState<string | null>(null);

  if (!hasKey || !marketId) return null;

  const toggle = (type: CardType) => {
    setSelected((current) => (current.includes(type) ? current.filter((item) => item !== type) : [...current, type]));
    setMessage(null);
  };

  const runSelected = async () => {
    if (selected.length === 0 || expand.isPending) return;
    setMessage(`Running ${selected.length} research pass${selected.length === 1 ? '' : 'es'} in parallel…`);
    try {
      const results = await Promise.all(selected.map((cardType) => expand.mutateAsync({ cardType })));
      const added = results.reduce((sum, result) => sum + result.added, 0);
      setMessage(added > 0 ? `Added ${added} sourced card${added === 1 ? '' : 's'}.` : 'No new credible cards found.');
    } catch {
      setMessage('One or more passes failed. Existing cards were not changed.');
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        className="btn-ghost px-3 text-xs"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label="Expand deck research"
      >
        <Layers3 className="h-3.5 w-3.5" />
        Expand deck
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-72 rounded-2xl border border-border bg-surface p-3 shadow-card">
          <div className="mb-2">
            <p className="text-sm font-semibold text-content">Expand coverage</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">Choose one or more passes. They run in parallel and only add sourced results.</p>
          </div>
          <div className="space-y-1">
            {OPTIONS.map((option) => {
              const active = selected.includes(option.type);
              return (
                <button
                  key={option.type}
                  type="button"
                  onClick={() => toggle(option.type)}
                  className={cn('flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition-colors', active ? 'bg-primary/10 text-primary-ink' : 'text-muted hover:bg-surface-2 hover:text-content')}
                >
                  <span>{option.label}</span>
                  {active && <Check className="h-3.5 w-3.5" />}
                </button>
              );
            })}
          </div>
          <button type="button" className="btn-primary mt-3 w-full text-xs" onClick={() => void runSelected()} disabled={selected.length === 0 || expand.isPending}>
            <Search className="h-3.5 w-3.5" />
            {expand.isPending ? 'Researching…' : 'Run selected passes'}
          </button>
          {message && <p className="mt-2 text-[11px] text-muted">{message}</p>}
        </div>
      )}
    </div>
  );
}
