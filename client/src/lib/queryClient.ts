import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  url: string,
  method: string,
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
    const res = await fetch(queryKey.join("/") as string, {
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
      networkMode: 'online',
    },
    mutations: {
      retry: false,
      // Mutations should use online mode
      networkMode: 'online',
    },
  },
});
