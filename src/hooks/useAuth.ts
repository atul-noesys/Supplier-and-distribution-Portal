import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { jwtDecode } from "jwt-decode";
import { rootStore } from "@/store/root-store";

interface UseAuthReturn {
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
}

const checkAuthStatus = async (): Promise<UseAuthReturn> => {
  try {
    let accessToken = localStorage.getItem("access_token");

    // Check for token in URL hash if not in localStorage
    if (!accessToken && typeof window !== "undefined") {
      const hash = window.location.hash;
      const tokenMatch = hash.match(/token=([^&]*)/);

      if (tokenMatch && tokenMatch[1]) {
        accessToken = decodeURIComponent(tokenMatch[1]);
        // Store it for future use
        localStorage.setItem("access_token", accessToken);
        const user = await rootStore.nguageStore.GetCurrentUser();

        // Fetch supplier registration data and find matching supplier by name
        if (user) {
          try {
            const supplierData = await rootStore.nguageStore.GetPaginationData({
              table: "supplier_registration",
              skip: 0,
              take: 200,
              NGaugeId: "64",
            });

            // Handle both cases: direct array or object with data property
            const supplierArray = Array.isArray(supplierData)
              ? supplierData
              : supplierData?.data;

            if (supplierArray && Array.isArray(supplierArray)) {
              const matchingSupplier = supplierArray.find(
                (supplier) =>
                  (supplier.first_name as string)?.toLowerCase() === user.userName.toLowerCase()
              );

              if (matchingSupplier?.logo) {
                try {
                  // Parse logo array and extract the first URL
                  let logoUrl: string | null = null;
                  const logoData = matchingSupplier.logo as string;

                  try {
                    const parsed = JSON.parse(logoData);
                    logoUrl = Array.isArray(parsed) ? parsed[0] : parsed;
                  } catch {
                    logoUrl = logoData;
                  }

                  if (logoUrl) {
                    // Fetch the logo using the PDF API
                    const apiUrl = `/api/GetPdfUrl?attachment=${encodeURIComponent(logoUrl)}`;

                    const logoResponse = await fetch(apiUrl, {
                      headers: {
                        Authorization: `Bearer ${accessToken}`,
                      },
                    });

                    if (logoResponse.ok) {
                      const logoBlob = await logoResponse.blob();
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        const base64String = reader.result as string;
                        localStorage.setItem("logoUrl", base64String);
                      };
                      reader.readAsDataURL(logoBlob);
                    } else {
                      console.error("Failed to fetch logo:", logoResponse.status);
                    }
                  }
                } catch (logoErr) {
                  console.error("Error fetching logo:", logoErr);
                }
              }
            } else {
              console.log("Supplier data is null or not an array", supplierArray);
            }
          } catch (err) {
            console.error("Error fetching supplier data:", err);
          }
        }
        // Clear the hash from URL
        window.history.replaceState(null, "", window.location.pathname);
      }
    }

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
