/** Shared JSON/FormData handling for the two supported backend contracts. */
export function serializeBody(body, headers) {
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  if (body === undefined || typeof body === "string" || isFormData) return body;
  headers["Content-Type"] = "application/json";
  return JSON.stringify(body);
}

export async function readResponse(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function getErrorMessage(value, fallback) {
  const detail =
    value && typeof value === "object" ? value.message || value.detail || value.error : null;
  return typeof detail === "string" ? detail : fallback;
}
