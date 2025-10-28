import { Star, Award, Trophy, Clock, Sparkles, UserPlus } from "lucide-react";

export interface CustomerBadge {
  label: string;
  icon: any;
  variant: 'default' | 'secondary' | 'outline' | 'destructive';
  className: string;
}

export function getCustomerBadges(customer: any): CustomerBadge[] {
  const badges: CustomerBadge[] = [];
  
  // NEW CUSTOMER Badge - 0 orders OR very recent customer (within 7 days) with <3 orders
  if (customer.totalOrders === 0 || customer.totalOrders === undefined || customer.needsSaving) {
    badges.push({
      label: 'New Customer',
      icon: UserPlus,
      variant: 'outline',
      className: 'bg-green-50 border-green-300 text-green-700 text-xs'
    });
  }
  // FIRST ORDER Badge - exactly 1 order
  else if (customer.totalOrders === 1) {
    badges.push({
      label: '1st Order',
      icon: Sparkles,
      variant: 'outline',
      className: 'bg-emerald-50 border-emerald-300 text-emerald-700 text-xs'
    });
  }
  
  // VIP Badge - high spending (>=50000) OR vip type OR VIP rank
  if (customer.type === 'vip' || customer.customerRank === 'VIP' || 
      (customer.totalSpent && parseFloat(customer.totalSpent) >= 50000)) {
    badges.push({
      label: 'VIP',
      icon: Star,
      variant: 'default',
      className: 'bg-yellow-100 text-yellow-800 border-yellow-300 text-xs'
    });
  }
  
  // TOP 10 Badge - highest tier
  if (customer.customerRank === 'TOP10' || (customer.totalOrders && customer.totalOrders >= 50)) {
    badges.push({
      label: 'TOP 10',
      icon: Trophy,
      variant: 'default',
      className: 'bg-amber-100 text-amber-800 border-amber-300 text-xs'
    });
  }
  // TOP 50 Badge - second tier (only if not TOP 10)
  else if (customer.customerRank === 'TOP50' || customer.customerRank === 'TOP' || 
           (customer.totalOrders && customer.totalOrders >= 20)) {
    badges.push({
      label: 'TOP 50',
      icon: Award,
      variant: 'default',
      className: 'bg-blue-50 text-blue-700 border-blue-300 text-xs'
    });
  }
  // LOYAL Badge - moderate activity (10-19 orders)
  else if (customer.totalOrders && customer.totalOrders >= 10) {
    badges.push({
      label: 'Loyal',
      icon: Award,
      variant: 'outline',
      className: 'bg-indigo-50 border-indigo-300 text-indigo-700 text-xs'
    });
  }
  
  // PAY LATER Badge
  if (customer.hasPayLaterBadge) {
    badges.push({
      label: 'Pay Later',
      icon: Clock,
      variant: 'outline',
      className: 'bg-purple-50 text-purple-700 border-purple-300 text-xs'
    });
  }
  
  // ONE-TIME Badge (temporary customers)
  if (customer.isTemporary) {
    badges.push({
      label: 'One-time',
      icon: null,
      variant: 'outline',
      className: 'bg-purple-50 border-purple-300 text-purple-700 text-xs'
    });
  }
  
  // CURRENCY Badge
  if (customer.preferredCurrency) {
    badges.push({
      label: customer.preferredCurrency,
      icon: null,
      variant: 'outline',
      className: 'bg-slate-50 border-slate-300 text-slate-700 text-xs'
    });
  }
  
  // CUSTOMER TYPE Badge (if not regular and not vip - vip already shown)
  if (customer.type && customer.type !== 'regular' && customer.type !== 'vip') {
    badges.push({
      label: customer.type.charAt(0).toUpperCase() + customer.type.slice(1),
      icon: null,
      variant: 'outline',
      className: 'bg-slate-100 border-slate-300 text-slate-700 capitalize text-xs'
    });
  }
  
  return badges;
}
