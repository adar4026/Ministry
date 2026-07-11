import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * State backed by AsyncStorage.
 *
 * - Starts from `seed` and hydrates from storage on mount.
 * - Persists only *after* the initial hydration completes, so the seed value
 *   never overwrites data that already exists on the device.
 * - On a fresh install (no stored value) the seed is written back, seeding storage.
 */
export function usePersistentState<T>(key: string, seed: T) {
  const [value, setValue] = useState<T>(seed);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(key);
        if (active && raw != null) setValue(JSON.parse(raw) as T);
      } catch {
        // Corrupt/unavailable storage: fall back to the seed already in state.
      }
      if (active) setLoaded(true);
    })();
    return () => {
      active = false;
    };
  }, [key]);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(key, JSON.stringify(value)).catch(() => {});
  }, [key, value, loaded]);

  return [value, setValue, loaded] as const;
}
