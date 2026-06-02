'use client';

import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { firebaseAuth } from '@/lib/firebase-client';
import { initPush, teardownPush } from '@/lib/push-client';

export function PushInit() {
  useEffect(() => {
    if (!firebaseAuth) return;

    const unsub = onAuthStateChanged(firebaseAuth, (user) => {
      if (user) {
        void initPush();
      } else {
        void teardownPush();
      }
    });

    return () => unsub();
  }, []);

  return null;
}
