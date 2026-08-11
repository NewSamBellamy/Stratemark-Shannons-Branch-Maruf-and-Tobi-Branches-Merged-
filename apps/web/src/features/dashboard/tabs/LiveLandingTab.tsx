import { useEffect, useState } from 'react';
import { ClipboardCheck, ExternalLink, ImageOff, MonitorPlay } from 'lucide-react';
import { useCompany, useDashboardTab } from '@/hooks/data';
import { QueryBoundary } from '@/components/states/QueryBoundary';
import { useDeepDive } from '@/features/deepdive/DeepDive';

export function LiveLandingTab({ companyId }: { companyId: string }) {
  const query = useDashboardTab(companyId, 'live_landing');
  const name = useCompany(companyId).data?.name ?? 'this company';
  const { chat } = useDeepDive();
  const [iframeFailed, setIframeFailed] = useState(false);
  const [screenshotFailed, setScreenshotFailed] = useState(false);

  // The server's embeddability probe is advisory: a site can change its headers
  // after the dashboard snapshot was written, and some browsers report that as
  // a failed iframe load. Keep the web view usable without changing the contract.
  useEffect(() => {
    setIframeFailed(false);
    setScreenshotFailed(false);
  }, [query.data?.content.url, query.data?.content.embeddable, query.data?.content.screenshotUrl]);

  return (
    <QueryBoundary query={query}>
      {(result) => {
        const { url, embeddable, screenshotUrl } = result.content;
        return (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-muted">
                The company’s live site. In the desktop shell this renders via Electron BrowserView;
                on the web we embed via iframe with a fallback for sites that block embedding.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn-ghost"
                  title="Grounded audit of this landing page: positioning, message, conversion"
                  onClick={() =>
                    chat(
                      { kind: 'datapoint', deckId: null, companyId, subject: `${name} landing page` },
                      {
                        seed: `Audit ${name}'s landing page (${url}) as a conversion-minded marketer: what is the positioning and promise, what's working, what's weak, and what would you test first? Ground observations in what search results and coverage actually say about the site and its messaging.`,
                      },
                    )
                  }
                >
                  <ClipboardCheck className="h-4 w-4" />
                  Audit this page
                </button>
                <a href={url} target="_blank" rel="noopener noreferrer" className="btn-ghost">
                  <ExternalLink className="h-4 w-4" />
                  Open site
                </a>
              </div>
            </div>

            {embeddable && !iframeFailed ? (
              <div className="panel h-[560px] overflow-hidden">
                <iframe
                  title={`Live site for ${companyId}`}
                  src={url}
                  className="h-full w-full border-0 bg-white"
                  sandbox="allow-scripts allow-same-origin allow-popups"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  onError={() => setIframeFailed(true)}
                />
              </div>
            ) : (
              <div className="panel flex h-[560px] flex-col items-center justify-center gap-4 p-8 text-center">
                {screenshotUrl && !screenshotFailed ? (
                  <img
                    src={screenshotUrl}
                    alt="Site preview"
                    className="max-h-[380px] rounded-lg border border-border"
                    onError={() => setScreenshotFailed(true)}
                  />
                ) : (
                  <div className="rounded-full bg-surface-2 p-4 text-muted">
                    <ImageOff className="h-7 w-7" />
                  </div>
                )}
                <div>
                  <h3 className="font-display text-lg text-content">
                    {iframeFailed ? 'This site could not be displayed here' : 'This site blocks embedding'}
                  </h3>
                  <p className="mx-auto mt-1 max-w-md text-sm text-muted">
                    {iframeFailed ? (
                      'The live preview failed to load in this browser. You can still open the site directly; a captured preview is shown when available.'
                    ) : (
                      <>The site sends <code className="text-content">X-Frame-Options</code> /{' '}
                        <code className="text-content">CSP frame-ancestors</code> headers that prevent
                        iframing. The desktop build will capture a live screenshot via BrowserView; for
                        now, open it directly.</>
                    )}
                  </p>
                </div>
                <a href={url} target="_blank" rel="noopener noreferrer" className="btn-primary">
                  <MonitorPlay className="h-4 w-4" />
                  Open live site
                </a>
              </div>
            )}
          </div>
        );
      }}
    </QueryBoundary>
  );
}
