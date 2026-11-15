import { useEffect, useRef, useState } from "react";
import { getSubscriptions } from "../../subscriptions/api/subscriptionsApi";
import { saveUsageCheck } from "../api/usageApi";
import { usageLevels } from "../utils/usageLevels";
export function useUsageChecks(open) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [pendingLevel, setPendingLevel] = useState(null);
  const [saving, setSaving] = useState(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const version = useRef(0),
    locked = useRef(false);
  async function load() {
    const current = ++version.current;
    setLoading(true);
    setError("");
    try {
      const rows = (await getSubscriptions()).filter((s) => s.status !== "canceled");
      if (current !== version.current) return;
      setItems(rows);
      setLoadFailed(false);

      if (rows.some((s) => s.usageAvailable === false))
        setError("사용량 정보를 불러오지 못했습니다. 다시 불러오기를 눌러주세요.");
    } catch (e) {
      if (current === version.current) {
        setError(e.message);
        setLoadFailed(true);
      }
    } finally {
      if (current === version.current) setLoading(false);
    }
  }
  useEffect(() => {
    if (open) load();
    return () => {
      version.current++;
    };
  }, [open]);
  async function save(item, level) {
    if (locked.current) return;
    locked.current = true;
    setSaving(item.id);
    setPendingLevel(level);
    setError("");
    setMessage("");
    try {
      const result = await saveUsageCheck(item.id, level);
      setItems((rows) =>
        rows.map((s) =>
          s.id === item.id
            ? {
                ...s,
                usageLevel: result.usageLevel,
                usageCheckedOn: result.checkedOn,
                usageAvailable: true,
              }
            : s,
        ),
      );
      setMessage(`${item.name} 사용량을 ‘${usageLevels[result.usageLevel]}’으로 저장했습니다.`);
      window.dispatchEvent(new Event("routineslim:subscriptions"));
    } catch (e) {
      setError(e.message);
    } finally {
      locked.current = false;
      setSaving(null);
      setPendingLevel(null);
    }
  }
  return { items, loading, loadFailed, saving, pendingLevel, error, message, reload: load, save };
}
