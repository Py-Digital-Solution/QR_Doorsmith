import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let appCheckInitialized = false;

export function getFirebaseApp() {
  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

  if (!appCheckInitialized && typeof window !== "undefined") {
    // Development: use Firebase debug token so App Check is satisfied without reCAPTCHA.
    // On first run Firebase logs the debug token to the browser console  copy it and
    // register it once at: Firebase Console → App Check → Your app → Manage debug tokens.
    if (process.env.NODE_ENV !== "production") {
      // @ts-expect-error – Firebase App Check debug global
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }

    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    if (siteKey) {
      initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(siteKey),
        isTokenAutoRefreshEnabled: true,
      });
      appCheckInitialized = true;
    }
  }

  return app;
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}
