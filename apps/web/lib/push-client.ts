import { getMessaging, getToken } from 'firebase/messaging';
import { getApps, getApp } from 'firebase/app';
import { api } from './api-client';

const TOKEN_KEY = 'fcm_token';

async function getVapidKey(): Promise<string | null> {
  try {
    const res = await fetch('/api/push-config');
    const data = (await res.json()) as { vapidKey: string | null };
    return data.vapidKey;
  } catch {
    return null;
  }
}

export async function initPush(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
  if (Notification.permission === 'denied') return;
  if (!getApps().length) return; // Firebase not initialized

  try {
    const vapidKey = await getVapidKey();
    if (!vapidKey) return; // Not configured

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    const existing = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
    const sw = existing ?? (await navigator.serviceWorker.register('/firebase-messaging-sw.js'));
    const messaging = getMessaging(getApp());
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: sw,
    });

    const stored = localStorage.getItem(TOKEN_KEY);
    if (token && token !== stored) {
      await api.push.register(token);
      localStorage.setItem(TOKEN_KEY, token);
    }
  } catch {
    // Push is optional — never block on failure
  }
}

export async function teardownPush(): Promise<void> {
  if (typeof window === 'undefined') return;
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return;
  try {
    await api.push.unregister(token);
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Best-effort cleanup
  }
}
