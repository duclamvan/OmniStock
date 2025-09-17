import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  // Calculate stacking styles - all 3 toasts stacked vertically on top of each other
  const getStackStyles = (index: number): React.CSSProperties => {
    // Stack all toasts vertically with clear spacing
    const translateY = index * -80 // 80px gap between each toast
    const scale = 1 - (index * 0.02) // Very subtle scaling for depth
    const opacity = 1 - (index * 0.1) // Slight opacity reduction for older toasts
    
    return {
      transform: `translate3d(0, ${translateY}px, 0) scale(${scale})`,
      transformOrigin: 'bottom right',
      zIndex: 100 - index,
      opacity: opacity,
      transition: 'all 400ms cubic-bezier(0.32, 0.72, 0, 1)',
      willChange: 'transform, opacity',
      boxShadow: index === 0 
        ? '0 10px 40px rgba(0, 0, 0, 0.2), 0 2px 10px rgba(0, 0, 0, 0.1)'
        : `0 ${8 - index * 2}px ${25 - index * 5}px rgba(0, 0, 0, ${0.15 - index * 0.03})`,
    }
  }

  return (
    <ToastProvider>
      {/* Wrapper for 3D perspective context */}
      <div style={{ 
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        pointerEvents: 'none',
        perspective: '1000px',
        perspectiveOrigin: 'right center'
      }}>
        {toasts.slice(0, 3).map(function ({ id, title, description, action, ...props }, index) {
          return (
            <Toast 
              key={id} 
              {...props} 
              data-testid="toast-notification"
              className="toast-stacked toast-3d"
              style={{
                ...getStackStyles(index),
                pointerEvents: 'auto', // Re-enable pointer events for toasts
              }}
            >
            <div className="grid gap-1">
              {title && <ToastTitle data-testid="toast-title">{title}</ToastTitle>}
              {description && (
                <ToastDescription data-testid="toast-description">{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
            </Toast>
          )
        })}
      </div>
      <ToastViewport />
    </ToastProvider>
  )
}
