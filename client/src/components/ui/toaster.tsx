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

  // Calculate 3D stacking styles for each toast - past toasts stack on top of each other
  const getStackStyles = (index: number): React.CSSProperties => {
    // Main toast (index 0) stays in default position
    if (index === 0) {
      return {
        transform: 'translate3d(0, 0, 0)',
        transformOrigin: 'bottom right',
        zIndex: 100,
        opacity: 1,
        transition: 'all 400ms cubic-bezier(0.32, 0.72, 0, 1)',
        willChange: 'transform, opacity',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2), 0 2px 10px rgba(0, 0, 0, 0.1)',
      }
    }
    
    // Past toasts (index 1 and 2) stack on top of each other with minimal gap
    const scale = 1 - (index * 0.04) // Subtle scaling for depth
    const translateY = -80 - (index - 1) * 8 // Stack with small 8px gap between past toasts
    const translateZ = index * -30 // Push back in 3D space
    const rotateX = -2 // Slight backward tilt
    
    return {
      transform: `
        perspective(1000px)
        translate3d(0, ${translateY}px, ${translateZ}px)
        rotateX(${rotateX}deg)
        scale(${scale})
      `,
      transformOrigin: 'bottom right',
      zIndex: 100 - index,
      opacity: 0.9 - (index - 1) * 0.15, // Past toasts slightly transparent
      transition: 'all 400ms cubic-bezier(0.32, 0.72, 0, 1)',
      willChange: 'transform, opacity',
      boxShadow: `0 ${6 - index}px ${20 - index * 5}px rgba(0, 0, 0, ${0.12 - index * 0.02})`,
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
