import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

function DatePickerSimple({
  onChange,
}: {
  label?: string;
  onChange?: (date: Date | undefined) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [date, setDate] = React.useState<Date | undefined>(undefined);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button variant="outline" id="date" className="justify-start font-normal">
            {date ? date.toLocaleDateString() : 'Select date'}
          </Button>
        }
      />
      <PopoverContent className="w-auto overflow-hidden p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          defaultMonth={date}
          captionLayout="dropdown"
          onSelect={(date) => {
            setDate(date);
            setOpen(false);
            onChange?.(date);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

export { DatePickerSimple };
