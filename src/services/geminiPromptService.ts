import { ENV, hasAIBackend, isGeminiConfigured } from '../config/env';
import { getTxLanguage, tx } from '../i18n/tx';
import { messageForHttpError } from './errorMessages';
import { AI_CONSENT_REQUIRED, hasAiConsent } from './aiConsentService';
import { addBreadcrumb, captureMessage } from './monitoringService';
import { buildPromptEnhanceRequest, finishEnhancedPrompt } from '../../server/prompt-guard';
import { cleanModelOutput, validatePromptSafety } from '../utils/security';
import type { CakeKind } from '../screens/CakeBuilderScreen';

export interface EnhancePromptResult {
  success: boolean;
  prompt?: string;
  error?: string;
}

export type EnhanceContext = { kind?: CakeKind };

const MAX_TOKENS = 400;

function finish(raw: unknown): EnhancePromptResult {
  const output = cleanModelOutput(raw);
  if (!output.ok) return { success: false, error: output.userMessage };
  const prompt = finishEnhancedPrompt(output.value);
  if (!prompt) return { success: false, error: tx('Yapay zeka bu sefer geçerli bir yanıt vermedi. Lütfen tekrar dene.') };
  return { success: true, prompt };
}

async function enhanceViaBackend(text: string, context: EnhanceContext): Promise<EnhancePromptResult> {
  const endpoint = `${ENV.AI_BACKEND_URL.replace(/\/+$/, '')}/api/enhance-prompt`;
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ prompt: text, kind: context.kind, language: getTxLanguage() }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { success: false, error: messageForHttpError(response.status, err) };
    }
    const data = await response.json();
    return finish(data?.prompt);
  } catch {
    return { success: false, error: tx('Ağ bağlantı hatası oluştu.') };
  }
}

async function enhanceDirect(text: string, context: EnhanceContext): Promise<EnhancePromptResult> {
  const apiKey = ENV.GEMINI_API_KEY.trim();
  const configured = ENV.GEMINI_RECIPE_MODEL.trim() || 'gemini-3.1-flash-lite';
  const models = Array.from(new Set([configured, 'gemini-3.1-flash-lite', 'gemini-2.5-flash', 'gemini-2.0-flash-lite']));
  const { systemInstruction, userText } = buildPromptEnhanceRequest(text, context, getTxLanguage());
  let lastError = '';

  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents: [{ role: 'user', parts: [{ text: userText }] }],
            generationConfig: { maxOutputTokens: MAX_TOKENS, temperature: 0.8, topP: 0.95 },
          }),
        },
      );
      if (!response.ok) {
        lastError = messageForHttpError(response.status);
        if (response.status === 404) continue; // model not available, try the next one
        return { success: false, error: lastError };
      }
      const data = await response.json();
      const raw = data?.candidates?.[0]?.content?.parts?.find((p: { text?: unknown }) => typeof p?.text === 'string')?.text;
      if (!raw) {
        lastError = tx('Yapay zeka bu sefer geçerli bir yanıt vermedi. Lütfen tekrar dene.');
        continue;
      }
      return finish(raw);
    } catch {
      lastError = tx('Ağ bağlantı hatası oluştu.');
    }
  }
  return { success: false, error: lastError || tx('Yapay zeka bu sefer geçerli bir yanıt vermedi. Lütfen tekrar dene.') };
}

/**
 * Rewrites the user's cake idea into a richer prompt with Gemini 3.1 Flash Lite.
 * Free for the user; it does not spend credits.
 */
export async function enhanceCakePrompt(text: string, context: EnhanceContext = {}): Promise<EnhancePromptResult> {
  if (!(await hasAiConsent())) return { success: false, error: AI_CONSENT_REQUIRED };

  const check = validatePromptSafety(text);
  if (!check.isSafe) {
    return {
      success: false,
      error: check.userMessage || tx('Güvenlik Uyarısı: Girilen metin sistem güvenlik ilkelerine uygun değildir.'),
    };
  }
  const safeText = check.sanitizedText.trim();
  if (!safeText) return { success: false, error: tx('Önce pastanızı birkaç kelimeyle anlatın.') };

  if (!isGeminiConfigured()) return { success: false, error: 'GEMINI_API_KEY_MISSING' };

  addBreadcrumb('ai_prompt_enhance', 'İstem iyileştirme başlatıldı', { length: safeText.length, kind: context.kind });

  let result: EnhancePromptResult;
  if (hasAIBackend()) {
    result = await enhanceViaBackend(safeText, context);
    if (!result.success && ENV.GEMINI_API_KEY) result = await enhanceDirect(safeText, context);
  } else {
    result = await enhanceDirect(safeText, context);
  }

  if (!result.success) captureMessage(`[AI Prompt Enhance] ${result.error}`, 'warning');
  return result;
}
