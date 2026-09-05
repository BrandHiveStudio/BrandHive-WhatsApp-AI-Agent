import { describe, it, expect } from "vitest";
import {
  validateCoexistenceConfig,
  buildFbLoginOptions,
  isMetaCoexistenceCompletionMessage,
  ALLOWED_META_MESSAGE_ORIGINS,
  META_COEXISTENCE_FINISH_EVENT,
} from "../coexistence";

describe("WhatsApp Coexistence Logic & Security", () => {
  describe("validateCoexistenceConfig", () => {
    it("fails closed when configId is missing or empty", () => {
      const res1 = validateCoexistenceConfig({ appId: "1395774185211806", configId: "" });
      expect(res1.isValid).toBe(false);
      expect(res1.error).toContain("Configuration ID");

      const res2 = validateCoexistenceConfig({ appId: "1395774185211806", configId: undefined });
      expect(res2.isValid).toBe(false);

      const res3 = validateCoexistenceConfig({ appId: "1395774185211806", configId: "   " });
      expect(res3.isValid).toBe(false);
    });

    it("fails closed when appId is missing or empty", () => {
      const res1 = validateCoexistenceConfig({ appId: "", configId: "1234567890" });
      expect(res1.isValid).toBe(false);
      expect(res1.error).toContain("Meta App ID");

      const res2 = validateCoexistenceConfig({ appId: undefined, configId: "1234567890" });
      expect(res2.isValid).toBe(false);
    });

    it("passes validation when both valid App ID and Configuration ID are present", () => {
      const res = validateCoexistenceConfig({
        appId: "1395774185211806",
        configId: "9876543210123456",
      });
      expect(res.isValid).toBe(true);
      expect(res.error).toBeUndefined();
    });
  });

  describe("buildFbLoginOptions", () => {
    it("constructs the exact coexistence onboarding parameters required by Meta", () => {
      const configId = "9876543210123456";
      const options = buildFbLoginOptions(configId);

      expect(options.config_id).toBe(configId);
      expect(options.response_type).toBe("code");
      expect(options.override_default_response_type).toBe(true);
      expect(options.extras).toEqual({
        featureType: "whatsapp_business_app_onboarding",
        sessionInfoVersion: "3",
      });
    });

    it("trims whitespace from configuration ID", () => {
      const options = buildFbLoginOptions("  9876543210123456  ");
      expect(options.config_id).toBe("9876543210123456");
    });
  });

  describe("isMetaCoexistenceCompletionMessage", () => {
    it("rejects untrusted message origins", () => {
      const payload = { event: META_COEXISTENCE_FINISH_EVENT };
      expect(isMetaCoexistenceCompletionMessage("https://malicious-site.com", payload)).toBe(false);
      expect(isMetaCoexistenceCompletionMessage("https://facebook.com.evil.com", payload)).toBe(false);
      expect(isMetaCoexistenceCompletionMessage("http://localhost:3000", payload)).toBe(false);
    });

    it("accepts authentic finish event from https://www.facebook.com (object payload)", () => {
      const payload = { event: META_COEXISTENCE_FINISH_EVENT };
      expect(isMetaCoexistenceCompletionMessage("https://www.facebook.com", payload)).toBe(true);
      expect(isMetaCoexistenceCompletionMessage("https://web.facebook.com", payload)).toBe(true);
    });

    it("accepts authentic finish event from stringified JSON payload", () => {
      const payload = JSON.stringify({ event: META_COEXISTENCE_FINISH_EVENT });
      expect(isMetaCoexistenceCompletionMessage("https://www.facebook.com", payload)).toBe(true);
    });

    it("accepts authentic finish event nested under data object", () => {
      const payload = {
        type: "WA_EMBEDDED_SIGNUP",
        data: { event: META_COEXISTENCE_FINISH_EVENT },
      };
      expect(isMetaCoexistenceCompletionMessage("https://www.facebook.com", payload)).toBe(true);
    });

    it("ignores unrelated events from trusted origins", () => {
      const payload = { event: "SOME_OTHER_EVENT" };
      expect(isMetaCoexistenceCompletionMessage("https://www.facebook.com", payload)).toBe(false);
    });

    it("handles malformed JSON gracefully without throwing", () => {
      expect(isMetaCoexistenceCompletionMessage("https://www.facebook.com", "{bad_json")).toBe(false);
      expect(isMetaCoexistenceCompletionMessage("https://www.facebook.com", null)).toBe(false);
      expect(isMetaCoexistenceCompletionMessage("https://www.facebook.com", undefined)).toBe(false);
    });
  });

  describe("Security Boundaries", () => {
    it("only allows official Meta Facebook domains", () => {
      expect(ALLOWED_META_MESSAGE_ORIGINS).toEqual([
        "https://www.facebook.com",
        "https://web.facebook.com",
      ]);
    });
  });
});
