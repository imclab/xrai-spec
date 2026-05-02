// Shared error-filter for browser visual tests. Excludes expected stub-
// endpoint 404s (Cloudflare Worker not running locally), gemini-key noise,
// the duplicate Chromium "Failed to load resource …404" line, and
// third-party font-CDN flakes. Real bugs still pass through.
export const errorFilter = e =>
  !/\/api\//i.test(e) &&
  !/livekit|gemini_key/i.test(e) &&
  !/Failed to load resource.*404/i.test(e) &&
  !/fontshare|googleapis/i.test(e);
