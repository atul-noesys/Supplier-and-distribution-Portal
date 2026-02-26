import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface UseAuthReturn {
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
}

const checkAuthStatus = async (): Promise<UseAuthReturn> => {
  try {
    const accessToken = localStorage.getItem("access_token");
    const tokenExpiry = localStorage.getItem("token_expiry");

    // No token
    if (!accessToken) {
      return {
        isAuthenticated: false,
        token: null,
        isLoading: false,
      };
    }

    // Check expiry
    if (tokenExpiry) {
      const expiryTime = parseInt(tokenExpiry, 10);
      const currentTime = Math.floor(Date.now() / 1000);

      if (currentTime >= expiryTime) {
        // Expired - clear storage
        localStorage.removeItem("access_token");
        localStorage.removeItem("token_expiry");
        return {
          isAuthenticated: false,
          token: null,
          isLoading: false,
        };
      }
    }

    // Valid
    return {
      isAuthenticated: true,
      token: accessToken,
      isLoading: false,
    };
  } catch (error) {
    console.error("Auth check error:", error);
    return {
      isAuthenticated: false,
      token: null,
      isLoading: false,
    };
  }
};

export function useAuth(): UseAuthReturn {
  const queryClient = useQueryClient();
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["auth"],
    queryFn: checkAuthStatus,
    staleTime: 0, // Immediately stale - always validate token
    gcTime: 30 * 1000, // 30 seconds - clear unused data quickly
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    refetchOnMount: true, // Refetch on component mount
  });

  // Listen for storage changes (e.g., manual deletion or logout from another tab)
  useEffect(() => {
    const handleStorageChange = () => {
      queryClient.invalidateQueries({ queryKey: ["auth"] });
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [queryClient]);

  return {
    isAuthenticated: data?.isAuthenticated ?? false,
    // Treat background refetching as loading so route guards wait
    isLoading: isLoading || isFetching,
    token: data?.token ?? null,
  };
}

export function useProtectedRoute() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  return { isAuthenticated, isLoading };
}
