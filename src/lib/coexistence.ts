/**
 * Pure helper functions and validators for WhatsApp Business App
 * + Cloud API coexistence onboarding via Meta Embedded Signup.
 *
 * NOTE: These utilities deal exclusively with public client-side identifiers
 * (Meta App ID and Facebook Login Configuration ID). Production secrets
 * (WHATSAPP_ACCESS_TOKEN, WHATSAPP_APP_SECRET, SUPABASE_SERVICE_ROLE_KEY, etc.)
 * MUST NEVER be passed to or handled by client-side coexistence code.
 */

export interface CoexistenceConfigValidation {
  isValid: boolean;
  error?: string;
}

/**
 * Validates the required public identifiers for Meta Embedded Signup.
 */
export function validateCoexistenceConfig(params: {
  appId?: string | null;
  configId?: string | null;
}): CoexistenceConfigValidation {
  const appId = params.appId?.trim();
  const configId = params.configId?.trim();

  if (!appId) {
    return {
      isValid: false,
      error: "Meta App ID (NEXT_PUBLIC_META_APP_ID) is missing or empty.",
    };
  }

  if (!configId) {
    return {
      isValid: false,
      error:
        "Configuration ID (NEXT_PUBLIC_META_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID) is missing or empty. Please set this in your environment.",
    };
  }

  return { isValid: true };
}

export interface FbLoginOptions {
  config_id: string;
  response_type: string;
  override_default_response_type: boolean;
  extras: {
    featureType: string;
    sessionInfoVersion: string;
  };
}

/**
 * Builds the exact parameters required for WhatsApp Business App coexistence
 * onboarding via Meta's Embedded Signup flow.
 */
export function buildFbLoginOptions(configId: string): FbLoginOptions {
  return {
    config_id: configId.trim(),
    response_type: "code",
    override_default_response_type: true,
    extras: {
      featureType: "whatsapp_business_app_onboarding",
      sessionInfoVersion: "3",
    },
  };
}

export const ALLOWED_META_MESSAGE_ORIGINS = [
  "https://www.facebook.com",
  "https://web.facebook.com",
];

export const META_COEXISTENCE_FINISH_EVENT =
  "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING";

/**
 * Parses and verifies postMessage events emitted by Meta's Embedded Signup dialog.
 * Returns true if the message is an authentic completion event for coexistence.
 */
export function isMetaCoexistenceCompletionMessage(
  origin: string,
  rawPayload: unknown
): boolean {
  if (!ALLOWED_META_MESSAGE_ORIGINS.includes(origin)) {
    return false;
  }

  if (!rawPayload) {
    return false;
  }

  let data: Record<string, unknown> | null = null;

  if (typeof rawPayload === "string") {
    try {
      data = JSON.parse(rawPayload);
    } catch {
      return false;
    }
  } else if (typeof rawPayload === "object" && rawPayload !== null) {
    data = rawPayload as Record<string, unknown>;
  }

  if (!data) {
    return false;
  }

  // Check top-level event or nested data.event
  if (data.event === META_COEXISTENCE_FINISH_EVENT) {
    return true;
  }

  const innerData = data.data as Record<string, unknown> | undefined;
  if (innerData?.event === META_COEXISTENCE_FINISH_EVENT) {
    return true;
  }

  return false;
}
