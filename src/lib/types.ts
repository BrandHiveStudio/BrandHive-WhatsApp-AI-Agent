export interface Conversation {
  id: string;
  phone: string;
  name: string | null;
  mode: "agent" | "human";
  updated_at: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  whatsapp_msg_id: string | null;
  created_at: string;
}

export interface ConversationWithLastMessage extends Conversation {
  last_message: string | null;
}

export type PricingType = "fixed" | "starting_from" | "custom_quote";
export type ServiceItemType = "service" | "package";

export interface Service {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  pricing_type: PricingType;
  price: number | null;
  starting_price: number | null;
  currency: string;
  unit: string | null;
  /** Distinguishes a standalone service from a package/bundle. */
  item_type: ServiceItemType;
  /** True when the published fee excludes a separate, customer-controlled
   * advertising budget (e.g. "LKR 25,000 + Ad Budget") -- the amount is
   * never known/invented by BrandHive and must never be quoted as a number. */
  ad_budget_separate: boolean;
  active: boolean;
  display_order: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface ServiceAddon {
  id: string;
  service_id: string | null;
  name: string;
  description: string | null;
  pricing_type: PricingType;
  price: number | null;
  starting_price: number | null;
  currency: string;
  unit: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Faq {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface Setting {
  key: string;
  value: unknown;
  description: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AIBehaviorConfig {
  tone: string;
  friendliness: "low" | "medium" | "high" | string;
  professionalism: "low" | "medium" | "high" | string;
  creativity: "low" | "medium" | "high" | string;
  response_length: "short" | "medium" | "detailed" | string;
  emoji_usage: "none" | "minimal" | "moderate" | "expressive" | string;
  greeting_style: string;
  sales_approach: string;
  question_frequency: string;
  language_mirroring: boolean;
  whatsapp_formatting: boolean;
  human_escalation_behavior: string;
  custom_instructions?: string;
}

