import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";
import type { UserProfile } from "../user";

/**
 * Possible states of a WebSocket collaboration connection.
 *
 * State transitions follow this lifecycle:
 * - `disconnected` → `connecting` → `connected`
 * - `connected` → `reconnecting` → `connected` (on transient failure)
 * - `reconnecting` → `failed` (after max attempts exhausted)
 * - Any state → `disconnected` (on intentional disconnect)
 */
export type ConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "failed";

/**
 * Configuration for automatic reconnection after connection loss.
 *
 * Reconnection uses exponential backoff: each attempt waits
 * `initialDelayMs * 2^attempt` milliseconds, capped at `maxDelayMs`.
 *
 * @property enabled - Whether automatic reconnection is active.
 * @property initialDelayMs - Base delay before the first reconnection attempt (milliseconds).
 * @property maxDelayMs - Upper bound on the backoff delay (milliseconds).
 * @property maxAttempts - Maximum number of reconnection attempts before transitioning to `"failed"`.
 */
export interface ReconnectConfig {
  enabled: boolean;
  initialDelayMs: number;
  maxDelayMs: number;
  maxAttempts: number;
}

const DEFAULT_RECONNECT_CONFIG: ReconnectConfig = {
  enabled: true,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  maxAttempts: 10,
};

/**
 * A collaborator visible through the Yjs awareness protocol.
 *
 * @property id - Unique identifier for the remote user.
 * @property name - Display name shown next to the remote cursor.
 * @property color - CSS color string used for the cursor and presence indicator.
 * @property cursor - Current cursor position in world coordinates, or `null` if the cursor is off-canvas.
 */
export interface RemoteUser {
  id: string;
  name: string;
  color: string;
  cursor: { x: number; y: number } | null;
}

/**
 * WebSocket collaboration engine with automatic reconnection and cursor sync.
 *
 * SyncManager wraps `y-websocket`'s {@link WebsocketProvider} to connect a local
 * Yjs document to a remote collaboration server. It adds managed reconnection with
 * exponential backoff, a state machine for connection lifecycle, and awareness-based
 * remote cursor tracking.
 *
 * Only one connection is active at a time — calling {@link connect} while already
 * connected will cleanly tear down the previous provider before establishing a new one.
 * Use {@link disconnect} for intentional disconnection (suppresses reconnection) and
 * {@link destroy} for full cleanup when the SyncManager is no longer needed.
 *
 * @example
 * ```ts
 * const doc = new Y.Doc();
 * const sync = new SyncManager(doc, { maxAttempts: 5 });
 *
 * sync.onConnectionStateChange((state) => {
 *   console.log("Connection:", state);
 * });
 *
 * sync.setUser({ id: "user-1", name: "Alice", color: "#e06c75" });
 * sync.connect("ws://localhost:8080", "room-abc");
 *
 * // Update cursor position as the user moves the pointer:
 * sync.updateCursorPosition(worldX, worldY);
 *
 * // When leaving the session:
 * sync.destroy();
 * ```
 */
export class SyncManager {
  private provider: WebsocketProvider | null = null;
  private doc: Y.Doc;
  private listeners: Set<(state: ConnectionState) => void> = new Set();
  private userProfile: UserProfile | null = null;
  private remoteUserListeners: Set<(users: RemoteUser[]) => void> = new Set();
  private reconnectConfig: ReconnectConfig;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private lastServerUrl: string | null = null;
  private lastRoomId: string | null = null;
  private wasConnected = false;
  private intentionalDisconnect = false;
  private currentState: ConnectionState = "disconnected";

  /**
   * Creates a new SyncManager bound to the given Yjs document.
   *
   * @param doc - The Yjs document whose updates will be synced over WebSocket.
   * @param reconnectConfig - Optional overrides for reconnection behavior.
   *   Unspecified fields default to: `{ enabled: true, initialDelayMs: 1000, maxDelayMs: 30000, maxAttempts: 10 }`.
   */
  constructor(doc: Y.Doc, reconnectConfig?: Partial<ReconnectConfig>) {
    this.doc = doc;
    this.reconnectConfig = { ...DEFAULT_RECONNECT_CONFIG, ...reconnectConfig };
  }

  /**
   * Sets the local user profile for awareness (cursor and presence).
   *
   * If a provider is already connected, the awareness state is updated immediately.
   * Otherwise the profile is stored and applied when {@link connect} is called.
   *
   * @param profile - The user's identity, including id, name, and cursor color.
   */
  setUser(profile: UserProfile): void {
    this.userProfile = profile;
    if (this.provider) {
      this.provider.awareness.setLocalStateField("user", {
        id: profile.id,
        name: profile.name,
        color: profile.color,
        cursor: null,
      });
    }
  }

  /**
   * Connects to a collaboration server and joins a room.
   *
   * If already connected, the existing provider is torn down first. The server URL
   * is automatically suffixed with `/ws` if not already present, to match the
   * collaboration server's endpoint format.
   *
   * Reconnection state is reset on each new call — previous attempts are discarded.
   *
   * @param serverUrl - WebSocket server base URL (e.g. `"ws://localhost:8080"`).
   * @param roomId - Unique room identifier to join.
   */
  connect(serverUrl: string, roomId: string): void {
    if (this.provider) {
      this.intentionalDisconnect = true;
      this.disconnectInternal();
    }

    this.lastServerUrl = serverUrl;
    this.lastRoomId = roomId;
    this.reconnectAttempts = 0;
    this.wasConnected = false;
    this.intentionalDisconnect = false;
    this.clearReconnectTimer();

    this.createProvider(serverUrl, roomId);
    this.notifyListeners("connecting");
  }

  private createProvider(serverUrl: string, roomId: string): void {
    // y-websocket constructs URL as serverUrl + '/' + roomId.
    // Our server expects /ws/:room_id, so append /ws to the base URL if not present.
    const trimmed = serverUrl.replace(/\/+$/, "");
    const wsUrl = trimmed.endsWith("/ws") ? trimmed : trimmed + "/ws";
    this.provider = new WebsocketProvider(wsUrl, roomId, this.doc, {
      connect: true,
      disableBc: true,
      maxBackoffTime: 0, // Disable y-websocket's built-in reconnect; we handle it ourselves
    });

    this.setAwarenessState();

    this.provider.awareness.on("change", () => {
      this.notifyRemoteUserListeners();
    });

    this.provider.on("status", ({ status }: { status: string }) => {
      if (status === "connected") {
        this.wasConnected = true;
        this.reconnectAttempts = 0;
        this.notifyListeners("connected");
      } else if (status === "disconnected") {
        this.handleDisconnect();
      } else {
        this.notifyListeners("connecting");
      }
    });
  }

  private setAwarenessState(): void {
    if (this.provider && this.userProfile) {
      this.provider.awareness.setLocalStateField("user", {
        id: this.userProfile.id,
        name: this.userProfile.name,
        color: this.userProfile.color,
        cursor: null,
      });
    }
  }

  private handleDisconnect(): void {
    if (this.intentionalDisconnect) {
      this.notifyListeners("disconnected");
      return;
    }

    if (
      !this.reconnectConfig.enabled ||
      !this.wasConnected ||
      !this.lastServerUrl ||
      !this.lastRoomId
    ) {
      this.notifyListeners("disconnected");
      return;
    }

    if (this.reconnectAttempts >= this.reconnectConfig.maxAttempts) {
      this.notifyListeners("failed");
      return;
    }

    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    const delay = Math.min(
      this.reconnectConfig.initialDelayMs *
        Math.pow(2, this.reconnectAttempts),
      this.reconnectConfig.maxDelayMs,
    );

    this.reconnectAttempts++;
    this.notifyListeners("reconnecting");

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.attemptReconnect();
    }, delay);
  }

  private attemptReconnect(): void {
    if (!this.lastServerUrl || !this.lastRoomId) return;

    if (this.provider) {
      this.provider.disconnect();
      this.provider.destroy();
      this.provider = null;
    }

    this.createProvider(this.lastServerUrl, this.lastRoomId);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Intentionally disconnects from the collaboration server.
   *
   * Suppresses automatic reconnection. The connection state transitions to `"disconnected"`.
   * To reconnect, call {@link connect} again with new or existing server/room parameters.
   */
  disconnect(): void {
    this.intentionalDisconnect = true;
    this.clearReconnectTimer();
    this.disconnectInternal();
  }

  private disconnectInternal(): void {
    if (this.provider) {
      this.provider.disconnect();
      this.provider.destroy();
      this.provider = null;
    }
    this.notifyListeners("disconnected");
    this.notifyRemoteUserListeners();
  }

  /**
   * Returns the current connection state.
   *
   * @returns The current {@link ConnectionState} value.
   */
  getConnectionState(): ConnectionState {
    return this.currentState;
  }

  /**
   * Returns the number of reconnection attempts made since the last successful connection.
   *
   * Resets to `0` on a successful connection or a fresh {@link connect} call.
   *
   * @returns The current reconnection attempt count.
   */
  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  /**
   * Registers a callback for connection state changes.
   *
   * Alias for {@link onConnectionStateChange}. Provided for backward compatibility.
   *
   * @param callback - Invoked with the new {@link ConnectionState} on each transition.
   * @returns An unsubscribe function that removes the callback.
   */
  onStatusChange(callback: (state: ConnectionState) => void): () => void {
    return this.onConnectionStateChange(callback);
  }

  /**
   * Broadcasts the local user's cursor position to all remote collaborators.
   *
   * Updates the Yjs awareness state with the given world-space coordinates.
   * Has no effect if no provider is connected.
   *
   * @param worldX - Cursor X position in world (canvas) coordinates.
   * @param worldY - Cursor Y position in world (canvas) coordinates.
   */
  updateCursorPosition(worldX: number, worldY: number): void {
    if (this.provider) {
      this.provider.awareness.setLocalStateField("user", {
        ...(this.userProfile
          ? {
              id: this.userProfile.id,
              name: this.userProfile.name,
              color: this.userProfile.color,
            }
          : {}),
        cursor: { x: worldX, y: worldY },
      });
    }
  }

  /**
   * Returns a snapshot of all currently connected remote users.
   *
   * Excludes the local user. Each entry includes the user's identity and
   * their latest cursor position (or `null` if off-canvas).
   *
   * @returns An array of {@link RemoteUser} objects. Empty if not connected.
   */
  getRemoteUsers(): RemoteUser[] {
    if (!this.provider) return [];

    const states = this.provider.awareness.getStates();
    const clientId = this.provider.awareness.clientID;
    const users: RemoteUser[] = [];

    states.forEach((state, id) => {
      if (id === clientId) return;
      const user = state.user;
      if (user && user.id && user.name && user.color) {
        users.push({
          id: user.id,
          name: user.name,
          color: user.color,
          cursor: user.cursor || null,
        });
      }
    });

    return users;
  }

  /**
   * Registers a callback invoked whenever the set of remote users changes.
   *
   * Fires when a user joins, leaves, or updates their cursor position.
   *
   * @param callback - Receives the full list of currently connected {@link RemoteUser}s.
   * @returns An unsubscribe function that removes the callback.
   */
  onRemoteUsersChange(callback: (users: RemoteUser[]) => void): () => void {
    this.remoteUserListeners.add(callback);
    return () => {
      this.remoteUserListeners.delete(callback);
    };
  }

  /**
   * Registers a callback for connection state changes.
   *
   * @param callback - Invoked with the new {@link ConnectionState} on each transition.
   * @returns An unsubscribe function that removes the callback.
   */
  onConnectionStateChange(
    callback: (state: ConnectionState) => void,
  ): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners(state: ConnectionState): void {
    this.currentState = state;
    for (const listener of this.listeners) {
      listener(state);
    }
  }

  private notifyRemoteUserListeners(): void {
    const users = this.getRemoteUsers();
    for (const listener of this.remoteUserListeners) {
      listener(users);
    }
  }

  /**
   * Permanently tears down the SyncManager.
   *
   * Disconnects from the server (suppressing reconnection), clears all pending
   * timers, and removes all registered listeners. The instance should not be
   * reused after calling this method.
   */
  destroy(): void {
    this.intentionalDisconnect = true;
    this.clearReconnectTimer();
    this.disconnectInternal();
    this.listeners.clear();
    this.remoteUserListeners.clear();
  }
}
