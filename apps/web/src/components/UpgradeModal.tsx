import { useState } from 'react';
import { useDemo } from '@/lib/demo/DemoContext';
import { useAuth } from '@/lib/auth/AuthContext';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { BrandMark } from '@/components/BrandMark';

export function UpgradeModal() {
  const { isUpgradeModalOpen, closeUpgradeModal, upgradeReason } = useDemo();
  const { user, isAuthenticated, signInWithGoogle } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  const triggerPaddleCheckout = (userEmail?: string | null, userId?: string | null) => {
    const paddleVendorId = import.meta.env.VITE_PADDLE_VENDOR_ID || '12345';
    const paddleProductId = import.meta.env.VITE_PADDLE_PRODUCT_ID || 'pro_tier';
    const checkoutUrl = `https://checkout.paddle.com/checkout/product/${paddleProductId}?vendor=${paddleVendorId}&email=${encodeURIComponent(userEmail || '')}&passthrough=${encodeURIComponent(userId || '')}`;

    if (window.Paddle?.Checkout) {
      window.Paddle.Checkout.open({
        product: paddleProductId,
        email: userEmail || undefined,
        passthrough: userId || undefined,
      });
    } else {
      window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleUpgradeClick = async () => {
    setIsProcessing(true);
    try {
      let activeUser = user;
      if (!isAuthenticated || !activeUser) {
        activeUser = await signInWithGoogle();
      }
      triggerPaddleCheckout(activeUser?.email, activeUser?.id);
    } catch (err) {
      console.error('Upgrade Google Auth error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAlreadyPurchasedSignIn = async () => {
    setIsProcessing(true);
    try {
      await signInWithGoogle();
      closeUpgradeModal();
    } catch (err) {
      console.error('Already purchased sign-in error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      open={isUpgradeModalOpen}
      onOpenChange={(open) => {
        if (!open) closeUpgradeModal();
      }}
      title="Unlock Stratemark Pro"
      description="Pay what you want • Lifetime access across Web & Desktop"
    >
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl border border-border bg-surface-2">
            <BrandMark size="lg" />
          </div>
          <p className="text-sm text-muted">Unlimited competitive intelligence, wherever you work.</p>
        </div>

        {upgradeReason && (
          <div className="rounded-lg border border-neutral/40 bg-neutral/10 p-3 text-sm text-content">
            <span>{upgradeReason}</span>
          </div>
        )}

        <div className="space-y-3">
          {[
            <><strong>Unlimited AI Research</strong> on any market or company</>,
            <><strong>Live Web Scraping</strong> & real-time competitor tracking</>,
            <><strong>Executive Report Exports</strong> (Markdown, PPTX, PDF)</>,
            <><strong>Cross-Device Sync</strong> (Web & Desktop via Google Auth)</>,
          ].map((benefit, index) => (
            <div key={index} className="flex items-center gap-2 text-sm text-content">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-positive" />
              <span>{benefit}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <button onClick={handleUpgradeClick} disabled={isProcessing} className="btn-primary w-full py-3 font-semibold">
            {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <BrandMark size="sm" className="brightness-0 invert" />}
            <span>Upgrade with Paddle — as little as $1</span>
          </button>

          {!isAuthenticated && (
            <button onClick={handleAlreadyPurchasedSignIn} disabled={isProcessing} className="text-center text-xs font-medium text-primary-ink hover:underline disabled:opacity-50">
              Already purchased? Sign in
            </button>
          )}

          <button onClick={closeUpgradeModal} className="text-center text-xs text-muted hover:text-content">
            Continue with Demo Mode
          </button>
        </div>
      </div>
    </Modal>
  );
}

declare global {
  interface Window {
    Paddle?: {
      Checkout?: {
        open: (options: { product: string | number; email?: string; passthrough?: string }) => void;
      };
    };
  }
}
