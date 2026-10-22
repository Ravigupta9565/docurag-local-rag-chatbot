/**
 * api.js – Centralized API configuration and safe response handler.
 *
 * Directs frontend calls to the live Render backend at:
 * https://docurag-local-rag-chatbot.onrender.com
 */

export const API_BASE_URL = (
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  "https://docurag-local-rag-chatbot.onrender.com"
).replace(/\/$/, "");

/**
 * Builds an absolute API URL using API_BASE_URL.
 *
 * @param {string} endpoint - e.g. "/api/upload" or "api/upload"
 * @returns {string} - e.g. "https://docurag-local-rag-chatbot.onrender.com/api/upload"
 */
export function apiUrl(endpoint) {
  if (!endpoint) return API_BASE_URL;
  if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
    return endpoint;
  }
  const clean = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${clean}`;
}

/**
 * Parses a fetch Response safely with full status and content-type verification.
 * 
 * - Verifies res.ok (HTTP 200-299)
 * - Guards against non-JSON (e.g. HTML 404 / 502 / 503 proxy pages)
 * - Extracts clean error details without throwing cryptic "Unexpected token 'T'"
 *
 * @param {Response} res - The fetch response
 * @returns {Promise<any>}
 */
export async function safeJson(res) {
  const contentType = (res.headers && (res.headers.get("content-type") || res.headers.get("Content-Type"))) || "";

  if (!res.ok) {
    let errorDetail = `Request failed with HTTP ${res.status}`;
    try {
      if (contentType.includes("application/json")) {
        const errJson = await res.json();
        errorDetail = errJson.detail || errJson.message || errJson.error || JSON.stringify(errJson);
      } else {
        const rawText = await res.text();
        const snippet = rawText
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 150);
        errorDetail = `Backend error (HTTP ${res.status}): ${snippet || res.statusText || "Server error"}`;
      }
    } catch (_) {
      errorDetail = `Backend returned HTTP ${res.status} (${res.statusText || "Error"})`;
    }

    const err = new Error(errorDetail);
    err.status = res.status;
    throw err;
  }

  if (!contentType.includes("application/json")) {
    let snippet = "";
    try {
      const rawText = await res.text();
      snippet = rawText
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 150);
    } catch (_) {}

    throw new Error(
      `Expected JSON from backend, but received non-JSON (HTTP ${res.status}). ${snippet || "Check backend status."}`
    );
  }

  return res.json();
}

/**
 * Convenience wrapper around fetch using apiUrl and safeJson.
 */
export async function apiFetch(endpoint, options = {}) {
  const url = apiUrl(endpoint);
  const res = await fetch(url, options);
  const data = await safeJson(res);
  return { res, data };
}
