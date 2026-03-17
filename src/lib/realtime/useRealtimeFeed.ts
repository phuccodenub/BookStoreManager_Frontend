import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

import { runtimeEnv } from '@/lib/config';

interface RealtimeEntry {
  event: string;
  payload: unknown;
  receivedAt: string;
}

const realtimeEvents = [
  'order:created',
  'order:updated',
  'order:statusChanged',
  'payment:updated',
  'payment:success',
  'inventory:low-stock',
  'notification:new',
] as const;

export function useRealtimeFeed(accessToken: string | null, enabled = true) {
  const [events, setEvents] = useState<RealtimeEntry[]>([]);

  useEffect(() => {
    if (!enabled || !accessToken) {
      setEvents([]);
      return;
    }

    const socket = io(runtimeEnv.VITE_API_BASE_URL, {
      path: '/socket.io',
      auth: { token: accessToken },
      transports: ['websocket'],
    });

    for (const eventName of realtimeEvents) {
      socket.on(eventName, (payload) => {
        setEvents((current) => [{ event: eventName, payload, receivedAt: new Date().toISOString() }, ...current].slice(0, 8));
      });
    }

    return () => {
      socket.disconnect();
    };
  }, [accessToken, enabled]);

  return events;
}
