import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/store/store-context";
import { usePageTransition } from "@/context/PageTransitionContext";
import { useAuth } from "./useAuth";

export function useInitializeSession() {
  const router = useRouter();
  const { nguageStore } = useStore();
  const { startTransition } = usePageTransition();
  const { isAuthenticated, isLoading, token } = useAuth();

  useEffect(() => {
    if (isLoading || !isAuthenticated || !token) return;

    const initializeSession = async () => {
      try {
        const user = await nguageStore.GetCurrentUser();

        // Fetch supplier registration data and find matching supplier by name
        if (user) {
          try {
            const supplierData = await nguageStore.GetPaginationData({
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
                        Authorization: `Bearer ${token}`,
                      },
                    });

                    if (logoResponse.ok) {
                      const logoBlob = await logoResponse.blob();
                      const logoBlobUrl = URL.createObjectURL(logoBlob);
                      localStorage.setItem("logoUrl", logoBlobUrl);
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
      } catch (err) {
        console.error("Session initialization error:", err);
      }
    };

    initializeSession();
  }, [isAuthenticated, isLoading, token, nguageStore]);
}
