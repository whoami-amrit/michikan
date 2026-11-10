import { ChevronLeftIcon } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface YearMonth {
  year: number;
  month: number;
}

interface MonthPickerProps {
  value?: string;
  onChange?: (value: string | undefined) => void;
  onBlur?: () => void;
  ref?: React.Ref<HTMLButtonElement>;
  disabled?: boolean;
  /** Earliest selectable month. Defaults to 100 years ago. */
  startMonth?: Date;
  /** Latest selectable month. Defaults to the current month. */
  endMonth?: Date;
}

const MONTHS = Array.from({ length: 12 }, (_, month) =>
  new Date(2000, month, 1).toLocaleString('default', { month: 'short' }),
);

const formatValue = ({ year, month }: YearMonth) =>
  `${String(year).padStart(4, '0')}-${String(month + 1).padStart(2, '0')}-15`;

const fromValue = (value?: string): YearMonth | undefined => {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return undefined;
  }

  return { year: date.getFullYear(), month: date.getMonth() };
};

const monthsSinceYear0 = ({ year, month }: YearMonth) => year * 12 + month;

const dateToYearMonth = (date: Date): YearMonth => ({
  year: date.getFullYear(),
  month: date.getMonth(),
});

function MonthPicker({
  value,
  onChange,
  onBlur,
  ref,
  disabled,
  startMonth,
  endMonth,
}: MonthPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [view, setView] = React.useState<'year' | 'month'>('year');
  const [pendingYear, setPendingYear] = React.useState<number>();

  const selected = fromValue(value);
  const now = new Date();
  const minMonth = dateToYearMonth(startMonth ?? new Date(now.getFullYear() - 100, 0));
  const maxMonth = dateToYearMonth(endMonth ?? now);

  const years = Array.from(
    { length: maxMonth.year - minMonth.year + 1 },
    (_, i) => minMonth.year + i,
  );

  const isMonthDisabled = (year: number, month: number) => {
    const index = monthsSinceYear0({ year, month });
    return index < monthsSinceYear0(minMonth) || index > monthsSinceYear0(maxMonth);
  };

  const handleOpenChange = (shouldOpen: boolean) => {
    setOpen(shouldOpen);

    if (shouldOpen) {
      setView('year');
      setPendingYear(undefined);
    } else {
      onBlur?.();
    }
  };

  // Scroll the selected (or current, clamped to range) year into view when the year grid shows.
  const initialYear =
    selected?.year ?? Math.min(Math.max(now.getFullYear(), minMonth.year), maxMonth.year);
  const scrollIntoViewRef = React.useCallback((node: HTMLButtonElement | null) => {
    node?.scrollIntoView({ block: 'center' });
  }, []);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            ref={ref}
            variant="secondary"
            className="justify-start font-normal"
            disabled={disabled}
          >
            {selected ? `${MONTHS[selected.month]} ${selected.year}` : 'Select month'}
          </Button>
        }
      />
      <PopoverContent className="w-64 gap-2 p-3" align="start">
        <div className="flex h-8 items-center gap-1">
          {view === 'month' && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Back to years"
              onClick={() => setView('year')}
            >
              <ChevronLeftIcon />
            </Button>
          )}
          <span className="px-1 font-medium">{view === 'year' ? 'Select year' : pendingYear}</span>
        </div>
        {/* 3 columns x 3 visible rows (h-9 + gap-2), scrollable */}
        <div className="grid max-h-[7.75rem] grid-cols-3 gap-2 overflow-y-auto">
          {view === 'year'
            ? years.map((year) => (
                <Button
                  key={year}
                  ref={year === initialYear ? scrollIntoViewRef : undefined}
                  variant={year === selected?.year ? 'default' : 'ghost'}
                  className={cn(
                    year === now.getFullYear() && year !== selected?.year && 'border-border',
                  )}
                  onClick={() => {
                    setPendingYear(year);
                    setView('month');
                  }}
                >
                  {year}
                </Button>
              ))
            : MONTHS.map((label, month) => {
                const year = pendingYear!;
                const isSelected = selected?.year === year && selected.month === month;

                return (
                  <Button
                    key={label}
                    variant={isSelected ? 'default' : 'ghost'}
                    disabled={isMonthDisabled(year, month)}
                    onClick={() => {
                      onChange?.(formatValue({ year, month }));
                      handleOpenChange(false);
                    }}
                  >
                    {label}
                  </Button>
                );
              })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { MonthPicker };
