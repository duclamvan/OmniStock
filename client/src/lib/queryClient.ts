import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Global maintenance mode state
let isMaintenanceMode = false;
let maintenanceListeners: Array<(isMaintenance: boolean) => void> = [];

export function getMaintenanceMode(): boolean {
  return isMaintenanceMode;
}

export function setMaintenanceMode(value: boolean): void {
  isMaintenanceMode = value;
  maintenanceListeners.forEach(listener => listener(value));
}

export function subscribeToMaintenanceMode(listener: (isMaintenance: boolean) => void): () => void {
  maintenanceListeners.push(listener);
  return () => {
    maintenanceListeners = maintenanceListeners.filter(l => l !== listener);
  };
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorData;
    const contentType = res.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      try {
        errorData = await res.json();
      } catch {
        errorData = { error: res.statusText };
      }
    } else {
      const text = await res.text();
      errorData = { error: text || res.statusText };
    }
    
    // Handle 503 maintenance mode response
    if (res.status === 503 && errorData?.maintenance === true) {
      setMaintenanceMode(true);
    }
    
    // Create an enhanced error object with all the details
    const error = new Error(errorData.error || errorData.message || res.statusText) as any;
    error.status = res.status;
    error.details = errorData.details;
    error.hint = errorData.hint;
    error.type = errorData.type;
    error.fullResponse = errorData;
    error.maintenance = errorData.maintenance;
    
    throw error;
  } else {
    // Clear maintenance mode on successful response
    if (isMaintenanceMode) {
      setMaintenanceMode(false);
    }
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    let url = queryKey[0] as string;
    
    // Build URL from remaining segments
    for (let i = 1; i < queryKey.length; i++) {
      const segment = queryKey[i];
      
      // If segment is an object, treat it as query parameters
      if (segment && typeof segment === 'object' && !Array.isArray(segment)) {
        const params = new URLSearchParams(segment as Record<string, string>);
        const queryString = params.toString();
        if (queryString) {
          url = `${url}?${queryString}`;
        }
      } else if (segment !== null && segment !== undefined) {
        // Otherwise, append as path segment
        url = `${url}/${segment}`;
      }
    }
    
    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      // Prevent interval-based refetching by default
      refetchInterval: false,
      // Disable window focus refetching to prevent stuttering
      refetchOnWindowFocus: false,
      // Default stale time: 30 seconds for most queries
      // Individual queries can override this based on their needs:
      // - Dashboard: 5 minutes (300000ms)
      // - Shipments: 30 seconds (30000ms)
      // - Receipts: 10 seconds (10000ms) during active editing
      staleTime: 30 * 1000, // 30 seconds default
      // Keep data in cache for 10 minutes after it becomes inactive
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      // Only refetch on mount if data is stale
      refetchOnMount: true,
      // Disable automatic retries for failed queries
      retry: false,
      // Enable request deduplication
      // Use 'always' to allow queries even when offline (will use cache)
      networkMode: 'always',
    },
    mutations: {
      retry: false,
      // Mutations use always mode - will queue offline via mutation callbacks
      networkMode: 'always',
    },
  },
});
