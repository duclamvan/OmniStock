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

  // Calculate stacking styles for each toast based on index
  const getStackStyles = (index: number): React.CSSProperties => {
    // Scale reduction for each level
    const scale = 1 - (index * 0.05)
    // Vertical offset in pixels
    const translateY = index * -110
    // Horizontal offset for depth effect
    const translateX = index * 2
    
    return {
      transform: `translate3d(${translateX}px, ${translateY}%, 0) scale(${scale})`,
      zIndex: 100 - index,
      opacity: 1 - (index * 0.1),
      transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
      willChange: 'transform, opacity',
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
            className="toast-stacked"
            style={getStackStyles(index)}
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
