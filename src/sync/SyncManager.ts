import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";
import type { UserProfile } from "../user";

export type ConnectionState = "disconnected" | "connecting" | "connected";

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

  constructor(doc: Y.Doc) {
    this.doc = doc;
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
      this.disconnect();
    }

    this.notifyListeners("connecting");

    this.provider = new WebsocketProvider(serverUrl, roomId, this.doc, {
      connect: true,
      disableBc: true, // Disable BroadcastChannel — we only want server sync
    });

    if (this.userProfile) {
      this.provider.awareness.setLocalStateField("user", {
        id: this.userProfile.id,
        name: this.userProfile.name,
        color: this.userProfile.color,
        cursor: null,
      });
    }

    this.provider.awareness.on("change", () => {
      this.notifyRemoteUserListeners();
    });

    this.provider.on("status", ({ status }: { status: string }) => {
      if (status === "connected") {
        this.notifyListeners("connected");
      } else if (status === "disconnected") {
        this.notifyListeners("disconnected");
      } else {
        this.notifyListeners("connecting");
      }
    });
  }

  disconnect(): void {
    if (this.provider) {
      this.provider.disconnect();
      this.provider.destroy();
      this.provider = null;
    }
    this.notifyListeners("disconnected");
    this.notifyRemoteUserListeners();
  }

  getConnectionState(): ConnectionState {
    if (!this.provider) return "disconnected";
    if (this.provider.wsconnected) return "connected";
    if (this.provider.wsconnecting) return "connecting";
    return "disconnected";
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

  onConnectionStateChange(callback: (state: ConnectionState) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners(state: ConnectionState): void {
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
    this.disconnect();
    this.listeners.clear();
    this.remoteUserListeners.clear();
  }
}
