"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Script from "next/script";
import Link from "next/link";
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

  // Compute status during render to avoid unnecessary effect cascades
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

  // Explicit operator action only — NEVER called on load or mount
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
    <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col font-sans">
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

      {/* Header */}
      <header className="border-b border-white/[0.08] bg-[#141414]/90 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs text-white/50 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <span>&larr;</span>
              <span>Back to Inbox</span>
            </Link>
            <span className="text-white/20">|</span>
            <span className="font-semibold text-sm tracking-wide text-white">
              BrandHive Studio
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono">
              Admin &bull; Coexistence
            </span>
          </div>

          {userEmail && (
            <div className="text-xs text-white/40 font-mono">{userEmail}</div>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">
        {/* Title & Context */}
        <section className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            WhatsApp Business App Coexistence
          </h1>
          <p className="text-sm text-white/60 leading-relaxed max-w-2xl">
            Connect the existing WhatsApp Business App number (
            <span className="text-white font-mono font-medium">+94 70 641 0093</span>)
            to the BrandHive Cloud API setup concurrently. Coexistence preserves
            full access to the WhatsApp Business mobile app on the physical phone
            while routing Cloud API webhooks to the AI agent.
          </p>
        </section>

        {/* Administrative Status Banner */}
        <section
          className={`p-4 rounded-xl border flex items-start gap-3 transition-colors ${
            currentStatus === "completed"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : currentStatus === "config_missing" || currentStatus === "error"
              ? "bg-amber-500/10 border-amber-500/30 text-amber-200"
              : currentStatus === "opened"
              ? "bg-blue-500/10 border-blue-500/30 text-blue-200"
              : currentStatus === "cancelled"
              ? "bg-neutral-800 border-neutral-700 text-neutral-300"
              : "bg-white/[0.03] border-white/[0.08] text-white/80"
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

        {/* Target Asset Verification Card */}
        <section className="bg-[#141414] border border-white/[0.08] rounded-xl p-5 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-white/90 uppercase tracking-wider text-[11px]">
            Target Production Identifiers
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="bg-black/30 p-3 rounded-lg border border-white/[0.04]">
              <span className="text-white/40 block">Meta App ID</span>
              <span className="font-mono text-white/90 font-medium">
                {appId || "Not set"}
              </span>
            </div>

            <div className="bg-black/30 p-3 rounded-lg border border-white/[0.04]">
              <span className="text-white/40 block">WABA ID</span>
              <span className="font-mono text-white/90 font-medium">
                1357257559624121 (Brand Hive Studio)
              </span>
            </div>

            <div className="bg-black/30 p-3 rounded-lg border border-white/[0.04]">
              <span className="text-white/40 block">Phone Number ID</span>
              <span className="font-mono text-white/90 font-medium">
                1144390112097120 (+94 70 641 0093)
              </span>
            </div>

            <div className="bg-black/30 p-3 rounded-lg border border-white/[0.04]">
              <span className="text-white/40 block">Facebook Login Config ID</span>
              <span
                className={`font-mono font-medium ${
                  configId ? "text-emerald-400" : "text-amber-400"
                }`}
              >
                {configId || "Missing (NEXT_PUBLIC_META_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID)"}
              </span>
            </div>
          </div>

          <div className="text-xs text-white/40 pt-1 border-t border-white/[0.04] flex items-center justify-between">
            <span>SDK Version: v22.0</span>
            <span
              className={`font-medium ${
                sdkInitialized
                  ? "text-emerald-400"
                  : sdkLoaded
                  ? "text-blue-400"
                  : "text-white/40"
              }`}
            >
              SDK: {sdkInitialized ? "Initialized" : sdkLoaded ? "Loaded" : "Loading..."}
            </span>
          </div>
        </section>

        {/* Safety & Operational Boundaries */}
        <section className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 text-xs text-white/60 space-y-2">
          <h3 className="font-semibold text-white/80 uppercase text-[11px] tracking-wider">
            Operational Guidelines
          </h3>
          <ul className="list-disc list-inside space-y-1 text-white/60">
            <li>
              This flow opens Meta&apos;s official WhatsApp Business App Coexistence
              modal.
            </li>
            <li>
              During onboarding, Meta prompts to link the existing WhatsApp
              Business App on your physical phone with Cloud API automation.
            </li>
            <li>
              Do <strong className="text-white">NOT</strong> request SMS OTPs or
              attempt phone deregistration outside this dialog.
            </li>
            <li>
              The button below will <strong className="text-white">NEVER</strong>{" "}
              launch automatically; it requires your deliberate action.
            </li>
          </ul>
        </section>

        {/* Operator Trigger Action Card */}
        <section className="bg-[#141414] border border-white/[0.08] rounded-xl p-5 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-white/90 uppercase tracking-wider text-[11px]">
            Execution Trigger
          </h2>

          {!configValidation.isValid ? (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-200 text-xs leading-relaxed">
              <strong>Configuration Required:</strong> The Facebook Login for
              Business Configuration ID is not configured in the environment.
              Please configure{" "}
              <code className="bg-black/40 px-1 py-0.5 rounded font-mono">
                NEXT_PUBLIC_META_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID
              </code>{" "}
              in your Vercel or environment settings to enable the onboarding trigger.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <label className="flex items-start gap-2.5 cursor-pointer select-none text-xs text-white/80">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  disabled={!sdkInitialized || currentStatus === "opened"}
                  className="mt-0.5 w-4 h-4 rounded border-white/20 bg-black/40 text-emerald-500 focus:ring-emerald-500"
                />
                <span>
                  I confirm that I am an authorized BrandHive administrator and
                  intend to initiate WhatsApp Business App coexistence onboarding
                  for production number{" "}
                  <strong className="text-white">+94 70 641 0093</strong>.
                </span>
              </label>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleStartOnboarding}
                  disabled={!isLaunchReady}
                  className={`px-5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                    isLaunchReady
                      ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30 cursor-pointer"
                      : "bg-white/10 text-white/30 cursor-not-allowed"
                  }`}
                >
                  Start WhatsApp Business App Onboarding
                </button>

                {eventReceived && (
                  <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
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
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-4 text-center text-xs text-white/30">
        BrandHive Studio AI Agent &bull; Coexistence Gateway (v22.0)
      </footer>
    </div>
  );
}
