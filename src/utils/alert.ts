import { Alert, Platform, type AlertButton } from 'react-native';

/**
 * Alert.alert is a no-op on react-native-web, so on the web this falls back to the
 * browser's own dialogs: alert() for notices, confirm() for cancel-or-act prompts.
 */
export function showAlert(title: string, message?: string, buttons?: AlertButton[]) {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }

  const text = message ? `${title}\n\n${message}` : title;
  const cancel = buttons?.find((b) => b.style === 'cancel');
  const actions = buttons?.filter((b) => b.style !== 'cancel') ?? [];

  if (!cancel || actions.length === 0) {
    window.alert(text);
    (actions[0] ?? cancel)?.onPress?.();
    return;
  }

  // With several actions the last one is the primary choice, matching native button order.
  if (window.confirm(text)) actions[actions.length - 1].onPress?.();
  else cancel.onPress?.();
}
