import { usePortalInfo } from '@eventkit/sdk/react';
import { FileTextIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Markdown } from '@/components/Markdown';

const IMAGE = /\.(jpe?g|png|webp)(\?|$)/i;

/** How to pay, as the organisers set it up: written instructions, a file, a UPI QR. */
export function PaymentInstructions() {
  const { event, paymentInstructionsUrl, paymentQrUrl } = usePortalInfo().data!;
  const { paymentInstructions } = event;
  if (!paymentInstructions && !paymentInstructionsUrl && !paymentQrUrl) {
    return (
      <p className="text-sm text-muted-foreground">
        The organisers haven't said how to pay yet. Ask them, then upload your receipt here.
      </p>
    );
  }
  return (
    <div
      className="grid gap-4 rounded-lg border bg-muted/50 p-4 text-sm sm:grid-cols-[1fr_auto]"
      aria-label="How to pay"
    >
      <div className="grid content-start gap-3">
        {paymentInstructions && (
          <Markdown className="leading-relaxed">{paymentInstructions}</Markdown>
        )}
        {paymentInstructionsUrl &&
          (IMAGE.test(new URL(paymentInstructionsUrl).pathname) ? (
            <img
              src={paymentInstructionsUrl}
              alt="Payment instructions"
              className="max-h-96 w-full rounded-md border bg-white object-contain"
            />
          ) : (
            <Button asChild variant="outline" size="sm" className="w-fit">
              <a href={paymentInstructionsUrl} target="_blank" rel="noreferrer">
                <FileTextIcon />
                Open the payment instructions (PDF)
              </a>
            </Button>
          ))}
      </div>
      {paymentQrUrl && (
        <img
          src={paymentQrUrl}
          alt="UPI QR code to pay"
          className="size-44 justify-self-center rounded-md border bg-white object-contain p-2"
        />
      )}
    </div>
  );
}
