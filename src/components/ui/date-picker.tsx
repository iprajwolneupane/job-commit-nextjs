import { Button } from '@/components/ui/button';
import { Calendar, type CalendarProps } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import * as React from 'react';

interface Props {
  placeholder?: string;
  selected?: Date;
  isPending?: boolean;
}

export const DatePicker = React.forwardRef<
  HTMLButtonElement,
  CalendarProps & Props
>(({ placeholder = 'Pick a date', isPending = false, ...props }, ref) => {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild ref={ref} disabled={isPending}>
        <Button
          variant="outline"
          data-empty={!props.selected}
          className="data-[empty=true]:text-muted-foreground hover:bg-background  text-sm w-full h-9 px-2 py-0.5 justify-start text-left font-normal shadow-none"
        >
          <CalendarIcon />
          {props.selected ? (
            format(props.selected, 'PPP')
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar mode="single" onDayClick={() => setOpen(false)} {...props} />
      </PopoverContent>
    </Popover>
  );
});
