import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  TrendingDown,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { 
  subscriptionService, 
  SUBSCRIPTION_TIERS, 
  type SubscriptionPlan, 
  type BillingMetrics 
} from '@/services/subscriptionService';

export const SubscriptionDashboard: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<SubscriptionPlan[]>([]);
  const [metrics, setMetrics] = useState<BillingMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'30d' | '90d' | '12m'>('30d');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [subscriptionsData, metricsData] = await Promise.all([
        subscriptionService.getSubscriptions(),
        subscriptionService.calculateBillingMetrics()
      ]);
      
      setSubscriptions(subscriptionsData);
      setMetrics(metricsData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'trialing':
        return 'bg-blue-100 text-blue-800';
      case 'past_due':
        return 'bg-yellow-100 text-yellow-800';
      case 'canceled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'professional':
        return 'bg-blue-100 text-blue-800';
      case 'practice':
        return 'bg-purple-100 text-purple-800';
      case 'enterprise':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
  const trialingSubscriptions = subscriptions.filter(s => s.status === 'trialing');
  const pastDueSubscriptions = subscriptions.filter(s => s.status === 'past_due');

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">B2B SaaS Dashboard</h1>
          <p className="text-gray-600">Manage subscriptions, billing, and revenue metrics</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={selectedPeriod === '30d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedPeriod('30d')}
          >
            30 Days
          </Button>
          <Button 
            variant={selectedPeriod === '90d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedPeriod('90d')}
          >
            90 Days
          </Button>
          <Button 
            variant={selectedPeriod === '12m' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedPeriod('12m')}
          >
            12 Months
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Monthly Recurring Revenue"
          value={formatCurrency(metrics?.mrr || 0)}
          trend={12.5}
          icon={<DollarSign className="w-5 h-5" />}
          color="text-green-600"
        />
        <MetricCard
          title="Annual Recurring Revenue"
          value={formatCurrency(metrics?.arr || 0)}
          trend={15.2}
          icon={<TrendingUp className="w-5 h-5" />}
          color="text-blue-600"
        />
        <MetricCard
          title="Active Subscriptions"
          value={activeSubscriptions.length.toString()}
          trend={8.1}
          icon={<Users className="w-5 h-5" />}
          color="text-purple-600"
        />
        <MetricCard
          title="Churn Rate"
          value={`${(metrics?.churnRate || 0).toFixed(1)}%`}
          trend={-2.3}
          icon={<TrendingDown className="w-5 h-5" />}
          color="text-red-600"
          trendInverse
        />
      </div>

      {/* Revenue Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Revenue Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <RevenueBreakdownItem
                tier="Enterprise"
                revenue={subscriptions.filter(s => s.tier === 'enterprise').reduce((sum, s) => sum + s.mrr, 0)}
                count={subscriptions.filter(s => s.tier === 'enterprise').length}
                color="bg-orange-500"
              />
              <RevenueBreakdownItem
                tier="Practice"
                revenue={subscriptions.filter(s => s.tier === 'practice').reduce((sum, s) => sum + s.mrr, 0)}
                count={subscriptions.filter(s => s.tier === 'practice').length}
                color="bg-purple-500"
              />
              <RevenueBreakdownItem
                tier="Professional"
                revenue={subscriptions.filter(s => s.tier === 'professional').reduce((sum, s) => sum + s.mrr, 0)}
                count={subscriptions.filter(s => s.tier === 'professional').length}
                color="bg-blue-500"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SaaS Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Average Revenue Per User</span>
                <span className="font-semibold">{formatCurrency(metrics?.averageRevenuePerUser || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Customer Lifetime Value</span>
                <span className="font-semibold">{formatCurrency(metrics?.lifetimeValue || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Customer Acquisition Cost</span>
                <span className="font-semibold">{formatCurrency(metrics?.customerAcquisitionCost || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Net Revenue Retention</span>
                <span className="font-semibold">{(metrics?.netRevenueRetention || 0).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Expansion Revenue</span>
                <span className="font-semibold">{formatCurrency(metrics?.expansionRevenue || 0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts & Actions */}
      {(pastDueSubscriptions.length > 0 || trialingSubscriptions.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
              Attention Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pastDueSubscriptions.length > 0 && (
                <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <div>
                    <p className="font-medium text-red-800">
                      {pastDueSubscriptions.length} subscription{pastDueSubscriptions.length > 1 ? 's' : ''} past due
                    </p>
                    <p className="text-sm text-red-600">
                      Total at risk: {formatCurrency(pastDueSubscriptions.reduce((sum, s) => sum + s.mrr, 0) * 12)}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="ml-auto">
                    Review
                  </Button>
                </div>
              )}
              
              {trialingSubscriptions.length > 0 && (
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <Clock className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="font-medium text-blue-800">
                      {trialingSubscriptions.length} trial{trialingSubscriptions.length > 1 ? 's' : ''} ending soon
                    </p>
                    <p className="text-sm text-blue-600">
                      Potential revenue: {formatCurrency(trialingSubscriptions.reduce((sum, s) => sum + s.mrr, 0) * 12)}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="ml-auto">
                    Follow Up
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subscriptions List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {subscriptions.slice(0, 10).map((subscription) => (
              <SubscriptionRow key={subscription.id} subscription={subscription} />
            ))}
            {subscriptions.length === 0 && (
              <p className="text-gray-600 text-center py-8">No subscriptions found</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Metric Card Component
const MetricCard: React.FC<{
  title: string;
  value: string;
  trend: number;
  icon: React.ReactNode;
  color: string;
  trendInverse?: boolean;
}> = ({ title, value, trend, icon, color, trendInverse = false }) => {
  const isPositive = trendInverse ? trend < 0 : trend > 0;
  
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className={color}>
            {icon}
          </div>
          <div className="flex items-center gap-1 text-sm">
            {isPositive ? (
              <ArrowUpRight className="w-4 h-4 text-green-500" />
            ) : (
              <ArrowDownRight className="w-4 h-4 text-red-500" />
            )}
            <span className={isPositive ? 'text-green-600' : 'text-red-600'}>
              {Math.abs(trend).toFixed(1)}%
            </span>
          </div>
        </div>
        <div className="mt-4">
          <h3 className="text-2xl font-bold">{value}</h3>
          <p className="text-sm text-gray-600">{title}</p>
        </div>
      </CardContent>
    </Card>
  );
};

// Revenue Breakdown Item
const RevenueBreakdownItem: React.FC<{
  tier: string;
  revenue: number;
  count: number;
  color: string;
}> = ({ tier, revenue, count, color }) => {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">{tier}</span>
        <div className="text-right">
          <div className="text-sm font-semibold">{formatCurrency(revenue * 12)}</div>
          <div className="text-xs text-gray-500">{count} subscriptions</div>
        </div>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full ${color}`}
          style={{ width: `${Math.min((revenue / 10000) * 100, 100)}%` }}
        ></div>
      </div>
    </div>
  );
};

// Subscription Row Component
const SubscriptionRow: React.FC<{
  subscription: SubscriptionPlan;
}> = ({ subscription }) => {
  const tierConfig = SUBSCRIPTION_TIERS[subscription.tier as keyof typeof SUBSCRIPTION_TIERS];
  
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center gap-4">
        <div>
          <h3 className="font-medium">Organization {subscription.organizationId.slice(-8)}</h3>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={getTierColor(subscription.tier)}>
              {tierConfig.name}
            </Badge>
            <Badge className={getStatusColor(subscription.status)}>
              {subscription.status}
            </Badge>
            <span className="text-sm text-gray-500">
              {subscription.billingCycle}
            </span>
          </div>
        </div>
      </div>
      
      <div className="text-right">
        <div className="font-semibold">{formatCurrency(subscription.mrr)}/mo</div>
        <div className="text-sm text-gray-500">
          Next billing: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm">
          View Details
        </Button>
      </div>
    </div>
  );
};

function getTierColor(tier: string) {
  switch (tier) {
    case 'professional':
      return 'bg-blue-100 text-blue-800';
    case 'practice':
      return 'bg-purple-100 text-purple-800';
    case 'enterprise':
      return 'bg-orange-100 text-orange-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'trialing':
      return 'bg-blue-100 text-blue-800';
    case 'past_due':
      return 'bg-yellow-100 text-yellow-800';
    case 'canceled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0
  }).format(amount);
}

export default SubscriptionDashboard;