import React from 'react';
import { useProfile } from '@/contexts/ProfileContext';
import { AdminLayout } from '@/layouts/AdminLayout';
import { DashboardLayout } from '@/layouts/DashboardLayout';

interface AdaptiveLayoutProps {
  children: React.ReactNode;
}

export function AdaptiveLayout({ children }: AdaptiveLayoutProps) {
  const { profile } = useProfile();

  // Use AdminLayout for admin users, DashboardLayout for regular users
  if (profile?.role === 'admin') {
    return <AdminLayout>{children}</AdminLayout>;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}