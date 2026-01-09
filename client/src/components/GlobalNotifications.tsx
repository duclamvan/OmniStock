import { useEffect } from "react";
import { useGlobalNotifications } from "@/hooks/useSocket";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { X, Package, Ship, User, Edit, Trash2, Plus, Clock } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const actionIcons: Record<string, typeof Package> = {
  order_created: Package,
  order_updated: Edit,
  order_deleted: Trash2,
  shipment_created: Ship,
  shipment_updated: Edit,
  customer_created: User,
  customer_updated: Edit,
  product_created: Plus,
  product_updated: Edit,
  default: Clock
};

export function GlobalNotifications() {
  const { notifications, dismissNotification } = useGlobalNotifications();
  
  const getIcon = (actionType: string) => {
    return actionIcons[actionType] || actionIcons.default;
  };
  
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };
  
  return (
    <div 
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm"
      data-testid="global-notifications"
    >
      <AnimatePresence mode="popLayout">
        {notifications.map((notification) => {
          const Icon = getIcon(notification.actionType);
          
          return (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              layout
            >
              <Card className="shadow-lg border bg-card">
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      {notification.userAvatar ? (
                        <AvatarImage src={notification.userAvatar} alt={notification.userName} />
                      ) : null}
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {getInitials(notification.userName)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 text-sm">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium truncate">{notification.userName}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <span className="text-xs text-muted-foreground/60 mt-1 block">
                        {new Date(notification.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 flex-shrink-0"
                      onClick={() => dismissNotification(notification.id)}
                      data-testid={`dismiss-notification-${notification.id}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
