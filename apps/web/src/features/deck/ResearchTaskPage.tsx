import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useTaskManager } from '@/lib/tasks/TaskManagerContext';
import { ResearchStage } from './ResearchStage';
import { BrandMark } from '@/components/BrandMark';

export default function ResearchTaskPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const { getTask } = useTaskManager();

  const task = taskId ? getTask(taskId) : undefined;

  if (!task) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <h1 className="font-display text-2xl font-semibold text-content">Task not found</h1>
        <p className="mt-2 text-sm text-muted">
          The requested research task could not be found or was cleared.
        </p>
        <Link to="/" className="btn-primary mt-6 inline-flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to markets
        </Link>
      </div>
    );
  }

  const isRunning = task.status === 'running';
  const isCompleted = task.status === 'completed';
  const isFailed = task.status === 'failed';

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4">
        <Link
          to={task.marketId ? `/markets/${task.marketId}/deck` : '/'}
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-content"
        >
          <ArrowLeft className="h-4 w-4" />
          {task.marketId ? 'Back to deck' : 'Back to markets'}
        </Link>
      </div>

      {/* Task context stays deliberately light; the live stage below is the single primary panel. */}
      <div>
        {/* Task title and state */}
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <BrandMark size="md" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                {task.type === 'deck_create' ? 'Deck loading' : 'Deck refresh'}
              </span>
            </div>
            <h1 className="mt-1 font-display text-2xl font-semibold text-content">{task.title}</h1>
          </div>

          <div className="flex items-center gap-2">
            {isRunning && (
              <span className="chip border-primary/40 bg-primary/10 text-primary-ink">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Research running
              </span>
            )}
            {isFailed && (
              <span className="chip border-negative/40 bg-negative/10 text-negative">
                <XCircle className="h-3.5 w-3.5" />
                Research failed
              </span>
            )}
          </div>
        </div>

        {/* Single completion CTA — no competing View Deck / Deck ready chips */}
        {isCompleted && task.marketId && (
          <div className="panel-2 mt-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-positive" />
              <div>
                <p className="text-sm font-semibold text-content">Your deck is ready.</p>
                <p className="mt-0.5 text-xs text-muted">
                  Source-backed cards are assembled. Open the deck when you are ready.
                </p>
              </div>
            </div>
            <Link
              to={`/markets/${task.marketId}/deck`}
              className="btn-primary shrink-0 self-start sm:self-auto"
            >
              Open deck
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}

        {/* Failure Error Banner: Displays error message if research pass fails */}
        {isFailed && (
          <div className="mt-4 border-l-2 border-negative bg-negative/10 px-4 py-3 text-negative">
            <p className="text-sm font-semibold">Research encountered an error</p>
            <p className="mt-1 text-xs">
              {task.error || 'Check your Gemini API key and try again.'}
            </p>
          </div>
        )}

        {/* Live research stage */}
        <ResearchStage
          lines={task.log}
          message={
            isCompleted
              ? task.currentStep?.startsWith('Deck ready:')
                ? task.currentStep
                : `Deck ready: ${task.title.replace(/^Research:\s*"?([^"]+)"?.*$/i, '$1')}`
              : task.currentStep
          }
          pct={task.progress}
          status={task.status}
          marketUpdates={task.marketUpdates}
        />
      </div>
    </div>
  );
}
