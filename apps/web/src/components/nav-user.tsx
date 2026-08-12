import { ChevronsUpDownIcon, LogOutIcon } from 'lucide-react';
import { useNavigate } from 'react-router';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { useSidebar } from '@/lib/contexts/sidebar/hook';
import { useUserContext } from '@/lib/contexts/user/hook';
import { api } from '@/lib/utils';

export function NavUser() {
  const { isMobile } = useSidebar();
  const navigate = useNavigate();
  const user = useUserContext();

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
            <ChevronsUpDownIcon className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56 rounded-lg"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuItem
              onClick={() => {
                api
                  .delete('auth/logout')
                  .then(() => {
                    void navigate('/login');
                  })
                  .catch((err) => console.log(err));
              }}
            >
              <LogOutIcon />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
