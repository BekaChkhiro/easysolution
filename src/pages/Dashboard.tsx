import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  User, 
  Mail, 
  Calendar, 
  Shield, 
  LogOut, 
  Settings,
  Bell,
  Activity,
  Edit3,
  Key
} from 'lucide-react';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { profile } = useProfile();

  const handleSignOut = async () => {
    await signOut();
  };

  const userName = profile?.display_name || profile?.full_name || 'User';
  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Avatar className="w-10 h-10">
                <AvatarImage src={profile?.avatar_url || undefined} alt="Profile picture" />
                <AvatarFallback>{userInitials}</AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-xl font-semibold">Welcome back, {profile?.display_name || 'User'}!</h1>
                <p className="text-sm text-muted-foreground">Manage your account and preferences</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Link to="/profile/edit">
                <Button variant="outline" size="sm">
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              </Link>
              <Button variant="ghost" size="sm">
                <Bell className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* User Profile Card */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Your account details and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={profile?.avatar_url || undefined} alt="Profile picture" />
                    <AvatarFallback className="text-lg">{userInitials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{profile?.display_name || 'No display name'}</p>
                    <p className="text-sm text-muted-foreground">
                      {profile?.full_name || 'No full name set'}
                    </p>
                    {profile?.bio && (
                      <p className="text-xs text-muted-foreground mt-1 max-w-xs truncate">
                        {profile.bio}
                      </p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Badge variant="secondary">Active</Badge>
                  <div className="flex gap-1">
                    <Link to="/profile/edit">
                      <Button size="sm" variant="outline">
                        <Edit3 className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 border border-border rounded-lg">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                  </div>
                </div>

                {profile?.phone_number && (
                  <div className="flex items-center space-x-3 p-3 border border-border rounded-lg">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Phone</p>
                      <p className="text-sm text-muted-foreground">{profile.phone_number}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-3 p-3 border border-border rounded-lg">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Member since</p>
                    <p className="text-sm text-muted-foreground">
                      {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions and Stats */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link to="/profile/edit">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Edit3 className="mr-2 h-4 w-4" />
                    Edit Profile
                  </Button>
                </Link>
                <Link to="/change-password">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Key className="mr-2 h-4 w-4" />
                    Change Password
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Account Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Online</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Security</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Email verified</span>
                    <Badge variant={user?.email_confirmed_at ? "secondary" : "outline"}>
                      {user?.email_confirmed_at ? "Verified" : "Pending"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Profile complete</span>
                    <Badge variant="secondary">
                      {profile?.display_name && profile?.full_name ? "Complete" : "Incomplete"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Last updated: {profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString() : 'Never'}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Activity */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Your recent account activity and updates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 border border-border rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium">Signed in successfully</p>
                  <p className="text-xs text-muted-foreground">Just now</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 border border-border rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium">Profile updated</p>
                  <p className="text-xs text-muted-foreground">
                    {profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString() : 'Never'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 border border-border rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium">Account created</p>
                  <p className="text-xs text-muted-foreground">
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Recently'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}