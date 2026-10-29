import * as React from 'react';
import { cn } from '@/lib/utils';
import { Slider as SliderPrimitive } from 'radix-ui';

/** shadcn's slider, with one thumb and a bigger grip for thumbs on phones. */
function Slider({
  className,
  thumbLabel,
  thumbValueText,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root> & {
  thumbLabel?: string;
  thumbValueText?: string;
}) {
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={cn(
        'relative flex w-full touch-none items-center py-2 select-none data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className="relative h-2 w-full grow overflow-hidden rounded-full bg-muted"
      >
        <SliderPrimitive.Range data-slot="slider-range" className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        data-slot="slider-thumb"
        aria-label={thumbLabel}
        aria-valuetext={thumbValueText}
        className="block size-6 shrink-0 cursor-grab rounded-full border-2 border-primary bg-background shadow-md transition-[box-shadow,scale] duration-75 outline-none hover:ring-4 hover:ring-ring/30 focus-visible:ring-4 focus-visible:ring-ring/50 active:scale-110 active:cursor-grabbing disabled:pointer-events-none"
      />
    </SliderPrimitive.Root>
  );
}

export { Slider };
