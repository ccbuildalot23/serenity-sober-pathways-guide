
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const DashboardHeaderSkeleton: React.FC = () => (
  <div className="flex items-center justify-between">
    <div className="text-center flex-1 space-y-2">
      <Skeleton className="h-8 w-64 mx-auto" />
      <Skeleton className="h-4 w-48 mx-auto" />
    </div>
    <Skeleton className="h-9 w-9" />
  </div>
);

export const DashboardStatsSkeleton: React.FC = () => (
  <div className="grid grid-cols-2 gap-4">
    {[1, 2].map((i) => (
      <Card key={i}>
        <CardContent className="p-4 text-center space-y-2">
          <Skeleton className="h-8 w-12 mx-auto" />
          <Skeleton className="h-4 w-16 mx-auto" />
        </CardContent>
      </Card>
    ))}
  </div>
);
