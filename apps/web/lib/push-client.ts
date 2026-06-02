import { getMessaging, getToken } from 'firebase/messaging';
import { getApps, getApp } from 'firebase/app';
import { api } from './api-client';

// Set NEXT_PUBLIC_FIREBASE_VAPID_KEY from Firebase Console →
// Project Settings → Cloud Messaging → Web Push certificates → Key pair
const VAPID_KEY = process.env['NEXT_PUBLIC_FIREBASE_VAPID_KEY'];
const TOKEN_KEY = 'fcm_token';

export async function initPush(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
  if (Notification.permission === 'denied') return;
  if (!getApps().length) return; // Firebase not initialized
  if (!VAPID_KEY) return; // Not configured

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    const existing = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
    const sw = existing ?? (await navigator.serviceWorker.register('/firebase-messaging-sw.js'));
    const messaging = getMessaging(getApp());
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
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
