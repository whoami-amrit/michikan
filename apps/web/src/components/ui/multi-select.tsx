import { ComponentProps, Fragment } from 'react';

import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from '@/components/ui/combobox';

function MultiSelect({
  onChange,
  ...props
}: {
  onChange: (value: string[]) => void;
} & ComponentProps<typeof Combobox<string, true>>) {
  const anchor = useComboboxAnchor();

  return (
    <Combobox<string, true>
      {...props}
      multiple
      autoHighlight
      onValueChange={(values, event) => {
        console.log('values', values, 'event', event);
        onChange(values);
      }}
    >
      <ComboboxChips ref={anchor} className="w-full">
        <ComboboxValue>
          {(values: string[]) => (
            <Fragment>
              {values.map((value: string) => (
                <ComboboxChip key={value}>{value}</ComboboxChip>
              ))}
              <ComboboxChipsInput />
            </Fragment>
          )}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent anchor={anchor}>
        <ComboboxEmpty>No items found.</ComboboxEmpty>
        <ComboboxList>
          {(item: string) => (
            <ComboboxItem key={item} value={item}>
              {item}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

export { MultiSelect };
