/**
 * Represents a user's identity in the application and collaboration sessions.
 *
 * Each user has a unique ID, a display name, and an assigned color used for
 * cursor rendering and stroke attribution during real-time collaboration.
 * Profiles are persisted to localStorage via {@link saveProfile} and loaded
 * with {@link loadProfile}.
 *
 * @see {@link loadProfile} to retrieve the current user's profile
 * @see {@link saveProfile} to persist profile changes
 * @see {@link onProfileChange} to subscribe to profile updates
 */
export interface UserProfile {
  /** Unique identifier for the user, generated as a UUID on first launch. */
  id: string;
  /** Display name shown to other collaborators (e.g. in remote cursors). */
  name: string;
  /** Hex color string (e.g. `"#e74c3c"`) used for the user's cursor and identity in collaboration. */
  color: string;
}
