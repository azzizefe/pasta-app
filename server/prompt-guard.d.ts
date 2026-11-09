// prompt-guard.js için tip tanımları (uygulama tarafı TypeScript'ten kullanır).

export type GuardFailure = {
  ok: false;
  code: string;
  message: string;
  reason?: string;
  field?: string;
};

export type GuardTextResult = { ok: true; value: string } | GuardFailure;

export interface GuardedCakeDetails {
  guests?: number;
  tier?: number;
  budget?: number;
  portionWeightGr?: number;
  currency?: string;
  budgetTier?: 'luxury' | 'standard' | 'economic' | 'under_minimum';
  shape?: string;
  flavor?: string;
  coating?: string;
  color?: string;
  decor?: string;
  writing?: string;
  templateTitle?: string;
  customNotes?: string;
  fillingTags?: string[];
  textureTags?: string[];
  finishTags?: string[];
  metallicTags?: string[];
  dripTags?: string[];
  themeTags?: string[];
  decorTags?: string[];
  backgroundTags?: string[];
  dietTags?: string[];
}

export const GUARD_CANARY: string;
export const ALLOWED_IMAGE_MODELS: string[];
export const ALLOWED_RECIPE_MODELS: string[];
export const DEFAULT_IMAGE_MODEL: string;
export const DEFAULT_RECIPE_MODEL: string;

export function normalizeUserText(input: unknown): string;
export function foldForDetection(text: string): string;
export function detectInjection(text: string): { flagged: boolean; reason?: string };
export function guardText(
  input: unknown,
  options?: { maxLength?: number; required?: boolean },
): GuardTextResult;
export function guardCakeDetails(details: unknown): { ok: true; value: GuardedCakeDetails } | GuardFailure;
export function resolveModel(requested: unknown, allowed: string[], fallback: string): string;
export function configuredModel(value: unknown, fallback: string): string;
export function resolveMaxTokens(requested: unknown): number;
export function guardReferenceImage(
  input: unknown,
): { ok: true; data: string; mimeType: string } | { ok: true; data: null; mimeType?: undefined } | GuardFailure;
export function buildImagePrompt(description: string, hasReference: boolean): string;
export function buildRecipeRequest(
  description: string,
  details?: GuardedCakeDetails,
  language?: string,
): { systemInstruction: string; userText: string };
export const ENHANCED_PROMPT_MAX_LENGTH: number;
export function buildPromptEnhanceRequest(
  text: string,
  context?: { kind?: string },
  language?: string,
): { systemInstruction: string; userText: string };
export function finishEnhancedPrompt(text: unknown): string;
export function guardModelOutput(text: unknown): GuardTextResult;
