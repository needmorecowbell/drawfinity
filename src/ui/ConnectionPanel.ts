import { SyncManager, ConnectionState, RemoteUser } from "../sync/SyncManager";

/**
 * Callbacks for responding to ConnectionPanel user actions.
 *
 * @property onLeaveSession - Called when the user clicks "Leave Session",
 *   after the WebSocket connection has been disconnected and the panel hidden.
 *   Use this to perform post-disconnect cleanup such as returning to the home screen.
 */
export interface ConnectionPanelCallbacks {
  onLeaveSession?: () => void;
}

/**
 * Modal UI panel for managing WebSocket collaboration connections.
 *
 * Provides a two-state interface: a connection form (server URL + room ID inputs)
 * when disconnected, and a session info view (room name, participant list, leave button)
 * when connected. The panel renders as a centered overlay and can be toggled with `Ctrl+K`.
 *
 * Subscribes to {@link SyncManager} connection state and remote user changes to keep
 * the UI in sync. All subscriptions are cleaned up on {@link destroy}.
 *
 * @param syncManager - The SyncManager instance used to connect/disconnect and
 *   observe connection state and remote participants
 * @param callbacks - Optional callbacks for panel events (e.g. leaving a session)
 *
 * @example
 * ```ts
 * const panel = new ConnectionPanel(syncManager, {
 *   onLeaveSession: () => app.returnToHomeScreen(),
 * });
 * panel.show(); // opens the overlay
 * ```
 */
export class ConnectionPanel {
  private overlay: HTMLElement;
  private panel: HTMLElement;
  private serverInput!: HTMLInputElement;
  private roomInput!: HTMLInputElement;
  private connectBtn!: HTMLButtonElement;
  private statusDot!: HTMLSpanElement;
  private statusText!: HTMLSpanElement;
  private syncManager: SyncManager;
  private callbacks: ConnectionPanelCallbacks;
  private unsubscribe: (() => void) | null = null;
  private unsubscribeUsers: (() => void) | null = null;
  private visible = false;

  // Connected-state UI sections
  private connectForm!: HTMLElement;
  private connectedInfo!: HTMLElement;
  private roomNameEl!: HTMLElement;
  private roomIdEl!: HTMLElement;
  private participantCountEl!: HTMLElement;
  private userListEl!: HTMLElement;
  private copyRoomIdBtn!: HTMLButtonElement;
  private leaveBtn!: HTMLButtonElement;

  private currentRoomId: string | null = null;
  private currentRoomName: string | null = null;

  constructor(syncManager: SyncManager, callbacks?: ConnectionPanelCallbacks) {
    this.syncManager = syncManager;
    this.callbacks = callbacks ?? {};

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
    this.unsubscribeUsers = this.syncManager.onRemoteUsersChange((users) => {
      this.updateUserList(users);
    });
    this.updateStatus(this.syncManager.getConnectionState());
  }

  private build(): void {
    const title = document.createElement("div");
    title.className = "conn-title";
    title.textContent = "Connect to Server";
    this.panel.appendChild(title);

    // --- Connect form (shown when disconnected) ---
    this.connectForm = document.createElement("div");
    this.connectForm.className = "conn-connect-form";

    // Server URL
    const serverLabel = document.createElement("label");
    serverLabel.className = "conn-label";
    serverLabel.textContent = "Server URL";
    this.connectForm.appendChild(serverLabel);

    this.serverInput = document.createElement("input");
    this.serverInput.type = "text";
    this.serverInput.className = "conn-input";
    this.serverInput.value = "ws://localhost:8080";
    this.serverInput.placeholder = "ws://localhost:8080";
    this.connectForm.appendChild(this.serverInput);

    // Room ID
    const roomLabel = document.createElement("label");
    roomLabel.className = "conn-label";
    roomLabel.textContent = "Room ID";
    this.connectForm.appendChild(roomLabel);

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
    this.connectForm.appendChild(roomRow);

    this.panel.appendChild(this.connectForm);

    // --- Connected info (shown when connected) ---
    this.connectedInfo = document.createElement("div");
    this.connectedInfo.className = "conn-connected-info";
    this.connectedInfo.style.display = "none";

    // Room name
    this.roomNameEl = document.createElement("div");
    this.roomNameEl.className = "conn-room-name";
    this.connectedInfo.appendChild(this.roomNameEl);

    // Room ID row with copy button
    const roomIdRow = document.createElement("div");
    roomIdRow.className = "conn-room-id-row";

    this.roomIdEl = document.createElement("span");
    this.roomIdEl.className = "conn-room-id";
    roomIdRow.appendChild(this.roomIdEl);

    this.copyRoomIdBtn = document.createElement("button");
    this.copyRoomIdBtn.className = "conn-btn conn-btn-secondary conn-btn-small";
    this.copyRoomIdBtn.textContent = "Copy Room ID";
    this.copyRoomIdBtn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.copyRoomId();
    });
    roomIdRow.appendChild(this.copyRoomIdBtn);
    this.connectedInfo.appendChild(roomIdRow);

    // Participant count
    this.participantCountEl = document.createElement("div");
    this.participantCountEl.className = "conn-participant-count";
    this.connectedInfo.appendChild(this.participantCountEl);

    // User list
    const userListLabel = document.createElement("div");
    userListLabel.className = "conn-label";
    userListLabel.textContent = "Participants";
    this.connectedInfo.appendChild(userListLabel);

    this.userListEl = document.createElement("div");
    this.userListEl.className = "conn-user-list";
    this.connectedInfo.appendChild(this.userListEl);

    this.panel.appendChild(this.connectedInfo);

    // --- Status row (always visible) ---
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

    // --- Connect button (shown when disconnected/connecting) ---
    this.connectBtn = document.createElement("button");
    this.connectBtn.className = "conn-btn conn-btn-primary";
    this.connectBtn.textContent = "Connect";
    this.connectBtn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.handleConnectToggle();
    });
    this.panel.appendChild(this.connectBtn);

    // --- Leave Session button (shown when connected) ---
    this.leaveBtn = document.createElement("button");
    this.leaveBtn.className = "conn-btn conn-btn-danger";
    this.leaveBtn.textContent = "Leave Session";
    this.leaveBtn.style.display = "none";
    this.leaveBtn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.handleLeaveSession();
    });
    this.panel.appendChild(this.leaveBtn);
  }

  private handleConnectToggle(): void {
    const state = this.syncManager.getConnectionState();
    if (state === "disconnected") {
      const url = this.serverInput.value.trim();
      const room = this.roomInput.value.trim();
      if (!url || !room) return;
      this.currentRoomId = room;
      this.currentRoomName = room;
      this.syncManager.connect(url, room);
    } else {
      this.syncManager.disconnect();
    }
  }

  private handleLeaveSession(): void {
    this.syncManager.disconnect();
    this.hide();
    this.callbacks.onLeaveSession?.();
  }

  /**
   * Updates the displayed room identification in the connected-state view.
   *
   * @param roomId - The unique room identifier
   * @param roomName - Human-readable room name; defaults to `roomId` if omitted
   */
  setRoomInfo(roomId: string, roomName?: string): void {
    this.currentRoomId = roomId;
    this.currentRoomName = roomName ?? roomId;
    this.roomNameEl.textContent = this.currentRoomName;
    this.roomIdEl.textContent = `Room: ${roomId}`;
  }

  private copyRoomId(): void {
    if (this.currentRoomId) {
      navigator.clipboard.writeText(this.currentRoomId).catch(() => {
        // Fallback: select text for manual copy
      });
      this.copyRoomIdBtn.textContent = "Copied!";
      setTimeout(() => {
        this.copyRoomIdBtn.textContent = "Copy Room ID";
      }, 1500);
    }
  }

  private updateUserList(users: RemoteUser[]): void {
    this.userListEl.innerHTML = "";
    const totalCount = users.length + 1; // +1 for local user
    this.participantCountEl.textContent = `${totalCount} participant${totalCount !== 1 ? "s" : ""}`;

    if (users.length === 0) {
      const empty = document.createElement("div");
      empty.className = "conn-user-list-empty";
      empty.textContent = "No other participants";
      this.userListEl.appendChild(empty);
      return;
    }

    for (const user of users) {
      const item = document.createElement("div");
      item.className = "conn-user-item";

      const dot = document.createElement("span");
      dot.className = "conn-user-color";
      dot.style.backgroundColor = user.color;
      item.appendChild(dot);

      const name = document.createElement("span");
      name.className = "conn-user-name";
      name.textContent = user.name;
      item.appendChild(name);

      this.userListEl.appendChild(item);
    }
  }

  private updateStatus(state: ConnectionState): void {
    this.statusDot.dataset.state = state;
    switch (state) {
      case "connected":
        this.statusText.textContent = "Connected";
        this.connectBtn.style.display = "none";
        this.leaveBtn.style.display = "";
        this.connectForm.style.display = "none";
        this.connectedInfo.style.display = "";
        // Set room info from inputs if not already set
        if (this.currentRoomId) {
          this.roomNameEl.textContent = this.currentRoomName ?? this.currentRoomId;
          this.roomIdEl.textContent = `Room: ${this.currentRoomId}`;
        }
        this.updateUserList(this.syncManager.getRemoteUsers());
        break;
      case "connecting":
        this.statusText.textContent = "Connecting...";
        this.connectBtn.textContent = "Cancel";
        this.connectBtn.style.display = "";
        this.leaveBtn.style.display = "none";
        this.connectForm.style.display = "";
        this.connectedInfo.style.display = "none";
        this.serverInput.disabled = true;
        this.roomInput.disabled = true;
        break;
      case "reconnecting":
        this.statusText.textContent = "Reconnecting...";
        this.connectBtn.style.display = "none";
        this.leaveBtn.style.display = "";
        this.connectForm.style.display = "none";
        this.connectedInfo.style.display = "";
        break;
      case "failed":
        this.statusText.textContent = "Connection failed";
        this.connectBtn.textContent = "Reconnect";
        this.connectBtn.style.display = "";
        this.leaveBtn.style.display = "";
        this.connectForm.style.display = "none";
        this.connectedInfo.style.display = "";
        break;
      case "disconnected":
        this.statusText.textContent = "Offline";
        this.connectBtn.textContent = "Connect";
        this.connectBtn.style.display = "";
        this.leaveBtn.style.display = "none";
        this.connectForm.style.display = "";
        this.connectedInfo.style.display = "none";
        this.serverInput.disabled = false;
        this.roomInput.disabled = false;
        this.currentRoomId = null;
        this.currentRoomName = null;
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

  /**
   * Shows the connection panel overlay. No-op if already visible.
   * Appends the overlay element to `document.body`.
   */
  show(): void {
    if (this.visible) return;
    this.visible = true;
    document.body.appendChild(this.overlay);
  }

  /**
   * Hides the connection panel overlay. No-op if already hidden.
   * Removes the overlay element from the DOM.
   */
  hide(): void {
    if (!this.visible) return;
    this.visible = false;
    this.overlay.remove();
  }

  /** Toggles the panel visibility — shows if hidden, hides if visible. */
  toggle(): void {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /** Returns `true` if the panel overlay is currently displayed. */
  isVisible(): boolean {
    return this.visible;
  }

  /**
   * Tears down the panel by unsubscribing from SyncManager events and
   * removing the overlay from the DOM. Call this when the panel is no longer needed.
   */
  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    if (this.unsubscribeUsers) {
      this.unsubscribeUsers();
      this.unsubscribeUsers = null;
    }
    this.hide();
  }
}
