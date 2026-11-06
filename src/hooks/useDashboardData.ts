import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Testeintraege } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [testeintraege, setTesteintraege] = useState<Testeintraege[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [testeintraegeData] = await Promise.all([
        LivingAppsService.getTesteintraege(),
      ]);
      setTesteintraege(testeintraegeData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Silent background refresh (no loading state change → no flicker)
  useEffect(() => {
    async function silentRefresh() {
      try {
        const [testeintraegeData] = await Promise.all([
          LivingAppsService.getTesteintraege(),
        ]);
        setTesteintraege(testeintraegeData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  return { testeintraege, setTesteintraege, loading, error, fetchAll };
}