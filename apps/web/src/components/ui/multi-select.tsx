import * as React from 'react';

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
  items,
  defaultValue,
  onChange,
}: {
  items: string[];
  defaultValue?: string[];
  onChange: (value: string[]) => void;
}) {
  const anchor = useComboboxAnchor();

  return (
    <Combobox<string, true>
      multiple
      autoHighlight
      items={items}
      defaultValue={defaultValue}
      onValueChange={(values, event) => {
        console.log('values', values, 'event', event);
        onChange(values);
      }}
    >
      <ComboboxChips ref={anchor} className="w-full max-w-xs">
        <ComboboxValue>
          {(values: string[]) => (
            <React.Fragment>
              {values.map((value: string) => (
                <ComboboxChip key={value}>{value}</ComboboxChip>
              ))}
              <ComboboxChipsInput />
            </React.Fragment>
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
