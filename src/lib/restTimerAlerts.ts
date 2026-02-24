import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';

type RestAlertSettings = {
  warn10Seconds: boolean;
  soundsEnabled: boolean;
  hapticsEnabled: boolean;
};

export interface ScheduledRestAlerts {
  endNotificationId?: string;
  warningNotificationId?: string;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    return true;
  }
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function scheduleRestAlerts(
  restSeconds: number,
  settings: RestAlertSettings,
): Promise<ScheduledRestAlerts> {
  if (restSeconds <= 0) {
    return {};
  }

  const hasPermission = await ensureNotificationPermission();
  if (!hasPermission) {
    return {};
  }

  const scheduled: ScheduledRestAlerts = {};

  if (settings.warn10Seconds && restSeconds > 10) {
    scheduled.warningNotificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Pepe • Descanso',
        body: 'Faltam 10 segundos para a próxima série.',
        sound: settings.soundsEnabled,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: restSeconds - 10 },
    });
  }

  scheduled.endNotificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Pepe • Descanso finalizado',
      body: 'Hora da próxima série.',
      sound: settings.soundsEnabled,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: restSeconds },
  });

  return scheduled;
}

export async function cancelScheduledRestAlerts(alerts?: ScheduledRestAlerts | null): Promise<void> {
  if (!alerts) {
    return;
  }
  const ids = [alerts.warningNotificationId, alerts.endNotificationId].filter(Boolean) as string[];
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined)));
}

export async function triggerRestForegroundCue(kind: '10s' | 'end', settings: RestAlertSettings): Promise<void> {
  if (!settings.hapticsEnabled) {
    return;
  }
  if (kind === '10s') {
    await Haptics.selectionAsync().catch(() => undefined);
    return;
  }
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
}
