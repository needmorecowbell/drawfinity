/**
 * Persistent config file storage at ~/.config/drawfinity/.
 * Used in Tauri mode to store user profile and preferences outside the
 * WebKitGTK cache directory (which gets cleared by clean:cache).
 *
 * Falls back silently in browser mode — callers should use localStorage
 * as the primary fallback.
 */

let tauriAvailable: boolean | null = null;

function isTauri(): boolean {
  if (tauriAvailable === null) {
    tauriAvailable = !!(globalThis as Record<string, unknown>).__TAURI_INTERNALS__;
  }
  return tauriAvailable;
}

async function getConfigDir(): Promise<string> {
  const { configDir, join } = await import("@tauri-apps/api/path");
  const base = await configDir();
  return join(base, "drawfinity");
}

async function ensureConfigDir(): Promise<string> {
  const { mkdir, exists } = await import("@tauri-apps/plugin-fs");
  const dir = await getConfigDir();
  if (!(await exists(dir))) {
    await mkdir(dir, { recursive: true });
  }
  return dir;
}

export async function readConfigFile(filename: string): Promise<string | null> {
  if (!isTauri()) return null;
  try {
    const { readTextFile, exists } = await import("@tauri-apps/plugin-fs");
    const { join } = await import("@tauri-apps/api/path");
    const dir = await getConfigDir();
    const path = await join(dir, filename);
    if (!(await exists(path))) return null;
    return await readTextFile(path);
  } catch {
    return null;
  }
}

export async function writeConfigFile(filename: string, content: string): Promise<void> {
  if (!isTauri()) return;
  try {
    const { writeTextFile } = await import("@tauri-apps/plugin-fs");
    const { join } = await import("@tauri-apps/api/path");
    const dir = await ensureConfigDir();
    const path = await join(dir, filename);
    await writeTextFile(path, content);
  } catch {
    // Silently fail — localStorage is the fallback
  }
}
