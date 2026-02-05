"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      try {
        const token = localStorage.getItem("access_token");
        const tokenExpiry = localStorage.getItem("token_expiry");

        // Check if token exists
        if (!token) {
          router.push("/login");
          return;
        }

        // Check if token is expired
        if (tokenExpiry) {
          const expiryTime = parseInt(tokenExpiry, 10);
          const currentTime = Math.floor(Date.now() / 1000); 

          if (currentTime >= expiryTime) {
            localStorage.removeItem("access_token");
            localStorage.removeItem("token_expiry");
            router.push("/login");
            return;
          }
        }

        // Token is valid
        setIsAuthorized(true);
      } catch (error) {
        console.error("Auth check error:", error);
        router.push("/login");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin">
          <div className="h-12 w-12 border-4 border-brand-500 border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  return isAuthorized ? <>{children}</> : null;
}
