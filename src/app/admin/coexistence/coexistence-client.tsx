"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Script from "next/script";
import Link from "next/link";
import { AdminNav } from "@/components/admin-nav";
import {
  validateCoexistenceConfig,
  buildFbLoginOptions,
  isMetaCoexistenceCompletionMessage,
} from "@/lib/coexistence";

declare global {
  interface Window {
    fbAsyncInit?: () => void;
    FB?: {
      init: (options: {
        appId?: string;
        autoLogAppEvents?: boolean;
        xfbml?: boolean;
        version?: string;
      }) => void;
      login: (
        callback: (response: {
          authResponse?: unknown;
          status?: string;
          error?: unknown;
        }) => void,
        options: {
          config_id: string;
          response_type: string;
          override_default_response_type: boolean;
          extras: {
            featureType: string;
            sessionInfoVersion: string;
          };
        }
      ) => void;
    };
  }
}

interface CoexistenceClientProps {
  appId: string;
  configId: string;
  userEmail?: string;
}

type OnboardingStatus =
  | "checking_config"
  | "config_missing"
  | "sdk_loading"
  | "ready"
  | "opened"
  | "completed"
  | "cancelled"
  | "error";

export default function CoexistenceClient({
  appId,
  configId,
  userEmail,
}: CoexistenceClientProps) {
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [sdkInitialized, setSdkInitialized] = useState(false);
  const [sdkError, setSdkError] = useState<string | null>(null);

  const [confirmed, setConfirmed] = useState(false);
  const [flowStatus, setFlowStatus] = useState<
    "opened" | "completed" | "cancelled" | "error" | null
  >(null);
  const [flowMessage, setFlowMessage] = useState<string | null>(null);
  const [eventReceived, setEventReceived] = useState(false);

  // Validate configuration on mount
  const configValidation = useMemo(
    () => validateCoexistenceConfig({ appId, configId }),
    [appId, configId]
  );

  // Initialize Meta SDK when script has loaded
  const initializeSdk = useCallback(() => {
    if (typeof window === "undefined") return;

    if (window.FB) {
      try {
        window.FB.init({
          appId: appId.trim(),
          autoLogAppEvents: true,
          xfbml: true,
          version: "v22.0",
        });
        setSdkInitialized(true);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to initialize Meta SDK.";
        setSdkError(msg);
      }
    }
  }, [appId]);

  // Handle window.fbAsyncInit hook
  useEffect(() => {
    window.fbAsyncInit = () => {
      setSdkLoaded(true);
      initializeSdk();
    };
  }, [initializeSdk]);

  // Session completion event listener for Meta Embedded Signup
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      try {
        const isFinishEvent = isMetaCoexistenceCompletionMessage(
          event.origin,
          event.data
        );

        if (isFinishEvent) {
          setEventReceived(true);
          setFlowStatus("completed");
          setFlowMessage(
            "Meta coexistence event received: WhatsApp Business App coexistence onboarding completed."
          );
        }
      } catch {
        // Ignore untrusted / non-Meta message exceptions
      }
    }

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  const currentStatus: OnboardingStatus =
    flowStatus ||
    (!configValidation.isValid
      ? "config_missing"
      : sdkError
      ? "error"
      : !sdkInitialized
      ? "sdk_loading"
      : "ready");

  const currentStatusMessage: string =
    flowMessage ||
    (!configValidation.isValid
      ? configValidation.error || "Configuration missing."
      : sdkError
      ? `Meta SDK initialization failed: ${sdkError}`
      : !sdkInitialized
      ? "Loading Meta JavaScript SDK (v22.0)..."
      : "Meta SDK ready. Awaiting explicit operator action.");

  function handleStartOnboarding() {
    if (!configValidation.isValid) return;
    if (!sdkInitialized || !window.FB) {
      setFlowStatus("error");
      setFlowMessage("Meta SDK is not initialized. Cannot launch.");
      return;
    }
    if (!confirmed) return;

    setFlowStatus("opened");
    setFlowMessage(
      "Meta Embedded Signup dialog opened. Complete the onboarding steps in the Meta popup."
    );

    const loginOptions = buildFbLoginOptions(configId);

    window.FB.login((response) => {
      if (!response) {
        setFlowStatus("cancelled");
        setFlowMessage("Onboarding dialog was closed without a response.");
        return;
      }

      if (response.status === "connected") {
        setFlowStatus("completed");
        setFlowMessage(
          "Meta authorization step completed. The coexistence connection has been established."
        );
      } else if (
        response.status === "not_authorized" ||
        response.status === "unknown"
      ) {
        setFlowStatus("cancelled");
        setFlowMessage(
          "Onboarding was cancelled or permission was not granted."
        );
      } else {
        setFlowStatus("error");
        setFlowMessage("Meta returned an unknown response status.");
      }
    }, loginOptions);
  }

  const isLaunchReady =
    configValidation.isValid &&
    sdkInitialized &&
    confirmed &&
    currentStatus !== "opened";

  return (
    <div className="flex h-screen bg-[var(--app-bg)] text-[var(--text-primary)] font-sans overflow-hidden">
      {/* Meta Facebook JavaScript SDK loader */}
      <Script
        src="https://connect.facebook.net/en_US/sdk.js"
        strategy="afterInteractive"
        onLoad={() => {
          setSdkLoaded(true);
          initializeSdk();
        }}
        onError={() => {
          setSdkError("Failed to load Meta Facebook SDK from connect.facebook.net");
        }}
      />

      {/* Primary Left Navigation Bar */}
      <AdminNav userEmail={userEmail} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[var(--panel-bg)] overflow-hidden">
        {/* Header */}
        <header className="px-6 py-4 border-b border-[var(--panel-border)] bg-[var(--panel-header)] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1.5 transition-colors"
            >
              <span>&larr;</span>
              <span>Back to Inbox</span>
            </Link>
            <span className="text-[var(--text-muted)]">|</span>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-[var(--text-primary)] tracking-wide">
                WhatsApp Business App Coexistence
              </h1>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-400 font-semibold border border-purple-500/20">
                Meta Onboarding
              </span>
            </div>
          </div>

          <div className="text-xs text-[var(--text-secondary)] font-mono">
            {userEmail}
          </div>
        </header>

        {/* Scrollable Form Content */}
        <main className="flex-1 overflow-y-auto px-6 py-8">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Title & Context */}
            <section className="space-y-2">
              <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                Connect Business App + Cloud API
              </h2>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-2xl">
                Connect the existing WhatsApp Business App phone number (
                <span className="text-[var(--text-primary)] font-mono font-medium">
                  +94 70 641 0093
                </span>
                ) to the BrandHive Cloud API setup concurrently. Coexistence preserves full access to the WhatsApp Business mobile app on the physical phone while routing Cloud API webhooks to the AI agent.
              </p>
            </section>

            {/* Status Banner */}
            <section
              className={`p-4 rounded-xl border flex items-start gap-3 transition-colors ${
                currentStatus === "completed"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-[var(--wa-green)]"
                  : currentStatus === "config_missing" || currentStatus === "error"
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
                  : currentStatus === "opened"
                  ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                  : currentStatus === "cancelled"
                  ? "bg-[var(--panel-header)] border-[var(--panel-border)] text-[var(--text-secondary)]"
                  : "bg-[var(--panel-header)] border-[var(--panel-border)] text-[var(--text-primary)]"
              }`}
            >
              <div className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 bg-current animate-pulse" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wider opacity-75">
                  Status: {currentStatus.replace("_", " ")}
                </div>
                <div className="text-sm mt-0.5">{currentStatusMessage}</div>
              </div>
            </section>

            {/* Target Production Identifiers */}
            <section className="bg-[var(--panel-header)] border border-[var(--panel-border)] rounded-2xl p-5 flex flex-col gap-4">
              <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
                Target Production Identifiers
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="bg-[var(--panel-bg)] p-3 rounded-xl border border-[var(--panel-border)]">
                  <span className="text-[var(--text-muted)] block text-[11px]">Meta App ID</span>
                  <span className="font-mono text-[var(--text-primary)] font-medium">
                    {appId || "Not set"}
                  </span>
                </div>

                <div className="bg-[var(--panel-bg)] p-3 rounded-xl border border-[var(--panel-border)]">
                  <span className="text-[var(--text-muted)] block text-[11px]">WABA ID</span>
                  <span className="font-mono text-[var(--text-primary)] font-medium">
                    1357257559624121 (Brand Hive Studio)
                  </span>
                </div>

                <div className="bg-[var(--panel-bg)] p-3 rounded-xl border border-[var(--panel-border)]">
                  <span className="text-[var(--text-muted)] block text-[11px]">Phone Number ID</span>
                  <span className="font-mono text-[var(--text-primary)] font-medium">
                    1144390112097120 (+94 70 641 0093)
                  </span>
                </div>

                <div className="bg-[var(--panel-bg)] p-3 rounded-xl border border-[var(--panel-border)]">
                  <span className="text-[var(--text-muted)] block text-[11px]">Facebook Login Config ID</span>
                  <span
                    className={`font-mono font-medium ${
                      configId ? "text-[var(--wa-green)]" : "text-amber-500"
                    }`}
                  >
                    {configId || "Missing (NEXT_PUBLIC_META_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID)"}
                  </span>
                </div>
              </div>

              <div className="text-xs text-[var(--text-muted)] pt-2 border-t border-[var(--panel-border)] flex items-center justify-between">
                <span>SDK Version: v22.0</span>
                <span
                  className={`font-medium ${
                    sdkInitialized
                      ? "text-[var(--wa-green)]"
                      : sdkLoaded
                      ? "text-blue-400"
                      : "text-[var(--text-muted)]"
                  }`}
                >
                  SDK: {sdkInitialized ? "Initialized" : sdkLoaded ? "Loaded" : "Loading..."}
                </span>
              </div>
            </section>

            {/* Operational Guidelines */}
            <section className="bg-[var(--panel-header)]/50 border border-[var(--panel-border)] rounded-2xl p-5 text-xs text-[var(--text-secondary)] space-y-2">
              <h3 className="font-semibold text-[var(--text-primary)] uppercase text-[11px] tracking-wider">
                Operational Guidelines
              </h3>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  This flow opens Meta&apos;s official WhatsApp Business App Coexistence modal.
                </li>
                <li>
                  During onboarding, Meta prompts to link the existing WhatsApp Business App on your physical phone with Cloud API automation.
                </li>
                <li>
                  Do <strong className="text-[var(--text-primary)]">NOT</strong> request SMS OTPs or attempt phone deregistration outside this dialog.
                </li>
                <li>
                  The button below will <strong className="text-[var(--text-primary)]">NEVER</strong> launch automatically; it requires your deliberate action.
                </li>
              </ul>
            </section>

            {/* Execution Trigger */}
            <section className="bg-[var(--panel-header)] border border-[var(--panel-border)] rounded-2xl p-5 flex flex-col gap-4">
              <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
                Execution Trigger
              </h3>

              {!configValidation.isValid ? (
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-500 text-xs leading-relaxed">
                  <strong>Configuration Required:</strong> The Facebook Login for Business Configuration ID is not configured in the environment. Please configure{" "}
                  <code className="bg-black/10 dark:bg-black/40 px-1 py-0.5 rounded font-mono">
                    NEXT_PUBLIC_META_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID
                  </code>{" "}
                  in your Vercel or environment settings to enable the onboarding trigger.
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none text-xs text-[var(--text-primary)]">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                      disabled={!sdkInitialized || currentStatus === "opened"}
                      className="mt-0.5 w-4 h-4 rounded border-[var(--panel-border)] text-[var(--wa-green)] focus:ring-[var(--wa-green)]"
                    />
                    <span>
                      I confirm that I am an authorized BrandHive administrator and intend to initiate WhatsApp Business App coexistence onboarding for production number{" "}
                      <strong className="text-[var(--wa-green)]">+94 70 641 0093</strong>.
                    </span>
                  </label>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleStartOnboarding}
                      disabled={!isLaunchReady}
                      className={`px-5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all shadow-sm ${
                        isLaunchReady
                          ? "bg-[var(--wa-green)] hover:bg-[var(--wa-green-hover)] text-white cursor-pointer"
                          : "bg-[var(--panel-border)] text-[var(--text-muted)] cursor-not-allowed"
                      }`}
                    >
                      Start WhatsApp Business App Onboarding
                    </button>

                    {eventReceived && (
                      <span className="text-xs text-[var(--wa-green)] font-medium flex items-center gap-1.5">
                        <svg
                          className="w-4 h-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Coexistence event confirmed
                      </span>
                    )}
                  </div>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
