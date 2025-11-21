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

  // Calculate stacking styles - toasts stack downward from top-right
  const getStackStyles = (index: number): React.CSSProperties => {
    // Stack toasts downward with spacing
    const translateY = index * 90 // 90px gap between each toast (downward)
    const scale = 1 - (index * 0.02) // Very subtle scaling for depth
    const opacity = 1 - (index * 0.1) // Slight opacity reduction for older toasts
    
    return {
      transform: `translate3d(0, ${translateY}px, 0) scale(${scale})`,
      transformOrigin: 'top right', // Stack from top-right
      zIndex: 100 - index,
      opacity: opacity,
      // Enhanced smooth transitions with spring-like easing
      transition: 'all 600ms cubic-bezier(0.165, 0.84, 0.44, 1), transform 600ms cubic-bezier(0.165, 0.84, 0.44, 1)',
      willChange: 'transform, opacity, box-shadow',
      boxShadow: index === 0 
        ? '0 10px 40px rgba(0, 0, 0, 0.2), 0 2px 10px rgba(0, 0, 0, 0.1)'
        : `0 ${8 - index * 2}px ${25 - index * 5}px rgba(0, 0, 0, ${0.15 - index * 0.03})`,
    }
  }

  return (
    <ToastProvider>
      {toasts.slice(0, 3).map(function ({ id, title, description, action, ...props }, index) {
        return (
          <Toast 
            key={id} 
            {...props} 
            data-testid="toast-notification"
            className="toast-stacked toast-3d"
            style={{
              ...getStackStyles(index),
              pointerEvents: 'auto',
              animationDelay: index === 0 ? '0ms' : '0ms',
              animationFillMode: 'both',
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
      <ToastViewport />
    </ToastProvider>
  )
}
