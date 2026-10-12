import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Flex, Heading, HStack, Input, Stack, Text, useToast, Badge } from '@chakra-ui/react';
import { useAuth } from '../contexts/AuthContext';
import { TimerState, User } from '../types';
import { ensureTimerDoc, maybeAutoSwitchPhase, pauseTimer, resumeTimer, startTimer, subscribeToTimer, resetTimer, upsertDurations } from '../services/timer';

const mmss = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const parseToMs = (m: string, s: string) => {
  const mi = Math.max(0, parseInt(m || '0', 10) || 0);
  const si = Math.max(0, parseInt(s || '0', 10) || 0);
  return (mi * 60 + si) * 1000;
};

const TimerControl = () => {
  const { user } = useAuth() as any as { user: User };
  const toast = useToast();
  const [timer, setTimer] = useState<TimerState | null>(null);
  const [mainMin, setMainMin] = useState('0');
  const [mainSec, setMainSec] = useState('0');
  const [rotMin, setRotMin] = useState('0');
  const [rotSec, setRotSec] = useState('0');
  const [now, setNow] = useState(Date.now());
  const intervalRef = useRef<number | null>(null);

  const isController = useMemo(() => user && (user.role === 'admin'), [user]);

  useEffect(() => {
    ensureTimerDoc();
    const unsub = subscribeToTimer(setTimer);
    return () => unsub();
  }, []);

  useEffect(() => {
    // local ticking for display and auto-switch attempts (controllers only)
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(async () => {
      setNow(Date.now());
      if (isController && user) {
        try {
          await maybeAutoSwitchPhase(user);
        } catch {}
      }
    }, 250) as unknown as number;
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [isController, user]);

  useEffect(() => {
    if (!timer) return;
    setMainMin(String(Math.floor((timer.mainDurationMs || 0) / 60000)));
    setMainSec(String(Math.floor(((timer.mainDurationMs || 0) % 60000) / 1000)));
    setRotMin(String(Math.floor((timer.rotationDurationMs || 0) / 60000)));
    setRotSec(String(Math.floor(((timer.rotationDurationMs || 0) % 60000) / 1000)));
  }, [timer?.mainDurationMs, timer?.rotationDurationMs]);

  if (!user) {
    return (
      <Box p={8}><Heading size="md">Please sign in to view this page.</Heading></Box>
    );
  }

  if (!isController) {
    return (
      <Box p={8} textAlign="center">
        <Heading size="lg">403 - Forbidden</Heading>
        <Text mt={2}>You do not have access to this page.</Text>
      </Box>
    );
  }

  const remainingMs = (() => {
    if (!timer) return 0;
    if (!timer.isRunning) return 0;
    if (timer.isPaused) return (timer as any)._remainingMs || 0;
    if (!timer.endAt) return 0;
    return Math.max(0, timer.endAt - now);
  })();

  const handleStart = async () => {
    try {
      const mainMs = parseToMs(mainMin, mainSec);
      const rotMs = parseToMs(rotMin, rotSec);
      await upsertDurations(user, mainMs, rotMs);
      await startTimer(user, mainMs, rotMs);
      toast({ title: 'Timer started', status: 'success' });
    } catch (e: any) {
      toast({ title: e?.message || 'Failed to start', status: 'error' });
    }
  };

  const handlePauseResume = async () => {
    try {
      if (!timer) return;
      if (timer.isPaused) {
        await resumeTimer(user);
        toast({ title: 'Resumed', status: 'success' });
      } else {
        await pauseTimer(user);
        toast({ title: 'Paused', status: 'success' });
      }
    } catch (e: any) {
      toast({ title: e?.message || 'Failed to toggle', status: 'error' });
    }
  };

  const handleReset = async () => {
    try {
      await resetTimer(user);
      toast({ title: 'Reset', status: 'success' });
    } catch (e: any) {
      toast({ title: e?.message || 'Failed to reset', status: 'error' });
    }
  };

  const phaseLabel = timer?.phase === 'rotation' ? 'Rotation' : 'Main';

  return (
    <Box width="100vw" minH="100vh" bg="gray.50" display="flex" alignItems="center" justifyContent="center" py={8}>
      <Box bg="white" p={8} borderRadius="md" boxShadow="md" width="100%" maxW="720px">
        <Heading size="lg" mb={4}>Set Timer</Heading>
        <Stack spacing={6}>
          <Box>
            <Text fontWeight="bold" mb={2}>Durations</Text>
            <Stack direction={{ base: 'column', md: 'row' }} spacing={4}>
              <HStack>
                <Text w="80px">Main</Text>
                <Input type="number" value={mainMin} onChange={(e) => setMainMin(e.target.value)} placeholder="min" w="90px" />
                <Text>:</Text>
                <Input type="number" value={mainSec} onChange={(e) => setMainSec(e.target.value)} placeholder="sec" w="90px" />
              </HStack>
              <HStack>
                <Text w="80px">Rotation</Text>
                <Input type="number" value={rotMin} onChange={(e) => setRotMin(e.target.value)} placeholder="min" w="90px" />
                <Text>:</Text>
                <Input type="number" value={rotSec} onChange={(e) => setRotSec(e.target.value)} placeholder="sec" w="90px" />
              </HStack>
            </Stack>
          </Box>

          <Box textAlign="center">
            <Badge colorScheme={timer?.phase === 'rotation' ? 'purple' : 'blue'} mb={2}>{phaseLabel}</Badge>
            <Heading size="2xl">{mmss(remainingMs)}</Heading>
            <Text mt={2} color="gray.600">
              {timer?.isRunning ? (timer?.isPaused ? 'Paused' : 'Running') : 'Idle'}
            </Text>
          </Box>

          <Flex gap={3} justify="center">
            <Button colorScheme="blue" onClick={handleStart}>Start</Button>
            <Button colorScheme="yellow" onClick={handlePauseResume}>{timer?.isPaused ? 'Resume' : 'Pause'}</Button>
            <Button colorScheme="garnet" onClick={handleReset}>Reset</Button>
          </Flex>
        </Stack>
      </Box>
    </Box>
  );
};

export default TimerControl;
