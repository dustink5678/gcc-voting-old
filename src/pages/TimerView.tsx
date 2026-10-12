import { useEffect, useRef, useState } from 'react';
import { Box, Heading, Stack, Text, Badge } from '@chakra-ui/react';
import { useAuth } from '../contexts/AuthContext';
import { TimerState, User } from '../types';
import { ensureTimerDoc, maybeAutoSwitchPhase, subscribeToTimer } from '../services/timer';

const mmss = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const TimerView = () => {
  const { user } = useAuth() as any as { user: User };
  const [timer, setTimer] = useState<TimerState | null>(null);
  const [now, setNow] = useState(Date.now());
  const intervalRef = useRef<number | null>(null);

  const isController = user && (user.role === 'admin');

  useEffect(() => {
    ensureTimerDoc();
    const unsub = subscribeToTimer(setTimer);
    return () => unsub();
  }, []);

  useEffect(() => {
    // local ticking for display and throttled auto-switch attempts (controllers only)
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(async () => {
      const now = Date.now();
      setNow(now);
      // Throttle maybeAutoSwitchPhase checks to ~every 2 seconds
      if (isController && user && (now % 2000) < 250) {
        try {
          await maybeAutoSwitchPhase(user);
        } catch {}
      }
    }, 250) as unknown as number;
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [isController, user]);

  if (!user) {
    return (
      <Box p={8}><Heading size="md">Please sign in to view this page.</Heading></Box>
    );
  }

  const remainingMs = (() => {
    if (!timer) return 0;
    if (!timer.isRunning) return 0;
    if (timer.isPaused) return (timer as any)._remainingMs || 0;
    if (!timer.endAt) return 0;
    return Math.max(0, timer.endAt - now);
  })();

  const phaseLabel = timer?.phase === 'rotation' ? 'Rotation' : 'Main';

  return (
    <Box width="100vw" minH="100vh" bg="gray.50" display="flex" alignItems="center" justifyContent="center" py={8}>
      <Box bg="white" p={8} borderRadius="md" boxShadow="md" width="100%" maxW="720px">
        <Heading size="lg" mb={4}>Timer</Heading>
        <Stack spacing={6}>
          <Box textAlign="center">
            <Badge colorScheme={timer?.phase === 'rotation' ? 'purple' : 'blue'} mb={2} fontSize="md">{phaseLabel}</Badge>
            <Heading size="3xl">{mmss(remainingMs)}</Heading>
            <Text mt={2} color="gray.600">
              {timer?.isRunning ? (timer?.isPaused ? 'Paused' : 'Running') : 'Idle'}
            </Text>
          </Box>
          <Text textAlign="center" color="gray.500" fontSize="sm">
            Timer controlled by administrators
          </Text>
        </Stack>
      </Box>
    </Box>
  );
};

export default TimerView;
