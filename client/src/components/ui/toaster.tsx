import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { CheckCircle, XCircle, AlertTriangle, Info } from "lucide-react"

function getToastIcon(variant: string | undefined) {
  switch (variant) {
    case 'destructive':
      return <XCircle className="h-5 w-5 text-destructive-foreground shrink-0" />;
    case 'success':
      return <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />;
    case 'warning':
      return <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />;
    default:
      return <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />;
  }
}

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.slice(0, 4).map(function ({ id, title, description, action, variant, ...props }) {
        return (
          <Toast 
            key={id} 
            variant={variant}
            {...props} 
            data-testid="toast-notification"
            className="toast-compact"
            style={{
              pointerEvents: 'auto',
            }}
          >
            <div className="flex items-start gap-3">
              {getToastIcon(variant ?? undefined)}
              <div className="grid gap-0.5 flex-1">
                {title && <ToastTitle data-testid="toast-title">{title}</ToastTitle>}
                {description && (
                  <ToastDescription data-testid="toast-description">{description}</ToastDescription>
                )}
              </div>
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
