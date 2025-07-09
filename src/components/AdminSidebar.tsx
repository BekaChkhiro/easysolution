import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  Database, 
  Users, 
  Settings, 
  Activity,
  Layout,
  User,
  Shield
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const navigation = [
  { name: 'Overview', href: '/admin', icon: Layout },
  { name: 'Projects', href: '/admin/projects', icon: Database },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Activity', href: '/admin/activity', icon: Activity },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export function AdminSidebar() {
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
          <Shield className="h-6 w-6 text-primary" />
          <span className="text-lg font-semibold">Admin Panel</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
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
        <div className="flex items-center space-x-2 px-3 py-2">
          <User className="h-4 w-4" />
          <span className="text-sm font-medium">Admin</span>
          <Badge variant="destructive" className="text-xs">
            Admin
          </Badge>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleSignOut}
          className="w-full justify-start"
        >
          Sign Out
        </Button>
      </div>
    </div>
  );
}