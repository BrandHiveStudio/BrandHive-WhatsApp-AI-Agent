const fs = require("fs");
const path = require("path");
const assert = require("assert");

console.log("=== BrandHive Studio Desktop App Security & Verification Suite ===\n");

let passed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
  }
}

// 1. Asset & Configuration Existence Tests
test("desktop/package.json exists and is valid JSON", () => {
  const pkgPath = path.join(__dirname, "package.json");
  assert(fs.existsSync(pkgPath), "package.json missing");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  assert.strictEqual(pkg.name, "brandhive-studio-desktop");
  assert.strictEqual(pkg.build.appId, "com.brandhivestudio.whatsappagent");
  assert.strictEqual(pkg.build.productName, "BrandHive Studio");
  assert.strictEqual(pkg.build.executableName, "BrandHiveStudio");
  assert.strictEqual(pkg.build.win.artifactName, "BrandHive-Studio-Setup-${version}.${ext}");
});

test("desktop/assets/icon.ico exists with valid multi-resolution Windows ICO header", () => {
  const icoPath = path.join(__dirname, "assets", "icon.ico");
  assert(fs.existsSync(icoPath), "icon.ico missing");
  const buf = fs.readFileSync(icoPath);
  assert(buf.length > 1000, "icon.ico is too small");
  assert.strictEqual(buf.readUInt16LE(0), 0, "ICO reserved word must be 0");
  assert.strictEqual(buf.readUInt16LE(2), 1, "ICO type must be 1 (icon)");
  const count = buf.readUInt16LE(4);
  assert(count >= 4, `ICO must contain multiple resolutions, found: ${count}`);

  const expectedSizes = [256, 128, 64, 48, 32, 16];
  const foundSizes = [];
  for (let i = 0; i < count; i++) {
    const offset = 6 + i * 16;
    const w = buf.readUInt8(offset) || 256;
    foundSizes.push(w);
  }
  expectedSizes.forEach(s => {
    assert(foundSizes.includes(s), `Missing required resolution: ${s}x${s}`);
  });
});

test("desktop/assets/icon.png exists (512x512)", () => {
  const pngPath = path.join(__dirname, "assets", "icon.png");
  assert(fs.existsSync(pngPath), "icon.png missing");
  const buf = fs.readFileSync(pngPath);
  assert.strictEqual(buf.readUInt32BE(16), 512, "Width must be 512");
  assert.strictEqual(buf.readUInt32BE(20), 512, "Height must be 512");
});

test("desktop/offline.html exists with brand styling and reconnect handler", () => {
  const htmlPath = path.join(__dirname, "offline.html");
  assert(fs.existsSync(htmlPath), "offline.html missing");
  const html = fs.readFileSync(htmlPath, "utf8");
  assert(html.includes("BrandHive Studio"), "Must mention BrandHive Studio");
  assert(html.includes("Retry Connection"), "Must include Retry Connection button");
  assert(html.includes("https://brand-hive-whats-app-ai-agent.vercel.app"), "Must target production URL on reconnect");
});

// 2. Security Logic & Origin Verification Tests
const PRODUCTION_ORIGIN = "https://brand-hive-whats-app-ai-agent.vercel.app";

function isTrustedProductionOrigin(targetUrl) {
  try {
    const parsed = new URL(targetUrl);
    return parsed.origin === PRODUCTION_ORIGIN;
  } catch {
    return false;
  }
}

function isAllowedInternalNavigation(targetUrl) {
  try {
    const parsed = new URL(targetUrl);
    if (parsed.origin === PRODUCTION_ORIGIN) {
      return true;
    }
    if (parsed.protocol === "file:") {
      return parsed.pathname.toLowerCase().endsWith("offline.html");
    }
    return false;
  } catch {
    return false;
  }
}

function validateExternalProtocol(targetUrl) {
  try {
    const parsed = new URL(targetUrl);
    const safeProtocols = ["https:", "http:", "mailto:"];
    return safeProtocols.includes(parsed.protocol);
  } catch {
    return false;
  }
}

test("Production origin validation strictly accepts exact trusted origin", () => {
  assert.strictEqual(isTrustedProductionOrigin("https://brand-hive-whats-app-ai-agent.vercel.app"), true);
  assert.strictEqual(isTrustedProductionOrigin("https://brand-hive-whats-app-ai-agent.vercel.app/login"), true);
  assert.strictEqual(isTrustedProductionOrigin("https://brand-hive-whats-app-ai-agent.vercel.app/admin/ai-behavior"), true);
  assert.strictEqual(isTrustedProductionOrigin("https://brand-hive-whats-app-ai-agent.vercel.app/api/conversations"), true);
});

test("Origin validation strictly rejects subdomains, spoofing, and foreign origins", () => {
  assert.strictEqual(isTrustedProductionOrigin("https://evil.com"), false);
  assert.strictEqual(isTrustedProductionOrigin("https://brand-hive-whats-app-ai-agent.vercel.app.evil.com"), false);
  assert.strictEqual(isTrustedProductionOrigin("http://brand-hive-whats-app-ai-agent.vercel.app"), false); // HTTP rejected
  assert.strictEqual(isTrustedProductionOrigin("https://fake-brand-hive.vercel.app"), false);
  assert.strictEqual(isTrustedProductionOrigin("javascript:alert(1)"), false);
  assert.strictEqual(isTrustedProductionOrigin("file:///C:/passwords.txt"), false);
  assert.strictEqual(isTrustedProductionOrigin("data:text/html,<h1>hack</h1>"), false);
});

test("Internal navigation permits offline.html but blocks foreign or dangerous files", () => {
  assert.strictEqual(isAllowedInternalNavigation("file:///C:/desktop/offline.html"), true);
  assert.strictEqual(isAllowedInternalNavigation("file:///C:/desktop/malicious.html"), false);
  assert.strictEqual(isAllowedInternalNavigation("file:///C:/Windows/System32/cmd.exe"), false);
  assert.strictEqual(isAllowedInternalNavigation("https://google.com"), false);
});

test("External link handler strictly whitelists safe protocols and blocks dangerous execution vectors", () => {
  // Safe
  assert.strictEqual(validateExternalProtocol("https://wa.me/1234567890"), true);
  assert.strictEqual(validateExternalProtocol("https://google.com"), true);
  assert.strictEqual(validateExternalProtocol("mailto:staff@brandhive.io"), true);

  // Dangerous / Unsafe
  assert.strictEqual(validateExternalProtocol("javascript:void(0)"), false);
  assert.strictEqual(validateExternalProtocol("file:///C:/exploit.exe"), false);
  assert.strictEqual(validateExternalProtocol("data:text/html,<script>"), false);
  assert.strictEqual(validateExternalProtocol("shell:AppsFolder"), false);
  assert.strictEqual(validateExternalProtocol("ms-msdt:"), false);
  assert.strictEqual(validateExternalProtocol("vbscript:MsgBox"), false);
  assert.strictEqual(validateExternalProtocol("not a valid url"), false);
});

// 3. Network Error Code Handling Tests
const CONNECTION_ERROR_CODES = new Set([
  -21,  // ERR_NETWORK_CHANGED
  -100, // ERR_CONNECTION_CLOSED
  -101, // ERR_CONNECTION_RESET
  -102, // ERR_CONNECTION_REFUSED
  -104, // ERR_CONNECTION_FAILED
  -105, // ERR_NAME_NOT_RESOLVED
  -106, // ERR_INTERNET_DISCONNECTED
  -109, // ERR_ADDRESS_UNREACHABLE
  -118, // ERR_CONNECTION_TIMED_OUT
  -137, // ERR_NAME_RESOLUTION_FAILED
  -200, // ERR_CERT_COMMON_NAME_INVALID
  -201, // ERR_CERT_DATE_INVALID
  -202, // ERR_CERT_AUTHORITY_INVALID
]);

function shouldShowOffline(errorCode, isMainFrame) {
  if (!isMainFrame || errorCode === -3) {
    return false;
  }
  return CONNECTION_ERROR_CODES.has(errorCode) || errorCode < -100;
}

test("Offline detection triggers only on genuine network failure codes", () => {
  assert.strictEqual(shouldShowOffline(-106, true), true); // Disconnected
  assert.strictEqual(shouldShowOffline(-105, true), true); // DNS failure
  assert.strictEqual(shouldShowOffline(-102, true), true); // Connection refused
  assert.strictEqual(shouldShowOffline(-118, true), true); // Timed out

  // Subframe or asset failure should NOT kick main window to offline screen
  assert.strictEqual(shouldShowOffline(-106, false), false);

  // Aborted navigation (-3) during Next.js router transitions must NOT trigger offline screen
  assert.strictEqual(shouldShowOffline(-3, true), false);

  // HTTP status codes (404, 401, 500) are not negative Chromium net codes and must NOT trigger offline screen
  assert.strictEqual(shouldShowOffline(404, true), false);
  assert.strictEqual(shouldShowOffline(500, true), false);
  assert.strictEqual(shouldShowOffline(0, true), false);
});

// 4. BrowserWindow Security Config Audit in main.js
test("desktop/main.js enforces all required Electron security flags", () => {
  const mainContent = fs.readFileSync(path.join(__dirname, "main.js"), "utf8");
  assert(mainContent.includes("nodeIntegration: false"), "nodeIntegration must be false");
  assert(mainContent.includes("contextIsolation: true"), "contextIsolation must be true");
  assert(mainContent.includes("sandbox: true"), "sandbox must be true");
  assert(mainContent.includes("webSecurity: true"), "webSecurity must be true");
  assert(mainContent.includes("allowRunningInsecureContent: false"), "allowRunningInsecureContent must be false");
  assert(mainContent.includes("setWindowOpenHandler"), "setWindowOpenHandler must be configured");
  assert(mainContent.includes("will-navigate"), "will-navigate must be intercepted");
  assert(mainContent.includes("openExternal"), "openExternal must be used for safe external links");
  assert(!mainContent.includes("preload:"), "Preload bridge must not be configured");
});

// 5. Zero Secrets Verification
test("desktop bundle contains no server secrets or environment variables", () => {
  const files = ["main.js", "offline.html", "package.json"];
  const secretKeywords = [
    "SUPABASE_SERVICE_ROLE_KEY",
    "WHATSAPP_APP_SECRET",
    "WHATSAPP_ACCESS_TOKEN",
    "GEMINI_API_KEY",
    "OPENROUTER_API_KEY",
    "ALLOW_DEV_AUTH_BYPASS",
  ];
  for (const f of files) {
    const content = fs.readFileSync(path.join(__dirname, f), "utf8");
    for (const kw of secretKeywords) {
      assert(!content.includes(kw), `Secret keyword ${kw} unexpectedly found in ${f}`);
    }
  }
});

console.log(`\nResults: ${passed}/${total} tests passed (${Math.round((passed / total) * 100)}%).`);
if (passed !== total) process.exit(1);
