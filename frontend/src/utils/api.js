/**
 * api.js – Safe fetch wrapper for all backend calls.
 *
 * The Render free-tier backend returns an HTML "The page cannot be found"
 * error page (not JSON) during cold starts or when the service is sleeping.
 * Calling res.json() directly on such a response throws:
 *   "Unexpected token 'T', "The page c"... is not valid JSON"
 *
 * safeJson() guards against this by checking Content-Type before parsing.
 */

/**
 * Parse a fetch Response as JSON safely.
 * If the response is not application/json, throws a descriptive Error
 * instead of a cryptic SyntaxError.
 *
 * @param {Response} res - The fetch Response object
 * @returns {Promise<any>} Parsed JSON
 */
export async function safeJson(res) {
  const contentType = res.headers.get('Content-Type') || ''
  if (!contentType.includes('application/json')) {
    // Grab a snippet of the raw body to help with debugging
    let snippet = ''
    try {
      snippet = (await res.text()).slice(0, 200)
    } catch (_) {
      // ignore
    }
    throw new Error(
      `Backend returned a non-JSON response (HTTP ${res.status}). ` +
      `The server may be starting up or unreachable on Render. ` +
      (snippet ? `Raw: ${snippet}` : '')
    )
  }
  return res.json()
}

/**
 * Wrapper around fetch that always returns a safe JSON response.
 * On network errors or non-JSON responses it throws an Error with
 * a human-readable message.
 *
 * @param {string} url
 * @param {RequestInit} [options]
 * @returns {Promise<{ res: Response, data: any }>}
 */
export async function apiFetch(url, options = {}) {
  const res = await fetch(url, options)
  const data = await safeJson(res)
  return { res, data }
}
