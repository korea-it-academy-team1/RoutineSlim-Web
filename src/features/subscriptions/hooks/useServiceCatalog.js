import { getApiConfig } from "../../../shared/api/apiConfig";
import * as subscriptionsApi from "../api/subscriptionsApi";
import { useEffect, useState } from "react";

let shared = null;
function load() {
  if (!shared)
    shared = subscriptionsApi
      .getServiceCatalog()
      .then((rows) => (Array.isArray(rows) ? rows.filter((x) => typeof x?.name === "string") : []))
      .finally(() => {
        shared = null;
      });
  return shared;
}
export function useServiceCatalog(iconsOnly = false) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    let active = true;
    if (getApiConfig().mode === "server-dev")
      return () => {
        active = false;
      };
    load()
      .then((rows) => {
        if (active) setItems(rows);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  return iconsOnly
    ? items.filter((x) => typeof x.icon === "string" && typeof x.background === "string")
    : items;
}
