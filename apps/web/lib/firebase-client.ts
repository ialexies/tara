import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';

// Lazy — only initialize in the browser.
// Firebase Auth uses browser-only APIs; calling initializeApp during Next.js
// build/SSR throws auth/invalid-api-key because NEXT_PUBLIC_* vars aren't
// available as Docker build args (they'd be baked into the image layer).
let _auth: Auth | undefined;

if (typeof window !== 'undefined') {
  const firebaseConfig = {
    apiKey: process.env['NEXT_PUBLIC_FIREBASE_API_KEY']!,
    authDomain: process.env['NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN']!,
    projectId: process.env['NEXT_PUBLIC_FIREBASE_PROJECT_ID']!,
    storageBucket: process.env['NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET']!,
    messagingSenderId: process.env['NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID']!,
    appId: process.env['NEXT_PUBLIC_FIREBASE_APP_ID']!,
  };
  let app: FirebaseApp;
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0]!;
  }
  _auth = getAuth(app);
}

// Consumers are always 'use client' components — they only access firebaseAuth
// inside useEffect / event handlers, which run after browser hydration.
export const firebaseAuth = _auth as Auth;

export const googleProvider = new GoogleAuthProvider();
// Always show the account chooser, even if the user is already signed in to Google.
// Lets users switch accounts and makes signed-out state obvious.
googleProvider.setCustomParameters({ prompt: 'select_account' });
