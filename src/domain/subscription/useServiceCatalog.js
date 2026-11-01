import * as subscriptionsApi from "./subscriptionsApi";
import { useEffect, useState } from "react";

let shared = null;
function load() {
  if (!shared)
    shared = subscriptionsApi
      .getServiceCatalog()
      .then((rows) =>
        Array.isArray(rows)
          ? rows.filter(
              (x) =>
                typeof x.name === "string" &&
                typeof x.icon === "string" &&
                typeof x.background === "string",
            )
          : [],
      )
      .finally(() => {
        shared = null;
      });
  return shared;
}
export function useServiceCatalog() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    let active = true;
    load()
      .then((rows) => {
        if (active) setItems(rows);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  return items;
}
