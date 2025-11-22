import { Badge } from '@/components/ui/badge';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { useTranslation } from 'react-i18next';
import { Star, Gem, Award, Medal, Trophy, Clock, Sparkles, Heart, RefreshCw, AlertTriangle, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/currencyUtils';
import type { CustomerBadge } from '@shared/schema';

interface CustomerData {
  type?: string;
  totalSpent?: string | number;
  customerRank?: string;
  country?: string;
  totalOrders?: number;
  firstOrderDate?: string | Date | null;
  lastOrderDate?: string | Date | null;
  averageOrderValue?: string | number;
}

interface OrderData {
  paymentStatus?: string;
}

interface CustomerBadgesProps {
  badges?: CustomerBadge[];
  customer?: CustomerData;
  order?: OrderData;
  currency?: string;
}

export function CustomerBadges({ badges, customer, order, currency = 'EUR' }: CustomerBadgesProps) {
  const { t } = useTranslation();
  
  if (!badges && !customer) return null;
  
  if (badges && badges.length > 0) {
    return <CustomerBadgesFromDatabase badges={badges} currency={currency} />;
  }
  
  if (!customer) return null;

  const totalSpent = parseFloat(customer.totalSpent?.toString() || '0');
  const totalOrders = customer.totalOrders || 0;
  const firstOrderDate = customer.firstOrderDate ? new Date(customer.firstOrderDate) : null;
  const lastOrderDate = customer.lastOrderDate ? new Date(customer.lastOrderDate) : null;
  const avgOrderValue = parseFloat(customer.averageOrderValue?.toString() || '0');
  const now = new Date();
  const daysSinceFirstOrder = firstOrderDate ? Math.floor((now.getTime() - firstOrderDate.getTime()) / (1000 * 60 * 60 * 24)) : null;
  const daysSinceLastOrder = lastOrderDate ? Math.floor((now.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24)) : null;

  return (
    <div className="flex items-center gap-2 flex-wrap" data-testid="customer-badges">
      {/* VIP Badge */}
      {customer.type === 'vip' && (
        <Popover>
          <PopoverTrigger asChild>
            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 text-xs cursor-pointer" data-testid="badge-vip">
              <Star className="h-3 w-3 mr-1" />
              VIP
            </Badge>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" side="top">
            <p className="text-xs">{t('common:vipCustomerManual')}</p>
          </PopoverContent>
        </Popover>
      )}
    
      {/* Spending Tier Badges */}
      {totalSpent >= 100000 && (
        <Popover>
          <PopoverTrigger asChild>
            <Badge className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-900 border-purple-300 text-xs cursor-pointer" data-testid="badge-diamond">
              <Gem className="h-3 w-3 mr-1" />
              Diamond
            </Badge>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" side="top">
            <p className="text-xs">Lifetime spending ≥ {formatCurrency(100000, currency)}</p>
          </PopoverContent>
        </Popover>
      )}
      
      {totalSpent >= 50000 && totalSpent < 100000 && (
        <Popover>
          <PopoverTrigger asChild>
            <Badge className="bg-gradient-to-r from-slate-200 to-slate-100 text-slate-800 border-slate-300 text-xs cursor-pointer" data-testid="badge-platinum">
              <Award className="h-3 w-3 mr-1" />
              Platinum
            </Badge>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" side="top">
            <p className="text-xs">Lifetime spending ≥ {formatCurrency(50000, currency)}</p>
          </PopoverContent>
        </Popover>
      )}
      
      {totalSpent >= 25000 && totalSpent < 50000 && (
        <Popover>
          <PopoverTrigger asChild>
            <Badge className="bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 border-amber-300 text-xs cursor-pointer" data-testid="badge-gold">
              <Medal className="h-3 w-3 mr-1" />
              Gold
            </Badge>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" side="top">
            <p className="text-xs">Lifetime spending ≥ {formatCurrency(25000, currency)}</p>
          </PopoverContent>
        </Popover>
      )}
    
      {/* Country-Specific TOP Badges */}
      {customer.customerRank === 'TOP10' && (
        <Popover>
          <PopoverTrigger asChild>
            <Badge className="bg-yellow-50 text-yellow-700 border-yellow-300 text-xs cursor-pointer" data-testid="badge-top10">
              <Trophy className="h-3 w-3 mr-1" />
              TOP 10{customer.country ? ` in ${customer.country}` : ''}
            </Badge>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" side="top">
            <p className="text-xs">Top 10 customer by revenue{customer.country ? ` in ${customer.country}` : ''}</p>
          </PopoverContent>
        </Popover>
      )}
      
      {customer.customerRank === 'TOP50' && (
        <Popover>
          <PopoverTrigger asChild>
            <Badge className="bg-blue-50 text-blue-700 border-blue-300 text-xs cursor-pointer" data-testid="badge-top50">
              <Award className="h-3 w-3 mr-1" />
              TOP 50{customer.country ? ` in ${customer.country}` : ''}
            </Badge>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" side="top">
            <p className="text-xs">Top 50 customer by revenue{customer.country ? ` in ${customer.country}` : ''}</p>
          </PopoverContent>
        </Popover>
      )}
      
      {customer.customerRank === 'TOP100' && (
        <Popover>
          <PopoverTrigger asChild>
            <Badge className="bg-slate-50 text-slate-700 border-slate-300 text-xs cursor-pointer" data-testid="badge-top100">
              <Star className="h-3 w-3 mr-1" />
              TOP 100{customer.country ? ` in ${customer.country}` : ''}
            </Badge>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" side="top">
            <p className="text-xs">Top 100 customer by revenue{customer.country ? ` in ${customer.country}` : ''}</p>
          </PopoverContent>
        </Popover>
      )}
      
      {/* Pay Later Badge */}
      {order?.paymentStatus === 'pay_later' && (
        <Popover>
          <PopoverTrigger asChild>
            <Badge className="bg-purple-50 text-purple-700 border-purple-300 text-xs cursor-pointer" data-testid="badge-pay-later">
              <Clock className="h-3 w-3 mr-1" />
              Pay Later
            </Badge>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" side="top">
            <p className="text-xs">{t('common:paymentScheduledLater')}</p>
          </PopoverContent>
        </Popover>
      )}
    
      {/* New Customer (first order within 30 days) */}
      {daysSinceFirstOrder !== null && daysSinceFirstOrder <= 30 && (
        <Popover>
          <PopoverTrigger asChild>
            <Badge className="bg-green-50 text-green-700 border-green-300 text-xs cursor-pointer" data-testid="badge-new-customer">
              <Sparkles className="h-3 w-3 mr-1" />
              New Customer
            </Badge>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" side="top">
            <p className="text-xs">First order placed within the last 30 days</p>
          </PopoverContent>
        </Popover>
      )}
      
      {/* First Timer (only 1 order) */}
      {totalOrders === 1 && (
        <Popover>
          <PopoverTrigger asChild>
            <Badge className="bg-cyan-50 text-cyan-700 border-cyan-300 text-xs cursor-pointer" data-testid="badge-first-timer">
              <Sparkles className="h-3 w-3 mr-1" />
              First Timer
            </Badge>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" side="top">
            <p className="text-xs">Has placed only 1 order so far</p>
          </PopoverContent>
        </Popover>
      )}
      
      {/* Super Loyal (10+ orders) */}
      {totalOrders >= 10 && (
        <Popover>
          <PopoverTrigger asChild>
            <Badge className="bg-rose-50 text-rose-700 border-rose-300 text-xs cursor-pointer" data-testid="badge-super-loyal">
              <Heart className="h-3 w-3 mr-1" />
              Super Loyal
            </Badge>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" side="top">
            <p className="text-xs">Has placed 10+ orders ({totalOrders} orders total)</p>
          </PopoverContent>
        </Popover>
      )}
      
      {/* Loyal Customer (2-9 orders) */}
      {totalOrders > 1 && totalOrders < 10 && (
        <Popover>
          <PopoverTrigger asChild>
            <Badge className="bg-indigo-50 text-indigo-700 border-indigo-300 text-xs cursor-pointer" data-testid="badge-loyal-customer">
              <RefreshCw className="h-3 w-3 mr-1" />
              Loyal Customer
            </Badge>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" side="top">
            <p className="text-xs">Has placed {totalOrders} orders - coming back for more!</p>
          </PopoverContent>
        </Popover>
      )}
      
      {/* At Risk (no order in 90+ days, but has ordered before) */}
      {daysSinceLastOrder !== null && daysSinceLastOrder > 90 && totalOrders > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <Badge className="bg-orange-50 text-orange-700 border-orange-300 text-xs cursor-pointer" data-testid="badge-at-risk">
              <AlertTriangle className="h-3 w-3 mr-1" />
              At Risk
            </Badge>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" side="top">
            <p className="text-xs">No orders in {daysSinceLastOrder} days - may need re-engagement</p>
          </PopoverContent>
        </Popover>
      )}
      
      {/* High Value (avg order > 500) */}
      {avgOrderValue > 500 && (
        <Popover>
          <PopoverTrigger asChild>
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-300 text-xs cursor-pointer" data-testid="badge-high-value">
              <TrendingUp className="h-3 w-3 mr-1" />
              High Value
            </Badge>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" side="top">
            <p className="text-xs">Average order value: {formatCurrency(avgOrderValue, currency)}</p>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

function CustomerBadgesFromDatabase({ badges, currency = 'EUR' }: { badges: CustomerBadge[], currency?: string }) {
  const { t } = useTranslation();
  
  const badgeConfig: Record<string, {
    icon: typeof Star;
    label: string;
    className: string;
    getTooltip: (metadata?: any) => string;
  }> = {
    'VIP': {
      icon: Star,
      label: 'VIP',
      className: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      getTooltip: () => t('common:vipCustomerManual'),
    },
    'Diamond': {
      icon: Gem,
      label: 'Diamond',
      className: 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-900 border-purple-300',
      getTooltip: (metadata) => `Lifetime spending ≥ ${formatCurrency(metadata?.threshold || 100000, currency)}`,
    },
    'Platinum': {
      icon: Award,
      label: 'Platinum',
      className: 'bg-gradient-to-r from-slate-200 to-slate-100 text-slate-800 border-slate-300',
      getTooltip: (metadata) => `Lifetime spending ≥ ${formatCurrency(metadata?.threshold || 50000, currency)}`,
    },
    'Gold': {
      icon: Medal,
      label: 'Gold',
      className: 'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 border-amber-300',
      getTooltip: (metadata) => `Lifetime spending ≥ ${formatCurrency(metadata?.threshold || 25000, currency)}`,
    },
    'TOP10': {
      icon: Trophy,
      label: 'TOP 10',
      className: 'bg-yellow-50 text-yellow-700 border-yellow-300',
      getTooltip: (metadata) => `Top 10 customer by revenue${metadata?.country ? ` in ${metadata.country}` : ''}`,
    },
    'TOP50': {
      icon: Award,
      label: 'TOP 50',
      className: 'bg-blue-50 text-blue-700 border-blue-300',
      getTooltip: (metadata) => `Top 50 customer by revenue${metadata?.country ? ` in ${metadata.country}` : ''}`,
    },
    'TOP100': {
      icon: Star,
      label: 'TOP 100',
      className: 'bg-slate-50 text-slate-700 border-slate-300',
      getTooltip: (metadata) => `Top 100 customer by revenue${metadata?.country ? ` in ${metadata.country}` : ''}`,
    },
    'PayLater': {
      icon: Clock,
      label: 'Pay Later',
      className: 'bg-purple-50 text-purple-700 border-purple-300',
      getTooltip: () => t('common:paymentScheduledLater'),
    },
    'NewCustomer': {
      icon: Sparkles,
      label: 'New Customer',
      className: 'bg-green-50 text-green-700 border-green-300',
      getTooltip: () => 'First order placed within the last 30 days',
    },
    'FirstTimer': {
      icon: Sparkles,
      label: 'First Timer',
      className: 'bg-cyan-50 text-cyan-700 border-cyan-300',
      getTooltip: () => 'Has placed only 1 order so far',
    },
    'SuperLoyal': {
      icon: Heart,
      label: 'Super Loyal',
      className: 'bg-rose-50 text-rose-700 border-rose-300',
      getTooltip: (metadata) => `Has placed 10+ orders${metadata?.totalOrders ? ` (${metadata.totalOrders} orders total)` : ''}`,
    },
    'LoyalCustomer': {
      icon: RefreshCw,
      label: 'Loyal Customer',
      className: 'bg-indigo-50 text-indigo-700 border-indigo-300',
      getTooltip: (metadata) => `Has placed ${metadata?.totalOrders || 'multiple'} orders - coming back for more!`,
    },
    'AtRisk': {
      icon: AlertTriangle,
      label: 'At Risk',
      className: 'bg-orange-50 text-orange-700 border-orange-300',
      getTooltip: (metadata) => `No orders in ${metadata?.daysSinceLastOrder || '90+'} days - may need re-engagement`,
    },
    'HighValue': {
      icon: TrendingUp,
      label: 'High Value',
      className: 'bg-emerald-50 text-emerald-700 border-emerald-300',
      getTooltip: (metadata) => `Average order value: ${formatCurrency(metadata?.averageOrderValue || 500, currency)}`,
    },
  };

  return (
    <div className="flex items-center gap-2 flex-wrap" data-testid="customer-badges">
      {badges.map((badge) => {
        const config = badgeConfig[badge.badgeType];
        if (!config) return null;

        const Icon = config.icon;
        const metadata = badge.metadata as any;
        const label = metadata?.country && ['TOP10', 'TOP50', 'TOP100'].includes(badge.badgeType)
          ? `${config.label} in ${metadata.country}`
          : config.label;

        return (
          <Popover key={badge.id}>
            <PopoverTrigger asChild>
              <Badge 
                className={`${config.className} text-xs cursor-pointer`}
                data-testid={`badge-${badge.badgeType.toLowerCase()}`}
              >
                <Icon className="h-3 w-3 mr-1" />
                {label}
              </Badge>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" side="top">
              <p className="text-xs">{config.getTooltip(metadata)}</p>
            </PopoverContent>
          </Popover>
        );
      })}
    </div>
  );
}
