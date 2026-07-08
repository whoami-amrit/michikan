import { PlusIcon } from 'lucide-react';
import { ComponentProps, Fragment, useState } from 'react';

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

import { Button } from './button';

function MultiSelect({
  items,
  onChange,
  creatable,
  ...props
}: {
  items: string[];
  onChange: (value: string[]) => void;
  creatable?: true;
} & ComponentProps<typeof Combobox<string, true>>) {
  const anchor = useComboboxAnchor();
  const [options, setOptions] = useState<string[]>(items);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [input, setInput] = useState<string>('');

  const onValueChange = (value: string[]) => {
    setSelectedOptions(value);
    onChange(value);
  };

  const addOption = () => {
    if (input?.trim().length && !options.includes(input)) {
      setOptions((prev) => prev && [...prev, input]);
      onValueChange([...selectedOptions, input]);
    }
    setInput('');
  };

  return (
    <Combobox<string, true>
      {...props}
      items={options}
      multiple
      autoHighlight
      inputValue={input}
      onInputValueChange={(value) => setInput(value)}
      value={selectedOptions}
      onValueChange={onValueChange}
    >
      <ComboboxChips ref={anchor} className="w-full">
        <ComboboxValue>
          {(values: string[]) => (
            <Fragment>
              {values.map((value: string) => (
                <ComboboxChip key={value}>{value}</ComboboxChip>
              ))}
              <ComboboxChipsInput
                onKeyDown={(e) => {
                  e.stopPropagation();

                  if (creatable && e.key === 'Enter') {
                    e.preventDefault();
                    addOption();
                  }
                }}
              />
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
        {creatable && !!input.trim().length && (
          <div className="flex w-full p-2">
            <Button variant="outline" size="sm" className="w-full" onClick={addOption}>
              <PlusIcon />
              Add <span className="truncate">&quot;{input}&quot;</span>
            </Button>
          </div>
        )}
      </ComboboxContent>
    </Combobox>
  );
}

export { MultiSelect };
