/** Room summary returned by the server listing endpoint. */
export interface RoomInfo {
  id: string;
  name: string | null;
  clientCount: number;
  createdAt: number;
  lastActiveAt: number;
}

/** Detailed room info (same shape for now, extensible later). */
export type RoomDetail = RoomInfo;

/** Error thrown when a server API call fails. */
export class ServerApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = "ServerApiError";
  }
}

const REQUEST_TIMEOUT_MS = 10_000;

function httpUrl(serverUrl: string): string {
  // Convert ws:// / wss:// to http:// / https:// if needed
  return serverUrl
    .replace(/^ws:\/\//, "http://")
    .replace(/^wss:\/\//, "https://")
    .replace(/\/+$/, "");
}

/**
 * Attempt a fetch via the Tauri HTTP plugin (Rust-side networking).
 * Returns null if the plugin is unavailable (e.g. running in browser).
 */
async function tauriFetch(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response | null> {
  try {
    const { fetch: tFetch } = await import("@tauri-apps/plugin-http");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await tFetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return null; // Not running in Tauri, or plugin not available
  }
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number = REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    // Try Tauri HTTP fallback — handles WebView2 network issues on Windows
    const tauriResponse = await tauriFetch(url, init, timeoutMs);
    if (tauriResponse) return tauriResponse;

    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ServerApiError("Request timed out");
    }
    throw new ServerApiError(
      err instanceof Error ? err.message : "Server unreachable",
    );
  } finally {
    clearTimeout(timer);
  }
}

interface RawRoomInfo {
  id: string;
  name: string | null;
  client_count: number;
  created_at: number;
  last_active_at: number;
}

function mapRoom(raw: RawRoomInfo): RoomInfo {
  return {
    id: raw.id,
    name: raw.name,
    clientCount: raw.client_count,
    createdAt: raw.created_at,
    lastActiveAt: raw.last_active_at,
  };
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new ServerApiError("Server returned non-JSON response", response.status);
  }
  return (await response.json()) as T;
}

/** Fetch the list of all rooms from the collaboration server. */
export async function fetchRooms(serverUrl: string): Promise<RoomInfo[]> {
  const base = httpUrl(serverUrl);
  const response = await fetchWithTimeout(`${base}/api/rooms`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new ServerApiError(
      `Failed to fetch rooms: ${response.statusText}`,
      response.status,
    );
  }

  const raw = await parseJsonResponse<RawRoomInfo[]>(response);
  return raw.map(mapRoom);
}

/** Fetch details for a single room. */
export async function fetchRoom(
  serverUrl: string,
  roomId: string,
): Promise<RoomDetail> {
  const base = httpUrl(serverUrl);
  const response = await fetchWithTimeout(
    `${base}/api/rooms/${encodeURIComponent(roomId)}`,
    {
      method: "GET",
      headers: { Accept: "application/json" },
    },
  );

  if (!response.ok) {
    throw new ServerApiError(
      `Failed to fetch room: ${response.statusText}`,
      response.status,
    );
  }

  return mapRoom(await parseJsonResponse<RawRoomInfo>(response));
}

/** Create a new named room on the server. */
export async function createRoom(
  serverUrl: string,
  name: string,
  userName?: string,
): Promise<RoomInfo> {
  const base = httpUrl(serverUrl);
  const response = await fetchWithTimeout(`${base}/api/rooms`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      name: name || undefined,
      creator_name: userName || undefined,
    }),
  });

  if (!response.ok) {
    throw new ServerApiError(
      `Failed to create room: ${response.statusText}`,
      response.status,
    );
  }

  return mapRoom(await parseJsonResponse<RawRoomInfo>(response));
}
