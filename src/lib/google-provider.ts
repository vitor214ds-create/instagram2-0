/** Runtime check of the public Supabase Auth provider settings.
 * A signInWithOAuth URL can be returned even when the provider is disabled.
 * We check the public /auth/v1/settings endpoint BEFORE redirecting the browser.
 * Client keys are publishable; never provide a service-role/secret key here.
 */
export type ProviderStatus = "enabled" | "disabled" | "unavailable";

export function parseGoogleProviderStatus(value: unknown): ProviderStatus {
  if (!value || typeof value !== "object") return "unavailable";
  const external = (value as { external?: unknown }).external;
  if (!external || typeof external !== "object") return "unavailable";
  const google = (external as { google?: unknown }).google;
  return google === true ? "enabled" : google === false ? "disabled" : "unavailable";
}

export async function checkGoogleProviderStatus(
  authBaseUrl: string,
  publishableKey: string,
  options: { signal?: AbortSignal; fetcher?: typeof fetch } = {},
): Promise<ProviderStatus> {
  if (!/^https:\/\//i.test(authBaseUrl) || !publishableKey) return "unavailable";
  const url = authBaseUrl.replace(/\/+$/, "") + "/auth/v1/settings";
  try {
    const response = await (options.fetcher ?? fetch)(url, {
      method: "GET",
      headers: { apikey: publishableKey, Accept: "application/json" },
      signal: options.signal,
    });
    if (!response.ok) return "unavailable";
    return parseGoogleProviderStatus(await response.json());
  } catch {
    return "unavailable";
  }
}
