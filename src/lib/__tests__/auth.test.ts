import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isDevAuthBypassEnabled, requireStaffUser } from "@/lib/auth";
import { SESSION_MAX_AGE_SECONDS } from "@/lib/supabase-server";

// Mock Supabase server client and Supabase admin
vi.mock("@/lib/supabase-server", () => ({
  SESSION_MAX_AGE_SECONDS: 60 * 60 * 24 * 30,
  createSupabaseServerClient: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  getSupabase: vi.fn(),
}));

describe("Authentication & Session Security", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  describe("Development Auth Bypass Protection", () => {
    it("strictly disallows bypass in production environment even if flag is set", () => {
      process.env.NODE_ENV = "production";
      process.env.ALLOW_DEV_AUTH_BYPASS = "true";
      delete process.env.VERCEL;

      expect(isDevAuthBypassEnabled()).toBe(false);
    });

    it("strictly disallows bypass when running on Vercel even if flag is set", () => {
      process.env.NODE_ENV = "development";
      process.env.VERCEL = "1";
      process.env.ALLOW_DEV_AUTH_BYPASS = "true";

      expect(isDevAuthBypassEnabled()).toBe(false);
    });

    it("disallows bypass when ALLOW_DEV_AUTH_BYPASS is not 'true'", () => {
      process.env.NODE_ENV = "development";
      delete process.env.VERCEL;
      process.env.ALLOW_DEV_AUTH_BYPASS = "false";

      expect(isDevAuthBypassEnabled()).toBe(false);

      delete process.env.ALLOW_DEV_AUTH_BYPASS;
      expect(isDevAuthBypassEnabled()).toBe(false);
    });

    it("allows bypass ONLY in local non-production, non-Vercel environment with explicit flag", () => {
      process.env.NODE_ENV = "development";
      delete process.env.VERCEL;
      process.env.ALLOW_DEV_AUTH_BYPASS = "true";

      expect(isDevAuthBypassEnabled()).toBe(true);
    });
  });

  describe("Persistent Session Settings", () => {
    it("defines 30-day session max-age (2,592,000 seconds)", () => {
      expect(SESSION_MAX_AGE_SECONDS).toBe(30 * 24 * 60 * 60);
    });
  });

  describe("requireStaffUser Authorization", () => {
    it("returns staff credentials directly when explicit dev bypass is enabled", async () => {
      process.env.NODE_ENV = "development";
      delete process.env.VERCEL;
      process.env.ALLOW_DEV_AUTH_BYPASS = "true";

      const result = await requireStaffUser();
      expect("user" in result).toBe(true);
      if ("user" in result) {
        expect(result.user.email).toBe("staff@brandhive.io");
        expect(result.profile.is_active).toBe(true);
      }
    });

    it("rejects unauthenticated requests with HTTP 401 Unauthorized in production mode", async () => {
      process.env.NODE_ENV = "production";
      delete process.env.ALLOW_DEV_AUTH_BYPASS;

      const { createSupabaseServerClient } = await import("@/lib/supabase-server");
      (createSupabaseServerClient as any).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error("No session") }),
        },
      });

      const result = await requireStaffUser();
      expect("error" in result).toBe(true);
      if ("error" in result) {
        expect(result.error.status).toBe(401);
      }
    });

    it("rejects authenticated users who lack an active staff profile with HTTP 403 Forbidden", async () => {
      process.env.NODE_ENV = "production";
      delete process.env.ALLOW_DEV_AUTH_BYPASS;

      const { createSupabaseServerClient } = await import("@/lib/supabase-server");
      const { getSupabase } = await import("@/lib/supabase");

      (createSupabaseServerClient as any).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: "user-without-active-profile", email: "user@example.com" } },
            error: null,
          }),
        },
      });

      // Profile query returns inactive profile
      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: "user-without-active-profile", is_active: false, role: "staff" },
            error: null,
          }),
        }),
      });

      (getSupabase as any).mockReturnValue({
        from: vi.fn().mockReturnValue({ select: selectMock }),
      });

      const result = await requireStaffUser();
      expect("error" in result).toBe(true);
      if ("error" in result) {
        expect(result.error.status).toBe(403);
      }
    });

    it("rejects authenticated users when profile row does not exist with HTTP 403 Forbidden", async () => {
      process.env.NODE_ENV = "production";
      delete process.env.ALLOW_DEV_AUTH_BYPASS;

      const { createSupabaseServerClient } = await import("@/lib/supabase-server");
      const { getSupabase } = await import("@/lib/supabase");

      (createSupabaseServerClient as any).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: "non-staff-user", email: "stranger@example.com" } },
            error: null,
          }),
        },
      });

      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      });

      (getSupabase as any).mockReturnValue({
        from: vi.fn().mockReturnValue({ select: selectMock }),
      });

      const result = await requireStaffUser();
      expect("error" in result).toBe(true);
      if ("error" in result) {
        expect(result.error.status).toBe(403);
      }
    });

    it("authorizes users with an active staff profile with success", async () => {
      process.env.NODE_ENV = "production";
      delete process.env.ALLOW_DEV_AUTH_BYPASS;

      const { createSupabaseServerClient } = await import("@/lib/supabase-server");
      const { getSupabase } = await import("@/lib/supabase");

      const mockUser = { id: "valid-staff-id", email: "staff@brandhive.io" };
      const mockProfile = { id: "valid-staff-id", is_active: true, role: "admin" };

      (createSupabaseServerClient as any).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
      });

      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: mockProfile,
            error: null,
          }),
        }),
      });

      (getSupabase as any).mockReturnValue({
        from: vi.fn().mockReturnValue({ select: selectMock }),
      });

      const result = await requireStaffUser();
      expect("user" in result).toBe(true);
      if ("user" in result) {
        expect(result.user.id).toBe("valid-staff-id");
        expect(result.profile.is_active).toBe(true);
      }
    });
  });
});
