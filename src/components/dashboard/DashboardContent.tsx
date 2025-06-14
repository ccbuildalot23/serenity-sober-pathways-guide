
import React from 'react';
import { UnifiedRecoveryContent } from '@/components/daily/UnifiedRecoveryContent';
import QuickCheckIn from '@/components/daily/QuickCheckIn';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { WeeklyGoals } from '@/components/dashboard/WeeklyGoals';
import { CrisisSupport } from '@/components/dashboard/CrisisSupport';
import { DashboardHeaderSkeleton, DashboardStatsSkeleton } from '@/components/dashboard/LoadingSkeleton';

interface DashboardContentProps {
  user: any;
  profile: any;
  stats: any;
  loading: boolean;
  onCheckInComplete: () => void;
}

export const DashboardContent: React.FC<DashboardContentProps> = ({
  user,
  profile,
  stats,
  loading,
  onCheckInComplete
}) => {
  return (
    <div className="p-4 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      {loading ? (
        <DashboardHeaderSkeleton />
      ) : (
        <DashboardHeader 
          userEmail={user?.email} 
          userName={profile?.full_name}
          streak={stats.streak} 
        />
      )}

      {/* Quick Stats */}
      {loading ? (
        <DashboardStatsSkeleton />
      ) : (
        <DashboardStats stats={stats} />
      )}

      {/* Quick Check-In */}
      <QuickCheckIn onCheckInComplete={onCheckInComplete} />

      {/* Today's Recovery Content */}
      <UnifiedRecoveryContent />

      {/* Quick Actions */}
      <QuickActions />

      {/* Weekly Goals Progress */}
      <WeeklyGoals />

      {/* Quick Access to Crisis Tools */}
      <CrisisSupport />
    </div>
  );
};
