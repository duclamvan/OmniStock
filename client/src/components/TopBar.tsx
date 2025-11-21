import { useState } from "react";
import { Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { normalizeVietnamese } from "@/lib/fuzzySearch";
import { useTranslation } from 'react-i18next';

export function TopBar() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    // Real-time search with Vietnamese diacritics support
    const normalizedQuery = normalizeVietnamese(value.toLowerCase());
    // TODO: Implement search across all entities
    console.log('Searching for:', normalizedQuery);
  };

  const notifications = [
    {
      id: 1,
      type: 'order',
      title: t('common:newOrderReceived'),
      description: t('common:orderFrom', { number: '#24005', customer: 'Jane Doe' }),
      time: t('common:minutesAgo', { count: 2 }),
      icon: '🛒',
      color: 'bg-blue-50'
    },
    {
      id: 2,
      type: 'shipping',
      title: t('common:orderShipped'),
      description: t('common:orderHasBeenShipped', { number: '#24003' }),
      time: t('common:minutesAgo', { count: 5 }),
      icon: '🚚',
      color: 'bg-green-50'
    },
    {
      id: 3,
      type: 'stock',
      title: t('common:lowStockAlert'),
      description: t('common:productRunningLow', { product: 'Nail Polish #197001' }),
      time: t('common:minutesAgo', { count: 10 }),
      icon: '⚠️',
      color: 'bg-orange-50'
    },
  ];

  return (
    <>
      <header className="bg-white shadow-sm border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-slate-800">{t('common:dashboard')}</h2>
            
            {/* Vietnamese Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder={t('common:searchPlaceholder')}
                value={searchQuery}
                onChange={handleSearch}
                className="pl-10 w-80"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => setShowNotifications(true)}
            >
              <Bell className="h-5 w-5" />
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {notifications.length}
              </Badge>
            </Button>
            
            {/* User Profile */}
            <div className="flex items-center space-x-2">
              <Avatar className="h-8 w-8">
                <AvatarImage 
                  src={user?.profileImageUrl} 
                  alt={user?.firstName || 'User'} 
                  className="object-contain bg-slate-50 dark:bg-slate-900"
                />
                <AvatarFallback>
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-slate-700">
                {user?.firstName} {user?.lastName}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Notification Modal */}
      <Dialog open={showNotifications} onOpenChange={setShowNotifications}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('common:notifications')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div 
                key={notification.id}
                className={`flex items-start space-x-3 p-3 rounded-lg ${notification.color}`}
              >
                <span className="text-lg">{notification.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">
                    {notification.title}
                  </p>
                  <p className="text-xs text-slate-600">
                    {notification.description}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {notification.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
