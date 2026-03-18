import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";
import type { UserProfile } from "../user";

export type ConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "failed";

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

export interface RemoteUser {
  id: string;
  name: string;
  color: string;
  cursor: { x: number; y: number } | null;
}

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

  constructor(doc: Y.Doc, reconnectConfig?: Partial<ReconnectConfig>) {
    this.doc = doc;
    this.reconnectConfig = { ...DEFAULT_RECONNECT_CONFIG, ...reconnectConfig };
  }

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
    this.provider = new WebsocketProvider(serverUrl, roomId, this.doc, {
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

  getConnectionState(): ConnectionState {
    return this.currentState;
  }

  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  onStatusChange(callback: (state: ConnectionState) => void): () => void {
    return this.onConnectionStateChange(callback);
  }

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

  onRemoteUsersChange(callback: (users: RemoteUser[]) => void): () => void {
    this.remoteUserListeners.add(callback);
    return () => {
      this.remoteUserListeners.delete(callback);
    };
  }

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

  destroy(): void {
    this.intentionalDisconnect = true;
    this.clearReconnectTimer();
    this.disconnectInternal();
    this.listeners.clear();
    this.remoteUserListeners.clear();
  }
}
