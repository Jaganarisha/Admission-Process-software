import { useCallback, useEffect, useState } from 'react';
import api, { errorMessage } from './api';

/** Loads the signed-in student's application. */
export function useMyApplication() {
  const [app, setApp] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    try { const { data } = await api.get('/student/applications/me'); setApp(data.application); setError(''); }
    catch (e) { setError(errorMessage(e)); } finally { setLoading(false); }
  }, []);
  useEffect(() => { reload(); }, [reload]);
  return { app, setApp, error, loading, reload };
}
