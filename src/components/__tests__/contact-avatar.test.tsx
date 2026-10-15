import { describe, it, expect } from "vitest";
import { getAvatarInitials, getAvatarGradient } from "@/components/contact-avatar";

describe("ContactAvatar Utility Functions (Task 11 Section A)", () => {
  it("extracts 2-letter monogram for two-word names", () => {
    expect(getAvatarInitials("Kasun Perera", "94771234567")).toBe("KP");
    expect(getAvatarInitials("John Doe", "1234567890")).toBe("JD");
  });

  it("extracts 2 letters for single-word names", () => {
    expect(getAvatarInitials("BrandHive", "94771234567")).toBe("BR");
    expect(getAvatarInitials("A", "94771234567")).toBe("A");
  });

  it("falls back to last two digits of phone when name is null or empty", () => {
    expect(getAvatarInitials(null, "94703905441")).toBe("41");
    expect(getAvatarInitials("", "+94 77 123 4589")).toBe("89");
    expect(getAvatarInitials("   ", "0771234567")).toBe("67");
  });

  it("falls back to WA when both name and phone are empty", () => {
    expect(getAvatarInitials(null, "")).toBe("WA");
    expect(getAvatarInitials("", "")).toBe("WA");
  });

  it("generates deterministic gradient classes for consistent user identity", () => {
    const grad1 = getAvatarGradient("94703905441");
    const grad2 = getAvatarGradient("94703905441");
    expect(grad1).toBe(grad2);

    const gradDifferent = getAvatarGradient("94771234567");
    expect(typeof gradDifferent).toBe("string");
    expect(gradDifferent).toContain("from-");
    expect(gradDifferent).toContain("to-");
  });
});
