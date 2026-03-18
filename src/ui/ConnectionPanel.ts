import { SyncManager, ConnectionState } from "../sync/SyncManager";

export class ConnectionPanel {
  private overlay: HTMLElement;
  private panel: HTMLElement;
  private serverInput!: HTMLInputElement;
  private roomInput!: HTMLInputElement;
  private connectBtn!: HTMLButtonElement;
  private statusDot!: HTMLSpanElement;
  private statusText!: HTMLSpanElement;
  private syncManager: SyncManager;
  private unsubscribe: (() => void) | null = null;
  private visible = false;

  constructor(syncManager: SyncManager) {
    this.syncManager = syncManager;

    this.overlay = document.createElement("div");
    this.overlay.id = "connection-overlay";
    this.overlay.addEventListener("pointerdown", (e) => {
      if (e.target === this.overlay) this.hide();
    });

    this.panel = document.createElement("div");
    this.panel.id = "connection-panel";
    this.build();
    this.overlay.appendChild(this.panel);

    this.unsubscribe = this.syncManager.onConnectionStateChange((state) => {
      this.updateStatus(state);
    });
    this.updateStatus(this.syncManager.getConnectionState());
  }

  private build(): void {
    const title = document.createElement("div");
    title.className = "conn-title";
    title.textContent = "Connect to Server";
    this.panel.appendChild(title);

    // Server URL
    const serverLabel = document.createElement("label");
    serverLabel.className = "conn-label";
    serverLabel.textContent = "Server URL";
    this.panel.appendChild(serverLabel);

    this.serverInput = document.createElement("input");
    this.serverInput.type = "text";
    this.serverInput.className = "conn-input";
    this.serverInput.value = "ws://localhost:8080";
    this.serverInput.placeholder = "ws://localhost:8080";
    this.panel.appendChild(this.serverInput);

    // Room ID
    const roomLabel = document.createElement("label");
    roomLabel.className = "conn-label";
    roomLabel.textContent = "Room ID";
    this.panel.appendChild(roomLabel);

    const roomRow = document.createElement("div");
    roomRow.className = "conn-row";

    this.roomInput = document.createElement("input");
    this.roomInput.type = "text";
    this.roomInput.className = "conn-input conn-room-input";
    this.roomInput.placeholder = "Enter room ID";
    roomRow.appendChild(this.roomInput);

    const randomBtn = document.createElement("button");
    randomBtn.className = "conn-btn conn-btn-secondary";
    randomBtn.textContent = "Random";
    randomBtn.title = "Generate random room ID";
    randomBtn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.roomInput.value = this.generateRoomId();
    });
    roomRow.appendChild(randomBtn);
    this.panel.appendChild(roomRow);

    // Status row
    const statusRow = document.createElement("div");
    statusRow.className = "conn-status-row";

    this.statusDot = document.createElement("span");
    this.statusDot.className = "conn-status-dot";
    statusRow.appendChild(this.statusDot);

    this.statusText = document.createElement("span");
    this.statusText.className = "conn-status-text";
    this.statusText.textContent = "Offline";
    statusRow.appendChild(this.statusText);

    this.panel.appendChild(statusRow);

    // Connect button
    this.connectBtn = document.createElement("button");
    this.connectBtn.className = "conn-btn conn-btn-primary";
    this.connectBtn.textContent = "Connect";
    this.connectBtn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.handleConnectToggle();
    });
    this.panel.appendChild(this.connectBtn);
  }

  private handleConnectToggle(): void {
    const state = this.syncManager.getConnectionState();
    if (state === "disconnected") {
      const url = this.serverInput.value.trim();
      const room = this.roomInput.value.trim();
      if (!url || !room) return;
      this.syncManager.connect(url, room);
    } else {
      this.syncManager.disconnect();
    }
  }

  private updateStatus(state: ConnectionState): void {
    this.statusDot.dataset.state = state;
    switch (state) {
      case "connected":
        this.statusText.textContent = "Connected";
        this.connectBtn.textContent = "Disconnect";
        this.serverInput.disabled = true;
        this.roomInput.disabled = true;
        break;
      case "connecting":
        this.statusText.textContent = "Connecting...";
        this.connectBtn.textContent = "Cancel";
        this.serverInput.disabled = true;
        this.roomInput.disabled = true;
        break;
      case "disconnected":
        this.statusText.textContent = "Offline";
        this.connectBtn.textContent = "Connect";
        this.serverInput.disabled = false;
        this.roomInput.disabled = false;
        break;
    }
  }

  private generateRoomId(): string {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let id = "";
    for (let i = 0; i < 8; i++) {
      id += chars[Math.floor(Math.random() * chars.length)];
    }
    return id;
  }

  show(): void {
    if (this.visible) return;
    this.visible = true;
    document.body.appendChild(this.overlay);
  }

  hide(): void {
    if (!this.visible) return;
    this.visible = false;
    this.overlay.remove();
  }

  toggle(): void {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  isVisible(): boolean {
    return this.visible;
  }

  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.hide();
  }
}
