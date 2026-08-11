/**
 * The research stage — the most emotionally important screen in the app.
 *
 * Two views of the same live run, switchable:
 *  · Live log  — the glass box. The agent's actual steps, streaming. Earns trust.
 *  · Market brief — a cinematic, auto-advancing carousel that primes you on the
 *    market while you wait. Every card is built from data ALREADY streaming in
 *    (scope, search angles, companies found, gaps). Nothing is invented; the
 *    two "how this works" cards are labelled as method, not findings.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Coffee,
  Compass,
  Layers,
  ListTree,
  Loader2,
  Newspaper,
  Radio,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import type { MarketUpdate } from '@mi/contracts';
import { cn } from '@/lib/cn';

export interface LogLine {
  message: string;
  kind: 'step' | 'find' | 'warn';
  at: number;
}

interface Insight {
  id: string;
  eyebrow: string;
  body: string;
  icon: typeof Compass;
  /** Method explainers are labelled so they're never mistaken for findings. */
  method?: boolean;
}

/** Build carousel cards out of the real event stream. */
function deriveInsights(lines: LogLine[]): Insight[] {
  const out: Insight[] = [];

  // 1. Scope and Angles from "Market defined: ... · angles: ..."
  const scopeLine = lines.find((l) => /Market defined:/i.test(l.message))?.message;
  if (scopeLine) {
    const parts = scopeLine.replace(/^Market defined:\s*/i, '').split(/·\s*angles:\s*/i);
    const scopeText = parts[0]?.trim();
    const anglesText = parts[1]?.trim();

    if (scopeText) {
      out.push({
        id: 'scope',
        eyebrow: 'The market, as defined',
        body: scopeText,
        icon: Compass,
      });
    }

    if (anglesText) {
      out.push({
        id: 'angles',
        eyebrow: 'Search angles explored',
        body: anglesText,
        icon: ListTree,
      });
    }
  }

  // 2. Discovered entity cohort
  const discoveryLine = lines.find((l) => /Discovered \d+ entities:/i.test(l.message))?.message;
  if (discoveryLine) {
    const playersText = discoveryLine.replace(/^Discovered \d+ entities:\s*/i, '').trim();
    if (playersText) {
      out.push({
        id: 'players',
        eyebrow: 'Entities discovered',
        body: playersText,
        icon: Radio,
      });
    }
  }

  // 3. Live Assembled Cards (e.g. "+ company card: OpenAI (T7) · 4 metrics")
  const cardLines = lines
    .filter((l) => l.message.startsWith('+ ') || /card:/i.test(l.message))
    .map((l) => l.message.replace(/^\+\s*/, ''));

  if (cardLines.length > 0) {
    out.push({
      id: 'cards_assembled',
      eyebrow: `Cards Assembled · ${cardLines.length}`,
      body: cardLines.slice(-5).join(' · '),
      icon: Layers,
    });
  }

  // 4. Honest gaps & warnings
  const warns = lines.filter((l) => l.kind === 'warn');
  if (warns.length > 0) {
    out.push({
      id: 'gaps',
      eyebrow: `Gaps & Exclusions · ${warns.length}`,
      body: warns
        .slice(-2)
        .map((w) => w.message)
        .join(' · '),
      icon: ShieldCheck,
    });
  }

  // Method primers — always present, clearly labelled, so the carousel has
  // substance in the first seconds before findings arrive.
  out.push({
    id: 'signals',
    eyebrow: 'What we capture per company',
    body: 'Market share, ARR, valuation or market cap, team size, and user base — then a maturity tier from T1 The Sandbox up to T8 The Titans.',
    icon: Layers,
    method: true,
  });
  out.push({
    id: 'discipline',
    eyebrow: 'The rule we don’t break',
    body: 'Every figure is tagged verified, estimated, or unknown, with a source. Anything we can’t stand behind stays Unknown — we never invent a number to fill a gap.',
    icon: ShieldCheck,
    method: true,
  });

  return out;
}

/** Build a separate narrative stream for the Market Brief; never echo raw log lines. */
function buildBriefSlides(lines: LogLine[], message: string): Insight[] {
  const sourceCount = lines.filter((line) => line.kind === 'find').length;
  const warningCount = lines.filter((line) => line.kind === 'warn').length;
  const marketMatch = `${message} ${lines.map((line) => line.message).join(' ')}`.match(
    /(?:Research|Market defined|Deck ready):?\s*["']?([^"'·]+)["']?/i,
  );
  const market = marketMatch?.[1]?.trim() || 'this market';
  const discovered = lines.find((line) => /Discovered \d+ entities:/i.test(line.message));
  const discoveredCount = discovered?.message.match(/Discovered (\d+) entities/i)?.[1] ?? 'new';

  return [
    {
      id: 'brief-market',
      eyebrow: 'Market lens',
      body: `We’re mapping ${market} through company health, competitive position, and the signals that shape who moves next.`,
      icon: Compass,
    },
    {
      id: 'brief-discovery',
      eyebrow: 'Discovery pulse',
      body: `The research pass has opened a field of ${discoveredCount} candidate entities and is separating durable players from noise.`,
      icon: Radio,
    },
    {
      id: 'brief-coverage',
      eyebrow: 'Coverage in motion',
      body: 'Company, infrastructure, distribution, culture, vice, insight, and barrier signals are being checked against the same market brief.',
      icon: Layers,
    },
    {
      id: 'brief-momentum',
      eyebrow: 'What we’re watching',
      body: 'Momentum, customer pull, capital intensity, team depth, and market share are the first lenses for understanding who has room to move.',
      icon: ListTree,
    },
    {
      id: 'brief-evidence',
      eyebrow: 'Evidence first',
      body: sourceCount > 0
        ? `${sourceCount} grounded finding${sourceCount === 1 ? '' : 's'} have entered the evidence trail so far.`
        : 'Grounded findings will appear here as the search pass returns credible evidence.',
      icon: ShieldCheck,
    },
    {
      id: 'brief-signal',
      eyebrow: 'Signal over noise',
      body: 'A company only earns a place in the deck when the evidence supports the claim. Unclear figures stay Unknown instead of becoming false precision.',
      icon: CheckCircle2,
    },
    {
      id: 'brief-landscape',
      eyebrow: 'Competitive landscape',
      body: 'The final deck will make it easier to compare maturity, market share, customer reach, and strategic position side by side.',
      icon: Compass,
    },
    {
      id: 'brief-gaps',
      eyebrow: 'Gaps worth chasing',
      body: warningCount > 0
        ? `${warningCount} research gap${warningCount === 1 ? '' : 's'} has been flagged for a transparent follow-up.`
        : 'The pass is also looking for gaps, exclusions, and categories where a second research run could add coverage.',
      icon: Newspaper,
    },
    {
      id: 'brief-expansion',
      eyebrow: 'Room to expand',
      body: 'When the first pass is complete, you can ask for more sourced companies, infrastructure, or distribution players without restarting the deck.',
      icon: Layers,
    },
    {
      id: 'brief-next',
      eyebrow: 'Your next move',
      body: 'When the run finishes, open the deck, test the claims, and decide which signal deserves the next question.',
      icon: Radio,
    },
  ];
}

/** Tokyo-night-inspired high-contrast palette for multicolor terminal delivery. */
const TERM_PALETTE = [
  'text-[#7AA2F7]', // blue
  'text-[#9ECE6A]', // green
  'text-[#E0AF68]', // amber
  'text-[#BB9AF7]', // purple
  'text-[#7DCFFF]', // cyan
  'text-[#F7768E]', // rose
  'text-[#C0CAF5]', // soft white
];

function LiveLog({
  lines,
  isRunning,
  delivery,
}: {
  lines: LogLine[];
  isRunning: boolean;
  delivery?: { marketName: string; quote: MarketQuote };
}) {
  const ref = useRef<HTMLDivElement>(null);
  const startAt = lines[0]?.at ?? Date.now();

  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' });
  }, [lines.length, delivery]);

  const color = (k: LogLine['kind'], i: number) =>
    k === 'find'
      ? 'text-[#9ECE6A]'
      : k === 'warn'
        ? 'text-[#E0AF68]'
        : TERM_PALETTE[i % TERM_PALETTE.length]!;
  const prefix = (k: LogLine['kind']) => (k === 'find' ? '✓' : k === 'warn' ? '!' : '▸');

  return (
    <div
      ref={ref}
      className="research-terminal h-60 overflow-y-auto rounded-xl p-4 font-mono text-[12.5px] leading-relaxed"
      aria-live="polite"
      aria-label="Live research log"
    >
      {lines.map((l, i) => {
        const elapsedSec = Math.max(0, Math.round((l.at - startAt) / 1000));
        return (
          <div key={i} className="flex items-start gap-2 py-0.5">
            <span className="shrink-0 select-none text-[11px] text-[#565F89]">[+{elapsedSec}s]</span>
            <span className={cn('shrink-0 font-bold', color(l.kind, i))}>{prefix(l.kind)}</span>
            <span className={cn(color(l.kind, i + 2))}>{l.message}</span>
          </div>
        );
      })}
      {isRunning && (
        <div className="mt-1 flex items-center gap-2 text-[#7AA2F7]">
          <span className="animate-pulse">▮</span>
          <span className="text-[11px] italic text-[#A9B1D6]">Researching live…</span>
        </div>
      )}
      {!isRunning && delivery && (
        <div className="mt-4 space-y-2 border-t border-[#3B4261] pt-3">
          <div className="text-[#9ECE6A] font-semibold">✓ Your deck is ready.</div>
          <div className="text-[#7DCFFF]">
            Deck ready: <span className="text-[#C0CAF5]">{delivery.marketName}</span>
          </div>
          <div className="text-[#BB9AF7] italic leading-relaxed">
            “{delivery.quote.text}”
          </div>
          <div className="text-[11px] text-[#E0AF68]">— {delivery.quote.attribution}</div>
          <div className="text-[11px] text-[#565F89]">A note to carry into the deck.</div>
        </div>
      )}
    </div>
  );
}

interface MarketQuote {
  text: string;
  attribution: string;
}

/** Curated market-entry quotes. Prefer a match from the brief; otherwise rotate a strong default. */
function pickMarketQuote(lines: LogLine[], message: string): MarketQuote {
  const hay = `${message} ${lines.map((l) => l.message).join(' ')}`.toLowerCase();
  const library: Array<{ match: RegExp; quote: MarketQuote }> = [
    {
      match: /ai|artificial intelligence|llm|model|frontier/,
      quote: {
        text: 'The best way to predict the future is to invent it.',
        attribution: 'Alan Kay',
      },
    },
    {
      match: /apparel|fashion|clothing|retail|brand/,
      quote: {
        text: 'Style is a way to say who you are without having to speak.',
        attribution: 'Rachel Zoe',
      },
    },
    {
      match: /health|biotech|pharma|med/,
      quote: {
        text: 'The good physician treats the disease; the great physician treats the patient who has the disease.',
        attribution: 'William Osler',
      },
    },
    {
      match: /energy|climate|carbon|solar|grid/,
      quote: {
        text: 'We are the first generation to feel the effect of climate change and the last generation who can do something about it.',
        attribution: 'Barack Obama',
      },
    },
    {
      match: /finance|fintech|bank|payment|capital/,
      quote: {
        text: 'Price is what you pay. Value is what you get.',
        attribution: 'Warren Buffett',
      },
    },
  ];
  for (const entry of library) {
    if (entry.match.test(hay)) return entry.quote;
  }
  const defaults: MarketQuote[] = [
    {
      text: 'In the middle of difficulty lies opportunity.',
      attribution: 'Albert Einstein',
    },
    {
      text: 'Markets are conversations.',
      attribution: 'The Cluetrain Manifesto',
    },
    {
      text: 'The only way to do great work is to love what you do.',
      attribution: 'Steve Jobs',
    },
  ];
  const idx = Math.abs(hay.length) % defaults.length;
  return defaults[idx]!;
}

function LiveMarketTicker({
  lines,
  message,
  marketUpdates,
}: {
  lines: LogLine[];
  message: string;
  marketUpdates?: MarketUpdate[];
}) {
  const slides = useMemo(() => buildBriefSlides(lines, message), [lines, message]);
  const hasUpdates = (marketUpdates?.length ?? 0) > 0;

  return (
    <div className="flex h-60 flex-col justify-between overflow-hidden rounded-xl border border-border bg-surface-2 p-5" aria-live="polite">
      <div className="flex items-center gap-2 text-primary-ink">
        <Newspaper className="h-4 w-4" />
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.18em]">
          {hasUpdates ? 'Live market updates' : 'Research guidance'}
        </span>
        <span className="chip border-positive/30 bg-positive/10 px-1.5 py-0 text-[9px] uppercase tracking-wide text-positive">
          {hasUpdates ? 'grounded search' : 'while we research'}
        </span>
      </div>
      <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2" aria-label="Market updates; scroll horizontally">
        {hasUpdates
          ? marketUpdates!.map((update, index) => (
              <article key={update.id} className="min-w-[min(82vw,20rem)] snap-start rounded-xl border border-border bg-surface p-4 shadow-soft">
                <div className="flex items-center gap-2 text-primary-ink">
                  <Newspaper className="h-4 w-4" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">Market update</span>
                  <span className="ml-auto text-[10px] text-faint">{index + 1}/{marketUpdates!.length}</span>
                </div>
                <h3 className="mt-3 font-display text-sm font-semibold leading-snug text-content">{update.headline}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{update.summary}</p>
                <a href={update.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex text-[11px] text-primary-ink hover:underline">
                  {update.sourceTitle}
                </a>
              </article>
            ))
          : slides.map((slide, index) => {
              const Icon = slide.icon;
              return (
                <article key={slide.id} className="min-w-[min(82vw,18rem)] snap-start rounded-xl border border-border bg-surface p-4 shadow-soft">
                  <div className="flex items-center gap-2 text-primary-ink">
                    <Icon className="h-4 w-4" />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">{slide.eyebrow}</span>
                    <span className="ml-auto text-[10px] text-faint">{index + 1}/{slides.length}</span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-content">{slide.body}</p>
                </article>
              );
            })}
      </div>
      <p className="text-[11px] text-faint">
        {hasUpdates
          ? 'A separate fast search is filling these cards with current, sourced developments. Scroll at your pace.'
          : 'Helpful guidance while the separate market-updates search is still collecting sourced developments.'}
      </p>
    </div>
  );
}

function MarketBrief({
  insights,
  completed,
  quote,
  marketName,
}: {
  insights: Insight[];
  completed?: boolean;
  quote?: MarketQuote;
  marketName?: string;
}) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = insights.length;

  useEffect(() => {
    if (i >= count) setI(0);
  }, [count, i]);

  useEffect(() => {
    if (completed || paused || count <= 1) return;
    const t = setTimeout(() => setI((n) => (n + 1) % count), 5200);
    return () => clearTimeout(t);
  }, [i, paused, count, completed]);

  if (completed && quote) {
    return (
      <div className="relative flex h-60 flex-col justify-between overflow-hidden rounded-xl border border-border bg-gradient-to-br from-surface to-surface-2 p-5">
        <div className="mi-brief-in">
          <div className="flex items-center gap-2 text-primary-ink">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.18em]">
              Enter the market
            </span>
            {marketName && (
              <span className="chip border-border px-1.5 py-0 text-[9px] uppercase tracking-wide text-faint">
                {marketName}
              </span>
            )}
          </div>
          <p className="mt-4 max-w-2xl font-display text-[20px] font-medium leading-snug text-content">
            “{quote.text}”
          </p>
          <p className="mt-3 text-sm text-muted">— {quote.attribution}</p>
        </div>
        <p className="text-[11px] text-faint">
          A high-stakes market rewards clear eyes. Carry this into the deck.
        </p>
      </div>
    );
  }

  if (!count) return null;
  const active = insights[Math.min(i, count - 1)]!;
  const Icon = active.icon;

  return (
    <div
      className="relative flex h-60 flex-col justify-between overflow-hidden rounded-xl border border-border bg-gradient-to-br from-surface to-surface-2 p-5"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-live="polite"
    >
      <div key={active.id} className="mi-brief-in">
        <div className="flex items-center gap-2 text-primary-ink">
          <Icon className="h-4 w-4" />
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.18em]">
            {active.eyebrow}
          </span>
          {active.method && (
            <span className="chip border-border px-1.5 py-0 text-[9px] uppercase tracking-wide text-faint">
              how it works
            </span>
          )}
        </div>
        <p className="mt-3 max-w-2xl font-display text-[19px] font-medium leading-snug text-content">
          {active.body}
        </p>
      </div>

      <div className="flex items-center gap-1.5">
        {insights.map((s, n) => (
          <button
            key={s.id}
            type="button"
            aria-label={`Show ${s.eyebrow}`}
            onClick={() => setI(n)}
            className={cn(
              'h-1.5 rounded-full transition-all',
              n === i ? 'w-6 bg-primary' : 'w-1.5 bg-border hover:bg-faint',
            )}
          />
        ))}
        <span className="ml-auto text-[10px] text-faint">
          {paused ? 'paused' : 'auto-advancing'}
        </span>
      </div>
    </div>
  );
}

function marketNameFromMessage(message: string): string {
  const ready = message.match(/Deck ready:\s*(.+)$/i);
  if (ready?.[1]) return ready[1].trim();
  const research = message.match(/Research:\s*"([^"]+)"/i);
  if (research?.[1]) return research[1].trim();
  return 'this market';
}

export function ResearchStage({
  lines,
  message,
  pct,
  status = 'running',
  marketUpdates,
}: {
  lines: LogLine[];
  message: string;
  pct: number;
  status?: 'running' | 'completed' | 'failed';
  marketUpdates?: MarketUpdate[];
}) {
  const [tab, setTab] = useState<'log' | 'brief'>('log');
  const [minimized, setMinimized] = useState(false);
  const insights = useMemo(() => deriveInsights(lines), [lines]);
  const isRunning = status === 'running';
  const isCompleted = status === 'completed';
  const quote = useMemo(
    () => (isCompleted ? pickMarketQuote(lines, message) : undefined),
    [isCompleted, lines, message],
  );
  const marketName = useMemo(() => marketNameFromMessage(message), [message]);
  const stageTitle =
    status === 'completed'
      ? 'Research complete'
      : status === 'failed'
        ? 'Research paused'
        : 'Researching your market…';

  // Prefer the brief/quote when the run finishes — emotional landing beat.
  useEffect(() => {
    if (isCompleted) setTab('brief');
  }, [isCompleted]);

  return (
    <section
      className={cn(
        'panel mt-6 p-4 sm:p-6 transition-all duration-300',
        isRunning && !minimized && 'glow-border',
      )}
      aria-label="Research progress"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMinimized((value) => !value)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-muted hover:text-content"
            aria-expanded={!minimized}
            aria-controls="research-stage-details"
          >
            {minimized ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
            {minimized ? 'Expand' : 'Minimize'}
          </button>
          {isRunning ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary-ink" />
          ) : (
            <CheckCircle2
              className={cn('h-5 w-5', isCompleted ? 'text-positive' : 'text-muted')}
            />
          )}
          <span className="font-medium text-content">{stageTitle}</span>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-border bg-surface-2 p-1">
          {(
            [
              ['log', 'Live log', Terminal],
              ['brief', isCompleted ? 'Entry note' : 'Market brief', Compass],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              aria-pressed={tab === id}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                tab === id
                  ? 'bg-surface text-content shadow-soft'
                  : 'text-muted hover:text-content',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {minimized ? (
        <div className="mt-4 flex items-center gap-2 border-t border-border pt-4 text-sm text-muted">
          <Coffee className="h-4 w-4 shrink-0 text-primary-ink" />
          <span>This will take a few minutes. Go grab a cup of coffee and come back.</span>
        </div>
      ) : (
        <div id="research-stage-details">
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${Math.round(Math.min(1, pct) * 100)}%` }}
        />
      </div>
      <p className="mt-3 text-sm text-muted">{message}</p>

      <div className="mt-4">
        {tab === 'log' ? (
          <LiveLog
            lines={lines}
            isRunning={isRunning}
            delivery={
              isCompleted && quote
                ? { marketName, quote }
                : undefined
            }
          />
        ) : isRunning ? (
          <LiveMarketTicker lines={lines} message={message} marketUpdates={marketUpdates} />
        ) : (
          <MarketBrief
            insights={insights}
            completed={isCompleted}
            quote={quote}
            marketName={marketName}
          />
        )}
      </div>

      <p className="mt-3 text-xs text-muted">
        {tab === 'log'
          ? isRunning
            ? 'You’re watching the agent’s actual research steps — grounded Google searches, companies found, and cards assembled.'
            : 'Multicolor delivery log of the completed run — every line is a real step, not a summary.'
          : isCompleted
            ? 'A quote to set the frame before you open the deck.'
            : 'Findings come from this run; “how it works” cards explain the method.'}
      </p>
        </div>
      )}
    </section>
  );
}
