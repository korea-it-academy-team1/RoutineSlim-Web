import { useCallback, useEffect, useRef, useState } from "react";
import { request } from "../api/apiClient";
export function useApiResource(path) {
  const [result, setResult] = useState({ path: null, data: null });
  const data = result.path === path ? result.data : null;
  const setData = (value) => setResult({ path, data: value });
  const [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false);
  const sequence = useRef(0),
    locked = useRef(false);
  const reload = useCallback(async () => {
    if (!path) {
      setData(null);
      setLoading(false);
      return;
    }
    const current = ++sequence.current;
    setLoading(true);
    try {
      const value = await request(path);
      if (current === sequence.current) {
        setData(value);
        setError("");
      }
      return value;
    } catch (e) {
      if (current === sequence.current) setError(e.message);
      throw e;
    } finally {
      if (current === sequence.current) setLoading(false);
    }
  }, [path]);
  useEffect(() => {
    reload().catch(() => {});
    return () => {
      sequence.current++;
    };
  }, [reload]);
  async function run(work) {
    if (locked.current) return false;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      await work();
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  return { data, setData, error, setError, loading, busy, reload, run };
}
