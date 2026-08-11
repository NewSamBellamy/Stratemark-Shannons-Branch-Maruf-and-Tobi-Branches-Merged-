import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, LayoutDashboard, ExternalLink } from 'lucide-react';
import { CARD_TYPE_LABELS, METRIC_TYPE_LABELS, isSignalCardType, publisherOf, type CardWithCompany } from '@mi/contracts';
import { Modal } from '@/components/ui/Modal';
import { formatMetricValue } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Logo } from './Logo';
import { ConfidenceBadge } from './ConfidenceBadge';
import { CmsBreakdown } from './CmsBreakdown';
import { ViceClaims } from './ViceClaims';
import { SoftDataDisclaimer } from './CardDisclaimer';
import { DigDeeper, useDeepDive } from '@/features/deepdive/DeepDive';
import { FactCheck } from '@/features/factcheck/FactCheck';

/**
 * The card reader — full-width, responsive layout. No longer shows a miniature
 * card inside a modal; instead shows the company's data directly with the logo
 * inline, using the full available width.
 */
export function CardReader({
  data,
  open,
  onOpenChange,
  deckUserValues,
  marketId,
}: {
  data: CardWithCompany | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deckUserValues: number[];
  marketId?: string;
}) {
  const navigate = useNavigate();
  const { chat } = useDeepDive();
  const [pointIndex, setPointIndex] = useState(0);
  useEffect(() => setPointIndex(0), [data?.card.id]);
  if (!data) return null;

  const { card, company, metrics, viceClaims } = data;
  const title = company?.name ?? card.title ?? 'Card';
  const hasSoft = metrics.some((m) => m.confidence !== 'verified');
  // Signal cards share one report-style reader whether or not the research pass
  // attached them to a company; company cards keep the metric/CMS reader.
  const isMarketCard = !company || isSignalCardType(card.cardType);
  const isCompanyScored = card.cardType !== 'barrier' && card.tier != null;

  // ---- Market-level reader ------------------------------------------------
  if (isMarketCard) {
    const cited = card.citations?.[0];
    const activePoint = card.keyPoints[pointIndex] ?? card.keyPoints[0];
    const totalPoints = card.keyPoints.length;
    const askAboutCard = () => {
      onOpenChange(false);
      chat(
        { kind: 'cards', deckId: card.deckId, cardIds: [card.id], subject: card.title },
        { seed: `Dig into "${card.title}" — what's the full picture?` },
      );
    };
    return (
      <Modal open={open} onOpenChange={onOpenChange} title={title} size="lg">
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <span className="chip border-primary/30 bg-primary/5 text-primary-ink">
              {CARD_TYPE_LABELS[card.cardType]} report
            </span>
            {company && <span className="text-xs text-muted">About {company.name}</span>}
          </div>
          {card.summary && <p className="text-sm leading-relaxed text-content">{card.summary}</p>}
          {activePoint && (
            <div className="rounded-2xl border border-border bg-surface-2 p-5">
              <div className="flex items-center justify-between gap-3">
                <h4 className="font-display text-sm font-semibold text-content">Key point {pointIndex + 1} of {totalPoints}</h4>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="rounded-full border border-border bg-surface p-1 text-muted hover:text-content disabled:opacity-40"
                    onClick={() => setPointIndex((value) => Math.max(0, value - 1))}
                    disabled={pointIndex === 0}
                    aria-label="Previous key point"
                  ><ChevronLeft className="h-4 w-4" /></button>
                  <button
                    type="button"
                    className="rounded-full border border-border bg-surface p-1 text-muted hover:text-content disabled:opacity-40"
                    onClick={() => setPointIndex((value) => Math.min(totalPoints - 1, value + 1))}
                    disabled={pointIndex >= totalPoints - 1}
                    aria-label="Next key point"
                  ><ChevronRight className="h-4 w-4" /></button>
                </div>
              </div>
              <p className="mt-4 text-base leading-relaxed text-content">{activePoint}</p>
              <div className="mt-4 flex gap-1.5" aria-hidden="true">
                {card.keyPoints.map((_, index) => (
                  <span key={index} className={cn('h-1.5 rounded-full transition-all', index === pointIndex ? 'w-8 bg-primary' : 'w-1.5 bg-border')} />
                ))}
              </div>
            </div>
          )}
          {card.cardType === 'vice' && viceClaims.length > 0 && (
            <ViceClaims claims={viceClaims} companyName={company?.name} />
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted">
            <span>{cited ? publisherOf(cited.url, cited.title) : 'No source'}</span>
            <button type="button" className="btn-primary px-3 py-1.5 text-xs" onClick={askAboutCard}>Ask AI</button>
          </div>
        </div>
      </Modal>
    );
  }

  // ---- Company reader: full-width, responsive 2-col -----------------------
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title} size="2xl">
      {/* ── Company header — premium layout ── */}
      <div className="mb-6 flex items-start gap-4 border-b border-border pb-5">
        <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-[12px] border border-border bg-surface-2 p-1">
          <Logo
            name={company.name}
            website={company.websiteUrl}
            logoUrl={company.logoUrl}
            className="h-full w-full"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] leading-relaxed text-muted">{company.oneLiner}</p>
          {company.websiteUrl && (
            <a
              href={company.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 inline-flex items-center gap-1 text-[12px] text-primary-ink hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              {company.websiteUrl.replace(/^https?:\/\//, '')}
            </a>
          )}
        </div>
        <button
          type="button"
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-[13px] font-medium text-primary-fg transition-opacity hover:opacity-90"
          onClick={() => {
            onOpenChange(false);
            navigate(
              `/company/${company.id}/dashboard/overview${marketId ? `?deck=${marketId}` : ''}`,
            );
          }}
        >
          <LayoutDashboard className="h-4 w-4" />
          View more
        </button>
      </div>

      {/* Content: evidence + score side by side on large, stacked on small */}
      <div className="grid gap-5 md:grid-cols-[1fr_280px]">
        {/* Evidence */}
        <div className="min-w-0 space-y-4">
          {metrics.length > 0 && (
            <div className="rounded-xl border border-border p-5">
              <h4 className="mb-4 font-display text-[14px] font-semibold text-content">Key metrics</h4>
              <ul className="space-y-3">
                {metrics.map((m) => (
                  <li key={m.id} className="text-[13px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-muted">{METRIC_TYPE_LABELS[m.metricType]}</span>
                      <span className="flex items-center gap-2">
                        <span className="font-semibold tabular-nums text-content">
                          {formatMetricValue(m.metricType, m.value)}
                        </span>
                        <ConfidenceBadge
                          confidence={m.confidence}
                          note={m.methodNote}
                          source={m.source}
                          citations={m.citations}
                          metricLabel={METRIC_TYPE_LABELS[m.metricType]}
                        />
                        <DigDeeper
                          topic={`${METRIC_TYPE_LABELS[m.metricType]} — deep dive`}
                          companyId={company.id}
                          companyName={company.name}
                          context={`Current ${METRIC_TYPE_LABELS[m.metricType]}: ${formatMetricValue(m.metricType, m.value)}`}
                        />
                      </span>
                    </div>
                    {m.confidence === 'estimated' && m.methodNote && (
                      <p className="mt-0.5 text-[11px] italic text-muted">
                        How we got this: {m.methodNote}
                      </p>
                    )}
                    {m.value != null && m.confidence !== 'unknown' && (
                      <div className="mt-1">
                        <FactCheck
                          claim={`${company.name}'s ${METRIC_TYPE_LABELS[m.metricType]} is ${formatMetricValue(m.metricType, m.value)}`}
                          companyName={company.name}
                        />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              {hasSoft && (
                <div className="mt-3 border-t border-border pt-3">
                  <SoftDataDisclaimer />
                </div>
              )}
            </div>
          )}

          {isSignalCardType(card.cardType) && viceClaims.length > 0 && (
            <ViceClaims claims={viceClaims} companyName={company?.name} />
          )}
        </div>

        {/* Score */}
        <div className="min-w-0">
          {isCompanyScored ? (
            <CmsBreakdown card={card} metrics={metrics} deckUserValues={deckUserValues} />
          ) : (
            <div className="rounded-xl border border-border bg-surface-2 p-4 text-sm text-muted">
              {card.cardType === 'vice'
                ? "A Vice card is a sourced risk signal — it annotates the company; it isn't scored."
                : card.cardType === 'culture'
                  ? "A Culture card is a community signal — it annotates the company; it isn't scored."
                  : 'This card type carries no maturity score.'}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
