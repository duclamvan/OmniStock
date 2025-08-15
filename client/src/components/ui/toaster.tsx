import { useToast } from "@/hooks/use-toast"
import { useState, useEffect } from "react"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { Button } from "@/components/ui/button"
import { Bell, BellOff } from "lucide-react"

export function Toaster() {
  const { toasts } = useToast()
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    // Load preference from localStorage
    const saved = localStorage.getItem('notificationsEnabled')
    return saved !== null ? saved === 'true' : true
  })
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Check if mobile on mount and window resize
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const toggleNotifications = () => {
    const newValue = !notificationsEnabled
    setNotificationsEnabled(newValue)
    localStorage.setItem('notificationsEnabled', String(newValue))
  }

  // Don't render anything on mobile
  if (isMobile) {
    return null
  }

  return (
    <ToastProvider>
      {/* Notification toggle button - fixed position on desktop */}
      <div className="fixed top-16 right-4 z-[90] hidden md:block">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleNotifications}
          className="h-7 px-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-800"
          title={notificationsEnabled ? "Disable notifications" : "Enable notifications"}
        >
          {notificationsEnabled ? (
            <Bell className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <BellOff className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </Button>
      </div>
      
      {/* Only show toasts if notifications are enabled */}
      {notificationsEnabled && toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props} className="md:max-w-[320px] md:p-3">
            <div className="grid gap-1">
              {title && <ToastTitle className="text-sm">{title}</ToastTitle>}
              {description && (
                <ToastDescription className="text-xs">{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport className="md:top-20 md:right-14" />
    </ToastProvider>
  )
}
