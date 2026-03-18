import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useRecentSearches(storageKey: string, limit = 10) {
  const [items, setItems] = useState<string[]>([]);

  const load = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      setItems(Array.isArray(parsed) ? parsed : []);
    } catch {
      setItems([]);
    }
  }, [storageKey]);

  const addItem = useCallback(
    (item: string) => {
      setItems((prev) => {
        const next = [item, ...prev.filter((c) => c !== item)].slice(0, limit);
        AsyncStorage.setItem(storageKey, JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    [storageKey, limit]
  );

  return { items, addItem, load };
}
