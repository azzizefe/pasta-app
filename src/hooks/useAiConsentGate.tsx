import React, { useCallback, useRef, useState } from 'react';

import AiConsentSheet from '../components/AiConsentSheet';
import { grantAiConsent, hasAiConsent } from '../services/aiConsentService';

/**
 * Asks for AI data-sharing permission before the first AI request.
 *
 *   const { ensureAiConsent, consentSheet } = useAiConsentGate();
 *   if (!(await ensureAiConsent())) return;   // user declined
 *   ...render {consentSheet} inside the screen (works inside other modals too)
 *
 * Calls made while the sheet is open share the same answer, so a screen that starts
 * the image and the recipe at once shows the sheet only once.
 */
export function useAiConsentGate() {
  const [visible, setVisible] = useState(false);
  const pending = useRef<Promise<boolean> | null>(null);
  const resolver = useRef<((granted: boolean) => void) | null>(null);

  const ensureAiConsent = useCallback(async (): Promise<boolean> => {
    if (pending.current) return pending.current;
    if (await hasAiConsent()) return true;
    if (!pending.current) {
      pending.current = new Promise<boolean>((resolve) => {
        resolver.current = resolve;
        setVisible(true);
      });
    }
    return pending.current;
  }, []);

  const finish = useCallback(async (granted: boolean) => {
    setVisible(false);
    if (granted) {
      try {
        await grantAiConsent();
      } catch (err) {
        console.warn('[AiConsent] İzin kaydedilemedi:', err);
      }
    }
    resolver.current?.(granted);
    resolver.current = null;
    pending.current = null;
  }, []);

  const consentSheet = (
    <AiConsentSheet visible={visible} onAccept={() => finish(true)} onDecline={() => finish(false)} />
  );

  return { ensureAiConsent, consentSheet };
}
