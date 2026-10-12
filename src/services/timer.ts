import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { TimerState, User } from '../types';

const TIMER_DOC_ID = 'rotationTimer';

export const getTimerRef = () => doc(db, 'timer', TIMER_DOC_ID);

export const subscribeToTimer = (onChange: (state: TimerState | null) => void) => {
  return onSnapshot(getTimerRef(), (snap) => {
    if (!snap.exists()) {
      onChange(null);
      return;
    }
    const data = snap.data() as any;
    const state: TimerState = {
      phase: data.phase || 'main',
      mainDurationMs: data.mainDurationMs || 0,
      rotationDurationMs: data.rotationDurationMs || 0,
      isRunning: !!data.isRunning,
      isPaused: !!data.isPaused,
      endAt: data.endAt ?? null,
      lastUpdatedBy: data.lastUpdatedBy,
      lastUpdatedAt: data.lastUpdatedAt,
      _remainingMs: data._remainingMs,
    };
    onChange(state);
  });
};

export const ensureTimerDoc = async () => {
  const ref = getTimerRef();
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const initial: TimerState = {
      phase: 'main',
      mainDurationMs: 0,
      rotationDurationMs: 0,
      isRunning: false,
      isPaused: false,
      endAt: null,
    };
    await setDoc(ref, { ...initial, lastUpdatedAt: serverTimestamp() });
  }
};

const nowMs = () => Date.now();

const isController = (user: User | null | undefined) => {
  if (!user) return false;
  return user.role === 'admin';
};

export const startTimer = async (
  user: User,
  mainDurationMs: number,
  rotationDurationMs: number
) => {
  if (!isController(user)) throw new Error('Forbidden');
  if (mainDurationMs <= 0 || rotationDurationMs <= 0) throw new Error('Durations must be > 0');
  const ref = getTimerRef();
  await updateDoc(ref, {
    phase: 'main',
    mainDurationMs,
    rotationDurationMs,
    isRunning: true,
    isPaused: false,
    endAt: nowMs() + mainDurationMs,
    lastUpdatedBy: { uid: user.uid, email: user.email, role: user.role },
    lastUpdatedAt: serverTimestamp(),
  });
};

export const pauseTimer = async (user: User) => {
  if (!isController(user)) throw new Error('Forbidden');
  const ref = getTimerRef();
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data() as any as TimerState;
  if (!data.isRunning || data.isPaused) return;
  const remaining = data.endAt ? Math.max(0, data.endAt - nowMs()) : 0;
  await updateDoc(ref, {
    isPaused: true,
    isRunning: true,
    endAt: null,
    // keep durations/phase as is
    lastUpdatedBy: { uid: user.uid, email: (user as any).email, role: user.role },
    lastUpdatedAt: serverTimestamp(),
    // store remaining implicitly by clearing endAt; clients should compute remaining on resume using a temp var
    _remainingMs: remaining,
  } as any);
};

export const resumeTimer = async (user: User) => {
  if (!isController(user)) throw new Error('Forbidden');
  const ref = getTimerRef();
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data() as any;
  if (!data.isPaused) return;
  const remaining = typeof data._remainingMs === 'number' ? data._remainingMs : 0;
  await updateDoc(ref, {
    isPaused: false,
    isRunning: true,
    endAt: nowMs() + Math.max(0, remaining),
    _remainingMs: 0,
    lastUpdatedBy: { uid: user.uid, email: (user as any).email, role: user.role },
    lastUpdatedAt: serverTimestamp(),
  } as any);
};

export const resetTimer = async (user: User) => {
  if (!isController(user)) throw new Error('Forbidden');
  const ref = getTimerRef();
  await updateDoc(ref, {
    isRunning: false,
    isPaused: false,
    endAt: null,
    phase: 'main',
    lastUpdatedBy: { uid: user.uid, email: (user as any).email, role: user.role },
    lastUpdatedAt: serverTimestamp(),
  });
};

export const maybeAutoSwitchPhase = async (user: User) => {
  if (!isController(user)) return;
  const ref = getTimerRef();
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data() as any as TimerState & { _remainingMs?: number };
  if (!data.isRunning || data.isPaused || !data.endAt) return;
  const remaining = data.endAt - nowMs();
  if (remaining > 0) return;
  const nextPhase = data.phase === 'main' ? 'rotation' : 'main';
  const nextDuration = nextPhase === 'main' ? data.mainDurationMs : data.rotationDurationMs;
  await updateDoc(ref, {
    phase: nextPhase,
    endAt: nowMs() + Math.max(0, nextDuration || 0),
    lastUpdatedBy: { uid: user.uid, email: (user as any).email, role: user.role },
    lastUpdatedAt: serverTimestamp(),
  });
};

export const upsertDurations = async (user: User, mainDurationMs: number, rotationDurationMs: number) => {
  if (!isController(user)) throw new Error('Forbidden');
  const ref = getTimerRef();
  await updateDoc(ref, {
    mainDurationMs,
    rotationDurationMs,
    lastUpdatedBy: { uid: user.uid, email: (user as any).email, role: user.role },
    lastUpdatedAt: serverTimestamp(),
  });
};


