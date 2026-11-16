import { ViewIcon, ViewOffSlashIcon } from '@hugeicons/core-free-icons';
import * as React from 'react';

import { Icon } from '@/components/ui/icon';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';

/** Password input with an inline toggle button to show or hide the password. */
export function PasswordInput({
  className,
  ...props
}: Omit<React.ComponentProps<'input'>, 'type'>) {
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <InputGroup className={className}>
      <InputGroupInput type={showPassword ? 'text' : 'password'} {...props} />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          size="icon-xs"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          aria-pressed={showPassword}
          onClick={() => setShowPassword((prev) => !prev)}
        >
          <Icon icon={showPassword ? ViewOffSlashIcon : ViewIcon} />
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}
