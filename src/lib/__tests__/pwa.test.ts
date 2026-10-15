import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import manifest from "@/app/manifest";
import sharp from "sharp";

describe("PWA Configuration and Android Installability", () => {
  it("provides a valid web app manifest with standalone display and BrandHive metadata", () => {
    const config = manifest();

    expect(config.name).toBe("BrandHive Studio WhatsApp Agent");
    expect(config.short_name).toBe("BrandHive WA");
    expect(config.display).toBe("standalone");
    expect(config.start_url).toBe("/");
    expect(config.background_color).toBe("#0b141a");
    expect(config.theme_color).toBe("#0b141a");
    expect(config.icons).toBeDefined();
    expect(config.icons?.length).toBeGreaterThanOrEqual(4);

    const sizes = config.icons?.map((icon) => icon.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");

    const purposes = config.icons?.map((icon) => icon.purpose);
    expect(purposes).toContain("any");
    expect(purposes).toContain("maskable");
  });

  it("has all declared icon assets generated and sized accurately on disk", async () => {
    const iconsDir = path.join(process.cwd(), "public", "icons");

    const iconFiles = [
      { name: "icon-192.png", expectedWidth: 192, expectedHeight: 192 },
      { name: "icon-512.png", expectedWidth: 512, expectedHeight: 512 },
      { name: "icon-maskable-192.png", expectedWidth: 192, expectedHeight: 192 },
      { name: "icon-maskable-512.png", expectedWidth: 512, expectedHeight: 512 },
    ];

    for (const file of iconFiles) {
      const filePath = path.join(iconsDir, file.name);
      expect(fs.existsSync(filePath), `Icon ${file.name} must exist`).toBe(true);

      const metadata = await sharp(filePath).metadata();
      expect(metadata.width).toBe(file.expectedWidth);
      expect(metadata.height).toBe(file.expectedHeight);
      expect(metadata.format).toBe("png");
    }

    const publicFavicon = path.join(process.cwd(), "public", "favicon.ico");
    const appFavicon = path.join(process.cwd(), "src", "app", "favicon.ico");
    expect(fs.existsSync(publicFavicon), "public/favicon.ico must exist").toBe(true);
    expect(fs.existsSync(appFavicon), "src/app/favicon.ico must exist").toBe(true);
    expect(fs.statSync(publicFavicon).size).toBeGreaterThan(500);
  });

  it("verifies service worker strictly preserves API, auth, and Supabase security without caching sensitive data", () => {
    const swPath = path.join(process.cwd(), "public", "sw.js");
    expect(fs.existsSync(swPath)).toBe(true);

    const swContent = fs.readFileSync(swPath, "utf-8");

    // Must never intercept or cache API routes
    expect(swContent).toContain("url.pathname.startsWith('/api/')");

    // Must never intercept or cache Supabase requests
    expect(swContent).toContain("url.hostname.includes('supabase.co')");

    // Must never intercept auth endpoints
    expect(swContent).toContain("url.pathname.includes('/auth/')");

    // Must only handle GET
    expect(swContent).toContain("request.method !== 'GET'");

    // Must declare static assets
    expect(swContent).toContain("/icons/icon-192.png");
    expect(swContent).toContain("/icons/icon-512.png");
  });
});
