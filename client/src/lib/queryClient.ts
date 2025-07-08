import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response, requestData?: unknown) {
  if (!res.ok) {
    console.error(`API Error (${res.status}):`, { url: res.url, method: res.type });
    
    try {
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const errorData = await res.json();
        console.error("Error response data:", errorData);
        
        // Check if there's a specific error message
        if (errorData.message) {
          throw new Error(errorData.message);
        } else if (errorData.errors) {
          // Format validation errors
          const errorMessages = JSON.stringify(errorData.errors);
          throw new Error(`Validation error: ${errorMessages}`);
        }
      } 
      
      // Fallback to text response
      const text = await res.text();
      throw new Error(`${res.status}: ${text || res.statusText}`);
    } catch (parseError) {
      if (parseError instanceof Error && parseError.message !== `${res.status}: `) {
        throw parseError;
      }
      throw new Error(`${res.status}: ${res.statusText}`);
    }
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  retries = 3
): Promise<Response> {
  console.log(`API Request: ${method} ${url}`, data ? { data } : "");
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, {
        method,
        headers: data ? { "Content-Type": "application/json" } : {},
        body: data ? JSON.stringify(data) : undefined,
        credentials: "include",
      });

      // If we get a 503 (server warming up), retry with delay
      if (res.status === 503) {
        const errorData = await res.json().catch(() => ({}));
        if (errorData.message?.includes('warming up') && attempt < retries - 1) {
          console.log(`[API RETRY] Server warming up, retrying in ${1000 * (attempt + 1)}ms...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        }
      }

      await throwIfResNotOk(res, data);
      console.log(`API Success: ${method} ${url}`);
      return res;
    } catch (error) {
      // For network errors during server startup, retry with exponential backoff
      if (attempt < retries - 1 && (error.message.includes('fetch') || error.message.includes('network'))) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        console.log(`[API RETRY] Network error, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      console.error(`API Request failed: ${method} ${url}`, error);
      throw error;
    }
  }

  throw new Error(`Request failed after ${retries} attempts`);
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
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
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
