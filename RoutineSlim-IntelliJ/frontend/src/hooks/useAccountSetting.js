import { useEffect, useState } from "react";
import { request } from "../api/apiClient";
const readCache = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const writeCache = (key, value) => {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* Account storage remains authoritative. */
  }
};
function valid(name, value, fallback) {
  if (name === "reminder-days")
    return [0, 1, 3, 7].includes(Number(value)) ? Number(value) : fallback;
  if (name === "budget")
    return value === "" || /^[0-9]{1,15}$/.test(String(value))
      ? String(value)
      : fallback;
  return value;
}
export function useAccountSetting(user, name, fallback) {
  const key = `routineslim:${name}:${user}`;
  const [value, setValue] = useState(fallback),
    [ready, setReady] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setReady(false);
    setError("");
    setValue(fallback);
    request("/api/data/setting-" + name)
      .then(async (result) => {
        let current = JSON.parse(result.json);
        if (current === null) {
          const cached = readCache(key);
          current = valid(name, cached ?? fallback, fallback);
          if (cached !== null && active)
            await request("/api/data/setting-" + name, {
              method: "PUT",
              body: { json: JSON.stringify(current) },
            });
        }
        current = valid(name, current, fallback);
        if (active) {
          setValue(current);
          writeCache(key, current);
          setReady(true);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [user, name]);
  async function save(next = value) {
    await request("/api/data/setting-" + name, {
      method: "PUT",
      body: { json: JSON.stringify(next) },
    });
    writeCache(key, next);
    setValue(next);
    setError("");
  }
  return { value, setValue, ready, error, save };
}
