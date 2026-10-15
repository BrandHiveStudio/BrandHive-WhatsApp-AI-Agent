const { app, BrowserWindow, shell, session, Menu } = require("electron");
const path = require("path");

// Set consistent application identity for Windows AppData & shortcut grouping
app.name = "BrandHive Studio";

const PRODUCTION_URL = "https://brand-hive-whats-app-ai-agent.vercel.app";
const PRODUCTION_ORIGIN = "https://brand-hive-whats-app-ai-agent.vercel.app";

// Genuine connection error codes (Chromium net error codes)
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

let mainWindow = null;

/**
 * Validates if the target URL strictly belongs to the trusted production origin.
 * @param {string} targetUrl
 * @returns {boolean}
 */
function isTrustedProductionOrigin(targetUrl) {
  try {
    const parsed = new URL(targetUrl);
    return parsed.origin === PRODUCTION_ORIGIN;
  } catch {
    return false;
  }
}

/**
 * Validates if navigation is allowed inside the desktop application window.
 * Allows trusted production origin and the local bundled offline fallback screen.
 * @param {string} targetUrl
 * @returns {boolean}
 */
function isAllowedInternalNavigation(targetUrl) {
  try {
    const parsed = new URL(targetUrl);
    if (parsed.origin === PRODUCTION_ORIGIN) {
      return true;
    }
    if (parsed.protocol === "file:") {
      const normalizedPath = path.normalize(decodeURIComponent(parsed.pathname));
      const normalizedOffline = path.normalize(path.join(__dirname, "offline.html"));
      // Handle Windows drive letter formatting in file: URLs
      return normalizedPath.toLowerCase().endsWith("offline.html");
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Safely handles opening external links in the user's default OS browser.
 * Only allows safe protocols (https, http, mailto).
 * Rejects javascript:, file:, data:, or execution vectors.
 * @param {string} targetUrl
 */
function handleExternalUrl(targetUrl) {
  try {
    const parsed = new URL(targetUrl);
    const safeProtocols = ["https:", "http:", "mailto:"];
    if (safeProtocols.includes(parsed.protocol)) {
      shell.openExternal(targetUrl).catch((err) => {
        console.error("Failed to open external URL in system browser:", err);
      });
    } else {
      console.warn("Blocked attempt to open unsafe protocol:", parsed.protocol);
    }
  } catch (err) {
    console.error("Blocked malformed URL:", targetUrl, err);
  }
}

function createMainWindow() {
  const iconPath = path.join(__dirname, "assets", "icon.ico");

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 960,
    minHeight: 600,
    title: "BrandHive Studio",
    icon: iconPath,
    backgroundColor: "#0b1120",
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  // Smooth appearance once the initial DOM/background is painted
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  // Standard keyboard shortcuts: Reload (Ctrl+R / F5), Zoom, Fullscreen
  const menuTemplate = [
    {
      label: "View",
      submenu: [
        { role: "reload", accelerator: "CmdOrCtrl+R" },
        { role: "forceReload", accelerator: "CmdOrCtrl+Shift+R" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "close" },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));

  // Enforce navigation restrictions inside the window
  mainWindow.webContents.on("will-navigate", (event, navigationUrl) => {
    if (!isAllowedInternalNavigation(navigationUrl)) {
      event.preventDefault();
      handleExternalUrl(navigationUrl);
    }
  });

  // Intercept new window requests (target="_blank", window.open)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    handleExternalUrl(url);
    return { action: "deny" };
  });

  // Gracefully handle genuine network failures without trapping the user
  mainWindow.webContents.on(
    "did-fail-load",
    (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
      // Ignore non-mainframe assets or aborted navigations (e.g. Next.js router transitions)
      if (!isMainFrame || errorCode === -3) {
        return;
      }

      // Check for genuine network / DNS / socket failures
      if (CONNECTION_ERROR_CODES.has(errorCode) || errorCode < -100) {
        console.warn(`Connection failed (${errorCode}: ${errorDescription}) loading ${validatedURL}. Showing offline screen.`);
        mainWindow.loadFile(path.join(__dirname, "offline.html")).catch((err) => {
          console.error("Failed to load local offline screen:", err);
        });
      }
    }
  );

  // Load the live production application directly
  mainWindow.loadURL(PRODUCTION_URL).catch((err) => {
    console.error("Initial loadURL encountered an error:", err);
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// Ensure single instance lock: clicking shortcut brings existing window to focus
const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    // Configure default persistent session permissions
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
      // Only permit notification or audio permissions from the trusted production origin
      const requestingUrl = webContents.getURL();
      if (isTrustedProductionOrigin(requestingUrl)) {
        if (permission === "notifications" || permission === "media") {
          return callback(true);
        }
      }
      return callback(false);
    });

    createMainWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      }
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
}
