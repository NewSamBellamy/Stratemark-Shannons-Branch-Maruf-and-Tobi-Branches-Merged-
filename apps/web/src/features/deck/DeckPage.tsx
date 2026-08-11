import { useMemo, useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  FileText,
  Layers,
  MessagesSquare,
  MoreHorizontal,
  RefreshCw,
  Search,
  Settings,
  SquareMousePointer,
  Target,
  X,
} from 'lucide-react';
import {
  CARD_TYPE_DESCRIPTIONS,
  CARD_TYPE_LABELS,
  CARD_TYPE_ORDER,
  MATURITY_TIERS,
  TIER_BLURBS,
  TIER_LABELS,
  type CardType,
  type CardWithCompany,
  type MaturityTier,
} from '@mi/contracts';
import {
  useCards,
  useDeckByMarket,
  useExpandDeck,
  useMarket,
  useRefreshDeck,
} from '@/hooks/data';
import { useDeepDive } from '@/features/deepdive/DeepDive';
import { ThreadHistoryButton } from '@/features/research/ResearchControls';
import { cn } from '@/lib/cn';
import { useApiKey } from '@/lib/settings/apiKey';
import { QueryBoundary } from '@/components/states/QueryBoundary';
import { CardGridSkeleton } from '@/components/states/Skeleton';
import { EmptyState } from '@/components/states/EmptyState';
import { ResearchStage } from './ResearchStage';
import { useTaskManager } from '@/lib/tasks/TaskManagerContext';
import { CardGrid } from './CardGrid';
import { TierBadge } from '@/features/card/TierBadge';
import { ParallelExpandMenu } from './ParallelExpandMenu';

function deckUserValuesFrom(cards: CardWithCompany[]): number[] {
  return cards
    .filter((c) => c.card.cardType === 'company')
    .flatMap((c) => c.metrics)
    .filter((m) => m.metricType === 'users' && m.confidence !== 'unknown' && m.value !== null)
    .map((m) => m.value as number);
}

export default function DeckPage() {
  const { marketId } = useParams();
  const market = useMarket(marketId);
  const deck = useDeckByMarket(marketId);
  const deckId = deck.data?.id;
  const cards = useCards(deckId);
  const refreshDeck = useRefreshDeck();
  const { chat } = useDeepDive();
  const taskManager = useTaskManager();

  const activeTask = taskManager.tasks.find(
    (t) => t.marketId === marketId && t.status === 'running',
  );

  // Compare mode: select cards, then ask a grounded question about exactly
  // that set. Selection is deck-page state — leaving the page clears it.
  const [compare, setCompare] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggleSelected = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const exitCompare = () => {
    setCompare(false);
    setSelected(new Set());
  };
  const askSelected = () => {
    if (!deckId || selected.size === 0) return;
    chat(
      { kind: 'cards', deckId, cardIds: [...selected] },
      { placeholder: 'Compare these…' },
    );
    exitCompare();
  };

  const [params, setParams] = useSearchParams();
  const split = params.get('split'); // 'types' | 'company' | null
  const typeParam = params.get('type') as CardType | null;

  const all = useMemo(() => cards.data ?? [], [cards.data]);
  const selectedCards = useMemo(() => all.filter((card) => selected.has(card.card.id)), [all, selected]);
  const userValues = useMemo(() => deckUserValuesFrom(all), [all]);
  const countByType = useMemo(() => {
    const m = new Map<CardType, number>();
    for (const c of all) m.set(c.card.cardType, (m.get(c.card.cardType) ?? 0) + 1);
    return m;
  }, [all]);

  const setSplit = (next: { split?: string; type?: string }) => {
    const p = new URLSearchParams();
    if (next.split) p.set('split', next.split);
    if (next.type) p.set('type', next.type);
    setParams(p);
  };

  return (
    <div className="mx-auto max-w-6xl">
      {/* ── Header — tight, structured, clear hierarchy ── */}
      <div className="mb-6">
        {/* Back link */}
        <Link to="/history" className="inline-flex items-center gap-1 text-[12px] font-medium text-muted hover:text-primary-ink transition-colors">
          <ArrowLeft className="h-3 w-3" />
          Back
        </Link>

        {/* Title row */}
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div>
            <h1 className="font-display text-[22px] font-bold tracking-tight text-content sm:text-[28px]">
              {market.data?.name ?? 'Deck'}
            </h1>
            {market.data?.scopeDefinition && (
              <p className="mt-0.5 text-[12px] text-faint">
                {[
                  all.filter(c => c.card.cardType === 'company').length + ' companies',
                  market.data.scopeDefinition.geography,
                ].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>

          {/* Compact action bar */}
          <div className="flex flex-wrap items-center gap-1.5">
            <ThreadHistoryButton deckId={deckId} />
            <ParallelExpandMenu marketId={marketId} />
            <MoreMenu
              marketId={marketId}
              deckId={deckId}
              refreshDeck={refreshDeck}
              compare={compare}
              onCompare={() => setCompare(true)}
              onCancelCompare={exitCompare}
            />
          </div>
        </div>
      </div>

      {activeTask && (
        <div className="mb-6">
          <ResearchStage
            lines={activeTask.log}
            message={activeTask.currentStep}
            pct={activeTask.progress}
            status={activeTask.status}
            marketUpdates={activeTask.marketUpdates}
          />
        </div>
      )}

      <QueryBoundary
        query={cards}
        loading={<CardGridSkeleton />}
        isEmpty={(list) => list.length === 0}
        empty={
          <EmptyState
            title="No cards yet"
            description="Run the research pass to populate this deck with competitive-intelligence cards."
            icon={<Layers className="h-6 w-6" />}
            action={
              <button
                type="button"
                className="btn-primary mt-2"
                disabled={refreshDeck.isPending || !marketId}
                onClick={() => marketId && refreshDeck.mutate(marketId)}
              >
                <RefreshCw className={`h-4 w-4 ${refreshDeck.isPending ? 'animate-spin' : ''}`} />
                {refreshDeck.isPending ? 'Researching…' : 'Run research'}
              </button>
            }
          />
        }
      >
        {(list) => {
          // Level 2 — Company sub-deck split into 8 tier-decks.
          if (split === 'company') {
            return <TierSplit cards={list} deckUserValues={userValues} marketId={marketId} />;
          }
          // Level 1 leaf — a specific non-company sub-deck's cards.
          if (split === 'types' && typeParam) {
            const filtered = list.filter((c) => c.card.cardType === typeParam);
            return (
              <section>
                <h2 className="mb-3 font-display text-lg text-content">
                  {CARD_TYPE_LABELS[typeParam]} — {filtered.length} card
                  {filtered.length === 1 ? '' : 's'}
                </h2>
                {filtered.length > 0 ? (
                  <CardGrid cards={filtered} deckUserValues={userValues} marketId={marketId} />
                ) : (
                  <ExpandPrompt marketId={marketId} focus={{ cardType: typeParam }} label={`Hunt for ${CARD_TYPE_LABELS[typeParam].toLowerCase()} players in this market`} />
                )}
              </section>
            );
          }
          // Level 1 — six card-type sub-decks.
          if (split === 'types') {
            return (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {CARD_TYPE_ORDER.map((t) => (
                  <SubDeckTile
                    key={t}
                    type={t}
                    count={countByType.get(t) ?? 0}
                    onClick={() =>
                      t === 'company' ? setSplit({ split: 'company' }) : setSplit({ split: 'types', type: t })
                    }
                  />
                ))}
              </div>
            );
          }
          // Level 0 — show company cards by default (the primary view).
          // Other types are accessible via the category nav.
          const defaultType: CardType = typeParam ?? 'company';
          const filtered = list.filter((c) => c.card.cardType === defaultType);
          return (
            <section>
              <TypeNav
                cards={list}
                active={defaultType}
                onSelect={(t) => setSplit(t ? { type: t } : {})}
              />
              <p className="-mt-2 mb-4 max-w-3xl text-[12px] leading-relaxed text-muted">
                {CARD_TYPE_DESCRIPTIONS[defaultType]}
              </p>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-[12px] text-muted">
                  {filtered.length} {CARD_TYPE_LABELS[defaultType].toLowerCase()}
                  {filtered.length === 1 ? '' : 's'}
                </p>
                {filtered.length > 0 && (
                  <ExpandPrompt
                    marketId={marketId}
                    focus={{ cardType: defaultType }}
                    label={`Expand ${CARD_TYPE_LABELS[defaultType].toLowerCase()} research`}
                    compact
                  />
                )}
              </div>
              {filtered.length > 0 ? (
                <>
                  <CardGrid
                    cards={filtered}
                    deckUserValues={userValues}
                    marketId={marketId}
                    selectable={compare}
                    selected={selected}
                    onToggle={toggleSelected}
                  />
                </>
              ) : (
                <ExpandPrompt
                  marketId={marketId}
                  focus={{ cardType: defaultType }}
                  label={`Hunt for ${CARD_TYPE_LABELS[defaultType].toLowerCase()} cards in this market`}
                />
              )}
            </section>
          );
        }}
      </QueryBoundary>

      {/* Compare mode action bar */}
      {compare && (
        <div className="fixed bottom-6 left-1/2 z-40 flex max-w-[min(94vw,58rem)] -translate-x-1/2 items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-2.5 shadow-card">
          <div className="flex min-w-0 max-w-[min(52vw,34rem)] items-center gap-2 overflow-x-auto py-0.5">
            {selectedCards.map((selectedCard) => (
              <div key={selectedCard.card.id} className="flex shrink-0 items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-2 py-1 text-[11px] text-content">
                <span className="max-w-28 truncate">{selectedCard.company?.name ?? selectedCard.card.title ?? 'Card'}</span>
                <button
                  type="button"
                  className="rounded-full text-muted hover:text-content"
                  onClick={() => toggleSelected(selectedCard.card.id)}
                  aria-label={`Remove ${selectedCard.company?.name ?? selectedCard.card.title ?? 'card'} from comparison`}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
          <span className="shrink-0 text-sm tabular-nums text-muted">
            {selected.size} selected
          </span>
          <button
            type="button"
            className="btn-primary px-3.5 py-1.5 text-sm"
            disabled={selected.size === 0}
            onClick={askSelected}
          >
            <MessagesSquare className="h-4 w-4" />
            Ask about these
          </button>
          <button
            type="button"
            className="rounded-full p-1 text-muted hover:text-content"
            onClick={exitCompare}
            aria-label="Exit compare mode"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

/** Secondary deck actions behind a "More" toggle. */
function MoreMenu({
  marketId,
  deckId,
  refreshDeck,
  compare,
  onCompare,
  onCancelCompare,
}: {
  marketId: string | undefined;
  deckId: string | undefined;
  refreshDeck: { isPending: boolean; mutate: (id: string) => void };
  compare: boolean;
  onCompare: () => void;
  onCancelCompare: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { chat } = useDeepDive();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className="btn-ghost px-2.5"
        onClick={() => setOpen(!open)}
        aria-label="More actions"
        aria-expanded={open}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-56 rounded-xl border border-border bg-surface p-1 shadow-card">
          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-content hover:bg-surface-2"
            disabled={!deckId}
            onClick={() => {
              if (deckId) chat({ kind: 'deck', deckId }, { placeholder: 'Ask about this market…' });
              setOpen(false);
            }}
          >
            <MessagesSquare className="h-4 w-4 text-muted" />
            Ask AI
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-content hover:bg-surface-2"
            disabled={!deckId}
            onClick={() => {
              if (compare) onCancelCompare();
              else onCompare();
              setOpen(false);
            }}
          >
            <SquareMousePointer className="h-4 w-4 text-muted" />
            {compare ? 'Cancel compare' : 'Compare cards'}
          </button>
          <Link
            to="/reports"
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-content hover:bg-surface-2"
            onClick={() => setOpen(false)}
          >
            <FileText className="h-4 w-4 text-muted" />
            Reports
          </Link>
          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-content hover:bg-surface-2"
            disabled={refreshDeck.isPending || !marketId}
            onClick={() => {
              if (marketId) refreshDeck.mutate(marketId);
              setOpen(false);
            }}
          >
            <RefreshCw className={`h-4 w-4 text-muted ${refreshDeck.isPending ? 'animate-spin' : ''}`} />
            {refreshDeck.isPending ? 'Deep research running…' : 'Deep research'}
          </button>
          <Link
            to={`/markets/${marketId}/opportunity`}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-content hover:bg-surface-2"
            onClick={() => setOpen(false)}
          >
            <Target className="h-4 w-4 text-muted" />
            Opportunity
          </Link>
          <Link
            to={`/markets/${marketId}/settings`}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-content hover:bg-surface-2"
            onClick={() => setOpen(false)}
          >
            <Settings className="h-4 w-4 text-muted" />
            Settings
          </Link>
        </div>
      )}
    </div>
  );
}


function SubDeckTile({
  type,
  count,
  onClick,
}: {
  type: CardType;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="panel group flex flex-col p-5 text-left transition-colors hover:border-primary/50 hover:bg-surface-2"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold text-content">{CARD_TYPE_LABELS[type]}</h3>
        <span className="chip border-border text-muted">{count}</span>
      </div>
      <p className="mt-2 text-sm text-muted">{CARD_TYPE_DESCRIPTIONS[type]}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary-ink opacity-0 transition-opacity group-hover:opacity-100">
        {type === 'company' ? 'Split into 8 tiers' : 'View cards'}
        <ChevronRight className="h-3.5 w-3.5" />
      </span>
    </button>
  );
}

/**
 * Persistent card-type navigation.
 *
 * Replaces the old drill-down (split → pick a type → new screen) with a bar that
 * stays put: click a type and the grid below re-filters in place, the way you'd
 * flip between sections of a binder. Counts come from the real deck so an empty
 * type is visible rather than hidden behind a click.
 */
function TypeNav({
  cards,
  active,
  onSelect,
}: {
  cards: CardWithCompany[];
  active: CardType | null;
  onSelect: (t: CardType | null) => void;
}) {
  const counts = new Map<CardType, number>();
  for (const c of cards) counts.set(c.card.cardType, (counts.get(c.card.cardType) ?? 0) + 1);
  const present = CARD_TYPE_ORDER.filter((t) => (counts.get(t) ?? 0) > 0);

  // Always expose the full taxonomy so Insight / Vice / Culture / Barrier are
  // discoverable even when the first research pass returned zero of them.
  const PRIMARY: readonly CardType[] = ['company', 'infrastructure', 'distribution'];
  const SIGNAL: readonly CardType[] = ['insight', 'vice', 'culture', 'barrier'];
  const primaryTabs = PRIMARY.filter((t) => present.includes(t) || t === 'company');
  // Keep signal types visible with zero counts so Expand can be triggered from empty states.
  const overflowTabs = SIGNAL.slice();
  const activeInOverflow = active != null && overflowTabs.includes(active);

  const Tab = ({ label, count, selected, onClick }: { label: string; count: number; selected: boolean; onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'whitespace-nowrap border-b-2 px-4 py-2 text-[13px] font-medium transition-colors',
        selected
          ? 'border-primary text-primary'
          : 'border-transparent text-muted hover:text-content',
      )}
    >
      {label}
      <span className={cn('ml-1.5 tabular-nums text-[11px]', selected ? 'text-primary-ink' : 'text-faint')}>
        {count}
      </span>
    </button>
  );

  return (
    <nav
      data-testid="type-nav"
      className="mb-5 flex items-center gap-1 overflow-x-auto border-b border-border"
      aria-label="Filter deck by card type"
    >
      {primaryTabs.map((t) => (
        <Tab
          key={t}
          label={CARD_TYPE_LABELS[t]}
          count={counts.get(t) ?? 0}
          selected={active === t}
          onClick={() => onSelect(t)}
        />
      ))}
      <TypeOverflow
        tabs={overflowTabs}
        counts={counts}
        active={active}
        activeInOverflow={activeInOverflow}
        onSelect={onSelect}
      />
    </nav>
  );
}

/** Secondary signal types stay under More to keep the primary deck nav calm. */
function TypeOverflow({
  tabs,
  counts,
  active,
  activeInOverflow,
  onSelect,
}: {
  tabs: CardType[];
  counts: Map<CardType, number>;
  active: CardType | null;
  activeInOverflow: boolean;
  onSelect: (type: CardType | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  const label = activeInOverflow && active ? CARD_TYPE_LABELS[active] : 'More';
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all',
          activeInOverflow ? 'bg-primary text-primary-fg shadow-soft' : 'text-muted hover:bg-surface hover:text-content',
        )}
        aria-expanded={open}
        aria-label="More card types"
      >
        {label}
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 w-56 rounded-xl border border-border bg-surface p-1 shadow-card">
          <p className="px-3 py-2 text-[11px] leading-relaxed text-muted">Signals and market reports live here so the main deck navigation stays focused.</p>
          {tabs.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => { onSelect(type); setOpen(false); }}
              className={cn(
                'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] transition-colors',
                active === type ? 'bg-surface-2 font-medium text-content' : 'text-muted hover:bg-surface-2 hover:text-content',
              )}
            >
              <span>{CARD_TYPE_LABELS[type]}</span>
              <span className="tabular-nums text-[11px] text-faint">{counts.get(type) ?? 0}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Intelligent empty state: turn a dead end into a targeted micro-research run. */
function ExpandPrompt({
  marketId,
  focus,
  label,
  compact = false,
}: {
  marketId: string | undefined;
  focus: { tier?: MaturityTier; cardType?: CardType };
  label: string;
  compact?: boolean;
}) {
  const hasKey = useApiKey((s) => s.hasKey);
  const expand = useExpandDeck(marketId);
  const isThisPending =
    expand.isPending &&
    expand.variables?.tier === focus.tier &&
    expand.variables?.cardType === focus.cardType;
  if (!hasKey) {
    if (compact) return null;
    return (
      <p className="py-3 text-sm text-muted">
        Nothing found here in the sample data. With a key connected, the agent can hunt for these
        specifically — and will not invent entities it cannot source.
      </p>
    );
  }
  return (
    <div className={cn('flex flex-wrap items-center gap-3', compact ? '' : 'py-3')}>
      {!compact && (
        <p className="text-sm text-muted">
          First pass is a starting set. Expand to hunt for more — only sourced entities are added.
        </p>
      )}
      <button
        type="button"
        className={cn(compact ? 'btn-ghost px-3 py-1.5 text-xs' : 'btn-ghost text-sm')}
        disabled={expand.isPending}
        onClick={() => expand.mutate(focus)}
      >
        <Search className={`h-4 w-4 ${isThisPending ? 'animate-pulse' : ''}`} />
        {isThisPending ? 'Expanding…' : label}
      </button>
      {expand.isSuccess && expand.data.added === 0 && !expand.isPending && (
        <span className="text-xs text-muted">
          Search ran — nothing new and credible found (that’s honest).
        </span>
      )}
      {expand.isSuccess && expand.data.added > 0 && !expand.isPending && (
        <span className="text-xs text-positive">
          Added {expand.data.added} new card{expand.data.added === 1 ? '' : 's'}.
        </span>
      )}
    </div>
  );
}

function TierSplit({
  cards,
  deckUserValues,
  marketId,
}: {
  cards: CardWithCompany[];
  deckUserValues: number[];
  marketId: string | undefined;
}) {
  const companyCards = cards.filter((c) => c.card.cardType === 'company');
  const byTier = new Map<MaturityTier, CardWithCompany[]>();
  for (const t of MATURITY_TIERS) byTier.set(t, []);
  for (const c of companyCards) {
    if (c.card.tier != null) byTier.get(c.card.tier)!.push(c);
  }

  return (
    <div className="space-y-8">
      {MATURITY_TIERS.map((tier) => {
        const group = byTier.get(tier)!;
        return (
          <section key={tier}>
            <div className="mb-3 flex items-center gap-3 border-b border-border pb-2">
              <TierBadge tier={tier} size="md" />
              <span className="text-sm text-muted">{TIER_BLURBS[tier]}</span>
              <span className="ml-auto chip border-border text-muted">{group.length}</span>
            </div>
            {group.length > 0 ? (
              <CardGrid cards={group} deckUserValues={deckUserValues} />
            ) : (
              <ExpandPrompt
                marketId={marketId}
                focus={{ tier }}
                label={`Hunt for ${TIER_LABELS[tier]} companies`}
              />
            )}
          </section>
        );
      })}
    </div>
  );
}
