import { useAuth } from "@/hooks/useAuth.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldX } from "lucide-react";
import { useLocation } from "wouter";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { isAdministrator, isLoading } = useAuth();
  const [, navigate] = useLocation();

  // While checking authentication, render nothing or a loading state
  if (isLoading) {
    return null;
  }

  // If admin access is required and user is not an administrator
  if (requireAdmin && !isAdministrator) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
        <Card className="w-full max-w-md" data-testid="access-denied-card">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-destructive/10 p-3">
                <ShieldX className="h-10 w-10 text-destructive" data-testid="icon-access-denied" />
              </div>
            </div>
            <CardTitle className="text-2xl" data-testid="text-access-denied-title">
              Access Denied
            </CardTitle>
            <CardDescription data-testid="text-access-denied-description">
              Administrator access required
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription data-testid="text-access-denied-message">
                You don't have permission to access this page. Please contact your administrator if you believe this is an error.
              </AlertDescription>
            </Alert>
            <Button 
              onClick={() => navigate("/")} 
              className="w-full"
              data-testid="button-go-home"
            >
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User has access, render children
  return <>{children}</>;
}
