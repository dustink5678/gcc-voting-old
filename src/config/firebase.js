// Firebase configuration with modular SDK
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase with error handling
let firebaseApp;
try {
  firebaseApp = initializeApp(firebaseConfig);
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase:', error);
}

// Initialize Firebase services with error handling
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

// Initialize Analytics conditionally to handle privacy blockers
let analytics = null;
isSupported().then(yes => {
  if (yes) {
    analytics = getAnalytics(firebaseApp);
    console.log('Analytics initialized successfully');
  } else {
    console.log('Analytics not supported in this environment');
  }
}).catch(error => {
  console.error('Error initializing analytics:', error);
});

// Connect to emulators if in development mode
if (process.env.NODE_ENV === 'development' || import.meta.env?.DEV) {
  try {
    // Uncomment these lines if you're using Firebase emulators
    // connectAuthEmulator(auth, 'http://localhost:9099');
    // connectFirestoreEmulator(db, 'localhost', 8080);
    // console.log('Connected to Firebase emulators');
  } catch (error) {
    console.error('Error connecting to emulators:', error);
  }
}

export { auth, db, analytics, firebaseApp }; 