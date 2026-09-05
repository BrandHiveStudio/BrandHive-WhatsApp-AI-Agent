import { describe, it, expect } from "vitest";
import { detectMessageLanguage } from "@/lib/language-detect";

describe("detectMessageLanguage", () => {
  it("detects Sinhala script", () => {
    expect(detectMessageLanguage("ලෝගෝ එකක් හදන්න කීයක්ද?")).toBe("si");
  });

  it("detects Tamil script", () => {
    expect(detectMessageLanguage("லோகோ செய்ய எவ்வளவு?")).toBe("ta");
  });

  it("tags plain English as en", () => {
    expect(detectMessageLanguage("What is your logo design price?")).toBe("en");
  });

  it("tags Singlish (Sinhala written in Latin letters) as en -- honestly cannot distinguish it from English at the script level", () => {
    expect(detectMessageLanguage("Logo ekak kiyada?")).toBe("en");
  });

  it("tags Tanglish (Tamil written in Latin letters) as en -- honestly cannot distinguish it from English at the script level", () => {
    expect(detectMessageLanguage("Logo design panna evlo?")).toBe("en");
  });

  it("tags a Sinhala/English mixed message as si (script presence wins over Latin text in the same message)", () => {
    expect(detectMessageLanguage("mata website ekak one, ලෝගෝ එකකුත් ඕන")).toBe("si");
  });

  it("returns null for empty or whitespace-only input", () => {
    expect(detectMessageLanguage("")).toBeNull();
    expect(detectMessageLanguage("   ")).toBeNull();
  });
});
