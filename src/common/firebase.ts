import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import * as dotenv from 'dotenv';
dotenv.config();

let authInstance: any = null;

if (!getApps().length) {
  try {
    if (
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
    ) {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
      authInstance = getAuth();
    } else {
      console.warn('Firebase config missing in .env. Google Login will be disabled.');
    }
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
} else {
  authInstance = getAuth();
}

export const auth = authInstance || {
  verifyIdToken: async () => {
    throw new Error('Firebase Auth is not initialized. Please configure FIREBASE_* environment variables.');
  },
};
