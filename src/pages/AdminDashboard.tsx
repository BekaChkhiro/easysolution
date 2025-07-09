import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/layouts/AdminLayout';
import { useProfile } from '@/contexts/ProfileContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Settings, Database, Activity } from 'lucide-react';

export default function AdminDashboard() {
  const { profile } = useProfile();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProjects: 0,
    activeProjects: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Get user count
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get project counts
      const { count: projectCount } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true });

      const { count: activeProjectCount } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      setStats({
        totalUsers: userCount || 0,
        totalProjects: projectCount || 0,
        activeProjects: activeProjectCount || 0
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Admin Overview</h1>
            <p className="text-muted-foreground">
              Welcome back, {profile?.display_name || profile?.full_name || 'Admin'}
            </p>
          </div>
          <Badge variant="destructive">Admin</Badge>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                Active users in system
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Projects</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProjects}</div>
              <p className="text-xs text-muted-foreground">
                Projects created
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeProjects}</div>
              <p className="text-xs text-muted-foreground">
                Currently active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Status</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Online</div>
              <p className="text-xs text-muted-foreground">
                All systems operational
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common administrative tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button className="h-20 flex-col space-y-2" variant="outline">
                <Database className="h-6 w-6" />
                <span>Create Project</span>
              </Button>
              <Button className="h-20 flex-col space-y-2" variant="outline">
                <Users className="h-6 w-6" />
                <span>Manage Users</span>
              </Button>
              <Button className="h-20 flex-col space-y-2" variant="outline">
                <Settings className="h-6 w-6" />
                <span>System Settings</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest system events and user activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No recent activity to display</p>
              <p className="text-sm">Activity will appear here as users interact with the system</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}