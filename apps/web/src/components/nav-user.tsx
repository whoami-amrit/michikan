import {
  Logout01Icon,
  Moon02Icon,
  Sun02Icon,
  UnfoldMoreIcon,
  UserIcon,
} from '@hugeicons/core-free-icons';
import { useNavigate } from 'react-router';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Icon } from '@/components/ui/icon';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { useMainContext } from '@/lib/contexts/main/hook';
import { useUserContext } from '@/lib/contexts/user/hook';
import { api, resetCurrentUser } from '@/lib/utils';

export function NavUser() {
  const { isMobile } = useSidebar();
  const navigate = useNavigate();
  const user = useUserContext();
  const {
    setState,
    state: { theme },
  } = useMainContext();

  if (user === null) {
    return null;
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<SidebarMenuButton size="lg" className="aria-expanded:bg-muted" />}
          >
            <Avatar>
              <AvatarFallback>{user.name.toUpperCase().charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-xs">{user.email}</span>
            </div>
            <Icon icon={UnfoldMoreIcon} className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56 rounded-lg"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuItem
              onClick={() => {
                void navigate('/user');
              }}
            >
              <Icon icon={UserIcon} />
              Account
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                {theme === 'light' ? <Icon icon={Sun02Icon} /> : <Icon icon={Moon02Icon} />}
                Theme
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup
                  value={theme}
                  onValueChange={(value) => {
                    setState((prev) => ({
                      ...prev,
                      theme: value as 'light' | 'dark',
                    }));
                  }}
                >
                  <DropdownMenuRadioItem value="light">
                    <Icon icon={Sun02Icon} />
                    Light
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="dark">
                    <Icon icon={Moon02Icon} />
                    Dark
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                api
                  .delete('auth/logout')
                  .then(() => resetCurrentUser())
                  .then(() => {
                    void navigate('/login');
                  })
                  .catch((err) => console.log(err));
              }}
            >
              <Icon icon={Logout01Icon} />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
