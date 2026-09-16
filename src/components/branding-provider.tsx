"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

const DEFAULT_LOGO_URL = "/brandhive-logo-master.png";

interface BrandingContextValue {
  logoUrl: string;
  isDefault: boolean;
  loading: boolean;
  updateLogo: (logoData: string) => Promise<{ success: boolean; error?: string }>;
  resetLogo: () => Promise<{ success: boolean; error?: string }>;
}

const BrandingContext = createContext<BrandingContextValue>({
  logoUrl: DEFAULT_LOGO_URL,
  isDefault: true,
  loading: false,
  updateLogo: async () => ({ success: false }),
  resetLogo: async () => ({ success: false }),
});

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [logoUrl, setLogoUrl] = useState<string>(DEFAULT_LOGO_URL);
  const [isDefault, setIsDefault] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);

  // Initialize from localStorage cache immediately
  useEffect(() => {
    const cached = localStorage.getItem("brandhive-custom-logo");
    if (cached) {
      setLogoUrl(cached);
      setIsDefault(false);
    }

    // Fetch from backend
    fetch("/api/admin/branding")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.branding?.logoUrl) {
          setLogoUrl(data.branding.logoUrl);
          setIsDefault(!!data.branding.isDefault);
          if (data.branding.isDefault) {
            localStorage.removeItem("brandhive-custom-logo");
          } else {
            localStorage.setItem("brandhive-custom-logo", data.branding.logoUrl);
          }
        }
      })
      .catch(() => {});
  }, []);

  const updateLogo = async (logoData: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logoData, isDefault: false }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update logo");
      }

      const data = await res.json();
      const updatedUrl = data.branding?.logoUrl || logoData;
      setLogoUrl(updatedUrl);
      setIsDefault(false);
      localStorage.setItem("brandhive-custom-logo", updatedUrl);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Error saving logo",
      };
    } finally {
      setLoading(false);
    }
  };

  const resetLogo = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to reset logo");
      }

      setLogoUrl(DEFAULT_LOGO_URL);
      setIsDefault(true);
      localStorage.removeItem("brandhive-custom-logo");
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Error resetting logo",
      };
    } finally {
      setLoading(false);
    }
  };

  return (
    <BrandingContext.Provider
      value={{
        logoUrl,
        isDefault,
        loading,
        updateLogo,
        resetLogo,
      }}
    >
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}
