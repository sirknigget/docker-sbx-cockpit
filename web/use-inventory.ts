import { useCallback, useEffect, useState } from 'react';
import { inventorySchema, type Sandbox } from '../shared/contracts';
import { api } from './api';
export function useInventory() {
  const [sandboxes, setSandboxes] = useState<Sandbox[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setSandboxes((await api('/sandboxes', inventorySchema)).sandboxes);
      setError('');
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Unable to load sandboxes',
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return { sandboxes, loading, error, setError, refresh };
}
