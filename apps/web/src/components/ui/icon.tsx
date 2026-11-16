import { HugeiconsIcon } from '@hugeicons/react';
import { type ComponentProps } from 'react';

export const DEFAULT_ICON_STROKE_WIDTH = 2;

export function Icon({
  strokeWidth = DEFAULT_ICON_STROKE_WIDTH,
  ...props
}: ComponentProps<typeof HugeiconsIcon>) {
  return <HugeiconsIcon strokeWidth={strokeWidth} {...props} />;
}
