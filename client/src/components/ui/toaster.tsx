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

  return (
    <ToastProvider>
      {toasts.slice(0, 4).map(function ({ id, title, description, action, ...props }, index) {
        return (
          <Toast 
            key={id} 
            {...props} 
            data-testid="toast-notification"
            className="toast-compact"
            style={{
              pointerEvents: 'auto',
            }}
          >
          <div className="grid gap-0.5">
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
