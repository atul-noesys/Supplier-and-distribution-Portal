import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface UseAuthReturn {
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
}

export function useAuth(): UseAuthReturn {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = () => {
      try {
        const accessToken = localStorage.getItem("access_token");
        const tokenExpiry = localStorage.getItem("token_expiry");

        // No token
        if (!accessToken) {
          setIsAuthenticated(false);
          setToken(null);
          setIsLoading(false);
          return;
        }

        // Check expiry
        if (tokenExpiry) {
          const expiryTime = parseInt(tokenExpiry, 10);
          const currentTime = Math.floor(Date.now() / 1000);

          if (currentTime >= expiryTime) {
            // Expired
            localStorage.removeItem("access_token");
            localStorage.removeItem("token_expiry");
            setIsAuthenticated(false);
            setToken(null);
            setIsLoading(false);
            return;
          }
        }

        // Valid
        setIsAuthenticated(true);
        setToken(accessToken);
      } catch (error) {
        console.error("Auth check error:", error);
        setIsAuthenticated(false);
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  return { isAuthenticated, isLoading, token };
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
