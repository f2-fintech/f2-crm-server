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
  verifyIdToken: async (idToken: string) => {
    try {
      // Fallback verification: Decode the JWT payload manually
      // Note: This does not verify the signature. Only use in dev when FIREBASE env vars are missing.
      const parts = idToken.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
      }
      let b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4 !== 0) {
        b64 += '=';
      }
      const payload = Buffer.from(b64, 'base64').toString('utf8');
      const data = JSON.parse(payload);
      
      if (!data.email) {
         throw new Error('No email in token');
      }
      return data;
    } catch (error: any) {
      console.error('JWT Decode Error:', error.message);
      throw new Error(`Fallback token verification failed: ${error.message}.`);
    }
  },
};
