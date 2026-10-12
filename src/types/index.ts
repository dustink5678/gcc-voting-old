export interface User {
  uid: string;
  displayName: string;
  name?: string; // Keep for backward compatibility
  email: string;
  photoURL?: string;
  verified: boolean;
  answered: boolean;
  role: 'admin' | 'shame' | 'user';
}

export interface Question {
  questionId: string;
  questionText: string;
  options: string[];
  answers: Record<string, number>;
  active: boolean;
  createdAt: Date | any; // Can be Date or Firestore Timestamp
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
} 

export interface TimerState {
  phase: 'main' | 'rotation';
  mainDurationMs: number;
  rotationDurationMs: number;
  isRunning: boolean;
  isPaused: boolean;
  endAt: number | null;
  lastUpdatedBy?: {
    uid: string;
    email?: string;
    role?: 'admin' | 'shame' | 'user';
  };
  lastUpdatedAt?: any; // Firestore server timestamp
  _remainingMs?: number;
}