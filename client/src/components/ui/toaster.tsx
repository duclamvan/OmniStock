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

  // Calculate 3D stacking styles for each toast - iPhone-like effect
  const getStackStyles = (index: number): React.CSSProperties => {
    // Create 3D perspective effect
    const scale = 1 - (index * 0.03) // Subtle scaling
    const translateY = index * 15 // Closer stacking (15px gap)
    const translateZ = index * -30 // Push cards back in 3D space
    const rotateX = index * 2 // Slight tilt for depth
    
    return {
      transform: `
        perspective(1000px)
        translate3d(0, ${translateY}px, ${translateZ}px)
        rotateX(${rotateX}deg)
        scale(${scale})
      `,
      transformOrigin: 'bottom right',
      zIndex: 100 - index,
      opacity: 1 - (index * 0.15),
      transition: 'all 400ms cubic-bezier(0.32, 0.72, 0, 1)',
      willChange: 'transform, opacity',
      // Add shadow for depth
      boxShadow: index === 0 
        ? '0 10px 40px rgba(0, 0, 0, 0.15), 0 2px 10px rgba(0, 0, 0, 0.1)'
        : `0 ${5 - index}px ${20 - index * 5}px rgba(0, 0, 0, ${0.1 - index * 0.02})`,
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
