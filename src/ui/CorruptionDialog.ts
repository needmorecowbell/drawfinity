/**
 * Modal dialog shown when a drawing's persisted state is detected as corrupt.
 * Offers the user a choice: start fresh or attempt recovery from backup.
 */

export type CorruptionChoice = "fresh" | "recover";

/**
 * Show a corruption recovery dialog and return the user's choice.
 * If no backup is available, the "Try to recover" button is hidden.
 */
export function showCorruptionDialog(hasBackup: boolean): Promise<CorruptionChoice> {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "corruption-dialog-overlay";

    const dialog = document.createElement("div");
    dialog.className = "corruption-dialog";

    dialog.innerHTML = `
      <h2 class="corruption-dialog__title">\u26A0 Drawing Data Corrupted</h2>
      <p class="corruption-dialog__message">
        The saved data for this drawing is corrupted and cannot be loaded.
        ${hasBackup
          ? "A backup of the previous version is available."
          : "No backup is available."}
      </p>
    `;

    const actions = document.createElement("div");
    actions.className = "corruption-dialog__actions";

    if (hasBackup) {
      const recoverBtn = document.createElement("button");
      recoverBtn.className = "corruption-dialog__btn corruption-dialog__btn--primary";
      recoverBtn.textContent = "Try to recover";
      recoverBtn.addEventListener("click", () => {
        overlay.remove();
        resolve("recover");
      });
      actions.appendChild(recoverBtn);
    }

    const freshBtn = document.createElement("button");
    freshBtn.className = `corruption-dialog__btn ${hasBackup ? "corruption-dialog__btn--secondary" : "corruption-dialog__btn--primary"}`;
    freshBtn.textContent = "Start fresh";
    freshBtn.addEventListener("click", () => {
      overlay.remove();
      resolve("fresh");
    });
    actions.appendChild(freshBtn);

    dialog.appendChild(actions);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
  });
}
