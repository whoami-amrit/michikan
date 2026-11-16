import { Loading03Icon } from '@hugeicons/core-free-icons';

import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

function Spinner({ className }: React.ComponentProps<'svg'>) {
  return (
    <Icon
      icon={Loading03Icon}
      data-slot="spinner"
      role="status"
      aria-label="Loading"
      className={cn('size-4 animate-spin', className)}
    />
  );
}

export { Spinner };
