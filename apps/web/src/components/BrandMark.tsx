import { cn } from '@/lib/cn';
import wordmark from '@/assets/wordmark.svg';

/** Compact Stratemark mark for inline accents — replaces spark/wand/star clichés. */
export function BrandMark({
  className,
  size = 'md',
  alt = '',
}: {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  alt?: string;
}) {
  const dim = size === 'sm' ? 'h-3.5 w-3.5' : size === 'lg' ? 'h-6 w-6' : 'h-4 w-4';
  return (
    <img
      src={wordmark}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      className={cn(dim, 'shrink-0 object-contain opacity-90', className)}
    />
  );
}
