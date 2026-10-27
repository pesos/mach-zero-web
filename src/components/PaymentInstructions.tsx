import { usePortalInfo } from '@eventkit/sdk/react';

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
    <div className="grid gap-3 text-sm" aria-label="How to pay">
      {paymentInstructions && <p className="whitespace-pre-line">{paymentInstructions}</p>}
      {paymentInstructionsUrl &&
        (IMAGE.test(new URL(paymentInstructionsUrl).pathname) ? (
          <img
            src={paymentInstructionsUrl}
            alt="Payment instructions"
            className="max-h-96 w-full rounded border object-contain"
          />
        ) : (
          <a
            href={paymentInstructionsUrl}
            target="_blank"
            rel="noreferrer"
            className="font-medium underline"
          >
            Open the payment instructions (PDF)
          </a>
        ))}
      {paymentQrUrl && (
        <img
          src={paymentQrUrl}
          alt="UPI QR code to pay"
          className="h-48 w-48 rounded border object-contain"
        />
      )}
    </div>
  );
}
