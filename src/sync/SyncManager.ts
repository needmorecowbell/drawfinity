import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";

export type ConnectionState = "disconnected" | "connecting" | "connected";

export class SyncManager {
  private provider: WebsocketProvider | null = null;
  private doc: Y.Doc;
  private listeners: Set<(state: ConnectionState) => void> = new Set();

  constructor(doc: Y.Doc) {
    this.doc = doc;
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
  }

  getConnectionState(): ConnectionState {
    if (!this.provider) return "disconnected";
    if (this.provider.wsconnected) return "connected";
    if (this.provider.wsconnecting) return "connecting";
    return "disconnected";
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

  destroy(): void {
    this.disconnect();
    this.listeners.clear();
  }
}
