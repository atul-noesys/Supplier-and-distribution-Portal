import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { jwtDecode } from "jwt-decode";

interface UseAuthReturn {
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
}

const checkAuthStatus = async (): Promise<UseAuthReturn> => {
  try {
    const accessToken = localStorage.getItem("access_token");

    // No token
    if (!accessToken) {
      return {
        isAuthenticated: false,
        token: null,
        isLoading: false,
      };
    }

    // Decode and check expiry
    try {
      const decoded = jwtDecode<{ exp: number }>(accessToken);
      const currentTime = Math.floor(Date.now() / 1000);

      if (currentTime >= decoded.exp) {
        // Expired - clear storage
        localStorage.removeItem("access_token");
        return {
          isAuthenticated: false,
          token: null,
          isLoading: false,
        };
      }
    } catch (decodeError) {
      console.error("Token decode error:", decodeError);
      localStorage.removeItem("access_token");
      return {
        isAuthenticated: false,
        token: null,
        isLoading: false,
      };
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
    staleTime: 0, 
    gcTime: 30 * 1000, 
    refetchOnWindowFocus: true,
    refetchOnMount: true,
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
