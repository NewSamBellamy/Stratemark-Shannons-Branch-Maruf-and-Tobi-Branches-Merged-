import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Globe2, KeyRound, Mic, MicOff, RefreshCw } from 'lucide-react';
import { useRepository } from '@/lib/repository/RepositoryProvider';
import { useApiKey } from '@/lib/settings/apiKey';
import { useTaskManager } from '@/lib/tasks/TaskManagerContext';
import { useDemo } from '@/lib/demo/DemoContext';
import { BrandMark } from '@/components/BrandMark';
import { cn } from '@/lib/cn';

/** High-impact + niche market seeds. Six shown at a time; refresh reshuffles. */
const SUGGESTION_POOL = [
  'Frontier AI labs',
  'Christian apparel companies',
  'AI code-review startups',
  'Non-alcoholic spirits brands',
  'Precision fermentation companies',
  'Direct-to-consumer pet food',
  'Vertical farming startups',
  'Defense autonomous systems',
  'GLP-1 weight-loss brands',
  'Industrial heat-pump manufacturers',
  'Battery recycling platforms',
  'SMB payroll and benefits software',
  'Private aviation marketplaces',
  'Climate risk insurance tech',
  'Open-source security vendors',
  'Luxury resale marketplaces',
  'Space launch services',
  'Gene therapy CDMOs',
];

function pickSuggestions(exclude: string[] = [], count = 6): string[] {
  const pool = SUGGESTION_POOL.filter((s) => !exclude.includes(s));
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export default function NewDeckPage() {
  const repo = useRepository();
  const navigate = useNavigate();
  const hasKey = useApiKey((s) => s.hasKey);
  const taskManager = useTaskManager();
  const demo = useDemo();

  const [prompt, setPrompt] = useState('');
  const [region, setRegion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>(() => pickSuggestions());
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const basePromptRef = useRef('');

  useEffect(() => {
    setSpeechSupported(!!getSpeechRecognition());
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  }, []);

  useEffect(() => () => stopListening(), [stopListening]);

  const toggleMic = () => {
    if (listening) {
      stopListening();
      return;
    }
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      setError('Voice input is not supported in this browser. Try Chrome or Edge.');
      return;
    }
    setError(null);
    basePromptRef.current = prompt.trim();
    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || 'en-US';
    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i]![0]!.transcript;
      }
      const base = basePromptRef.current;
      const next = base ? `${base} ${transcript}`.trim() : transcript.trim();
      setPrompt(next);
    };
    recognition.onerror = (event) => {
      if (event.error === 'not-allowed') {
        setError('Microphone permission denied. Allow mic access and try again.');
      } else if (event.error && event.error !== 'aborted') {
        setError('Voice capture stopped. Tap the mic to try again.');
      }
      stopListening();
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      setError('Could not start voice input. Tap the mic and try again.');
      stopListening();
    }
  };

  const refreshSuggestions = () => {
    setSuggestions((prev) => pickSuggestions(prev));
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setError(null);
    stopListening();

    if (!demo.consumeDemoQuery()) {
      return;
    }

    const title = `Research: "${prompt.trim()}"${region.trim() ? ` (${region.trim()})` : ''}`;
    const taskId = taskManager.startTask('deck_create', title);

    navigate(`/research/${taskId}`);

    // Run the fast market-updates search in parallel with the full deck research.
    // It has its own result channel so the brief never replays the raw log.
    if (repo.getMarketUpdates) {
      void repo
        .getMarketUpdates({ prompt: prompt.trim(), region: region.trim() || null, limit: 8 }, { taskId })
        .then((updates) => taskManager.setMarketUpdates(taskId, updates))
        .catch(() => taskManager.setMarketUpdates(taskId, []));
    }

    void repo
      .createResearchedDeck(
        { prompt: prompt.trim(), region: region.trim() || null },
        {
          taskId,
          onProgress: (p) => {
            taskManager.appendLog(taskId, p.message, p.kind ?? 'step', p.progress);
          },
        },
      )
      .then(({ market, deck }) => {
        taskManager.completeTask(taskId, {
          marketId: market.id,
          deckId: deck.id,
          message: `Deck ready: ${market.name}`,
        });
      })
      .catch((err) => {
        const msg =
          err instanceof Error ? err.message : 'Research failed. Check your API key and try again.';
        taskManager.failTask(taskId, msg);
      });
  };

  const micLabel = useMemo(() => {
    if (!speechSupported) return 'Voice input unavailable in this browser';
    return listening ? 'Stop voice input' : 'Dictate market brief';
  }, [listening, speechSupported]);

  return (
    <div className="mx-auto max-w-2xl pb-8">
      <div className="mb-6 flex items-center gap-2.5 text-primary-ink">
        <BrandMark size="md" />
        <span className="text-xs font-semibold uppercase tracking-[0.16em]">New deck</span>
      </div>

      <div className="max-w-xl">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-content sm:text-4xl">
          What market should we map?
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted">
          Tell us what you want to understand. We&apos;ll turn the brief into a sourced
          competitive-intelligence deck.
        </p>
      </div>

      {!hasKey && (
        <div className="mt-6 flex items-start gap-2 border-l-2 border-neutral bg-neutral/10 px-4 py-3 text-sm text-content">
          <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-neutral" />
          <span>
            <strong>Demo mode</strong> uses sample data. Add a free Google AI Studio key in{' '}
            <Link to="/settings" className="link">
              Settings
            </Link>{' '}
            for live research.
          </span>
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-8">
        <div className="sm:ml-2">
          <div className="panel-2 min-w-0 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-content">What market should we look at?</p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">
                  A category, a customer problem, or a shortlist is enough to begin.
                </p>
              </div>
              <button
                type="button"
                onClick={refreshSuggestions}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-muted transition-colors hover:border-primary/40 hover:text-content"
                title="Show six different markets"
              >
                <RefreshCw className="h-3 w-3" />
                Refresh
              </button>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {suggestions.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setPrompt(ex)}
                  className={cn(
                    'chip border-border text-muted transition-colors hover:border-primary/40 hover:bg-surface hover:text-content',
                    prompt === ex && 'border-primary/50 bg-primary/5 text-primary-ink',
                  )}
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 sm:ml-[3.75rem]">
          <label className="sr-only" htmlFor="prompt">
            Your market brief
          </label>
          <div className="relative">
            <textarea
              id="prompt"
              className="input min-h-32 resize-y pr-14 text-base leading-relaxed"
              placeholder="Direct-to-consumer Christian apparel brands"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              autoFocus
            />
            <button
              type="button"
              onClick={toggleMic}
              disabled={!speechSupported}
              aria-label={micLabel}
              title={micLabel}
              className={cn(
                'absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-full border transition-colors',
                listening
                  ? 'border-primary bg-primary text-primary-fg shadow-soft'
                  : 'border-border bg-surface text-muted hover:border-primary/40 hover:text-content',
                !speechSupported && 'cursor-not-allowed opacity-40',
              )}
            >
              {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-2.5 text-xs text-muted">
            {listening
              ? 'Listening… speak naturally. Tap the mic again when finished.'
              : 'Use plain language — or tap the mic to dictate. We\u2019ll define the scope before collecting signals.'}
          </p>
        </div>

        <div className="mt-6 border-t border-border pt-6 sm:ml-[3.75rem]">
          <label className="label" htmlFor="region">
            <span className="inline-flex items-center gap-1.5">
              <Globe2 className="h-4 w-4 text-primary-ink" /> Region{' '}
              <span className="font-normal text-muted">(optional)</span>
            </span>
          </label>
          <input
            id="region"
            className="input"
            placeholder="e.g. California, USA"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          />
        </div>

        {error && (
          <p
            className="mt-5 border-l-2 border-negative bg-negative/10 px-4 py-3 text-sm text-negative sm:ml-[3.75rem]"
            role="alert"
          >
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-border pt-6 sm:ml-[3.75rem] sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-relaxed text-muted">
            Every claim is marked verified, estimated, or unknown — never filled in.
          </p>
          <button type="submit" className="btn-primary shrink-0" disabled={!prompt.trim()}>
            {hasKey ? 'Start research' : 'Build sample deck'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
