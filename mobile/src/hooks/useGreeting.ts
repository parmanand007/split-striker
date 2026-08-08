import { useCallback, useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { greetingForNow } from '@/src/utils/format';

/** Greeting that follows device local time and refreshes on resume / minute ticks. */
export function useGreeting() {
  const [greeting, setGreeting] = useState(() => greetingForNow());

  const refresh = useCallback(() => {
    setGreeting((prev) => {
      const next = greetingForNow();
      return prev === next ? prev : next;
    });
  }, []);

  useEffect(() => {
    const onAppState = (state: AppStateStatus) => {
      if (state === 'active') refresh();
    };
    const sub = AppState.addEventListener('change', onAppState);
    const id = setInterval(refresh, 60_000);
    return () => {
      sub.remove();
      clearInterval(id);
    };
  }, [refresh]);

  return greeting;
}
