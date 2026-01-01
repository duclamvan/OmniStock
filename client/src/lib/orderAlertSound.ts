let audioContext: AudioContext | null = null;
let lastPlayedAt = 0;
const MINIMUM_INTERVAL_MS = 3000;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

export function playOrderAlertSound(): boolean {
  const now = Date.now();
  if (now - lastPlayedAt < MINIMUM_INTERVAL_MS) {
    return false;
  }
  
  try {
    const ctx = getAudioContext();
    
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.type = 'sine';
    
    const now2 = ctx.currentTime;
    
    oscillator.frequency.setValueAtTime(880, now2);
    oscillator.frequency.setValueAtTime(1100, now2 + 0.1);
    oscillator.frequency.setValueAtTime(880, now2 + 0.2);
    
    gainNode.gain.setValueAtTime(0, now2);
    gainNode.gain.linearRampToValueAtTime(0.3, now2 + 0.02);
    gainNode.gain.setValueAtTime(0.3, now2 + 0.08);
    gainNode.gain.linearRampToValueAtTime(0.4, now2 + 0.12);
    gainNode.gain.setValueAtTime(0.4, now2 + 0.18);
    gainNode.gain.linearRampToValueAtTime(0.3, now2 + 0.22);
    gainNode.gain.linearRampToValueAtTime(0, now2 + 0.35);
    
    oscillator.start(now2);
    oscillator.stop(now2 + 0.35);
    
    lastPlayedAt = now;
    return true;
  } catch (error) {
    console.error('Failed to play order alert sound:', error);
    return false;
  }
}

export function showBrowserNotification(title: string, body: string, options?: { tag?: string; onClick?: () => void }): boolean {
  if (!('Notification' in window)) {
    return false;
  }
  
  if (Notification.permission !== 'granted') {
    return false;
  }
  
  try {
    const notification = new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag: options?.tag || 'order-alert',
      requireInteraction: false,
      silent: true,
    });
    
    if (options?.onClick) {
      notification.onclick = () => {
        window.focus();
        options.onClick?.();
        notification.close();
      };
    }
    
    setTimeout(() => notification.close(), 10000);
    
    return true;
  } catch (error) {
    console.error('Failed to show browser notification:', error);
    return false;
  }
}

let browserNotificationShownRecently = false;

export function alertNewOrders(
  newOrderCount: number,
  options?: {
    onNotificationClick?: () => void;
    title?: string;
    body?: string;
  }
): { soundPlayed: boolean; browserNotificationShown: boolean } {
  const result = {
    soundPlayed: false,
    browserNotificationShown: false
  };
  
  if (newOrderCount <= 0) {
    return result;
  }
  
  const browserNotificationShown = showBrowserNotification(
    options?.title || 'New Order Alert',
    options?.body || `${newOrderCount} new order${newOrderCount > 1 ? 's' : ''} to pick`,
    {
      tag: 'new-order-alert',
      onClick: options?.onNotificationClick
    }
  );
  
  result.browserNotificationShown = browserNotificationShown;
  
  if (browserNotificationShown) {
    if (!browserNotificationShownRecently) {
      result.soundPlayed = playOrderAlertSound();
      browserNotificationShownRecently = true;
      setTimeout(() => {
        browserNotificationShownRecently = false;
      }, 5000);
    }
  } else {
    result.soundPlayed = playOrderAlertSound();
  }
  
  return result;
}

export function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return Promise.resolve('denied');
  }
  
  return Notification.requestPermission();
}
