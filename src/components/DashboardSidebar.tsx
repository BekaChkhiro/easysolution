import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  Home,
  FolderOpen,
  User,
  Settings,
  LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Tasks', href: '/tasks', icon: FolderOpen },
  { name: 'Profile', href: '/profile/edit', icon: User },
  { name: 'Settings', href: '/change-password', icon: Settings },
];

export function DashboardSidebar() {
  const location = useLocation();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="flex h-full w-64 flex-col bg-card border-r">
      {/* Header */}
      <div className="flex h-16 items-center px-6 border-b">
        <div className="flex items-center space-x-2">
          <FolderOpen className="h-6 w-6 text-primary" />
          <span className="text-lg font-semibold">Dashboard</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href === '/tasks' && location.pathname.startsWith('/project/'));
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={cn(
                'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon
                className={cn(
                  'mr-3 h-5 w-5 flex-shrink-0',
                  isActive ? 'text-primary-foreground' : 'text-muted-foreground'
                )}
              />
              {item.name}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t p-4 space-y-2">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleSignOut}
          className="w-full justify-start"
        >
          <LogOut className="mr-3 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}