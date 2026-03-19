export interface CameraBookmark {
  id: string;
  label: string;
  x: number;
  y: number;
  zoom: number;
  createdBy: string;
  createdByName?: string;
  createdAt: number;
}

let bookmarkCounter = 0;

export function generateBookmarkId(): string {
  return `bookmark-${Date.now()}-${bookmarkCounter++}`;
}
