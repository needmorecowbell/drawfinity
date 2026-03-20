/** Inline SVG icons for toolbar buttons.
 *
 * Each icon is an 18×18 rendered SVG with a 24×24 viewBox, line-art style.
 * Uses `stroke="currentColor"` so icons inherit the button's text color
 * for active/disabled states automatically.
 */

const SVG_ATTRS = 'width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

function svg(content: string): string {
  return `<svg ${SVG_ATTRS}>${content}</svg>`;
}

export const ICONS = {
  /** Angled pen nib */
  brush: svg('<path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="13" r="2"/>'),

  /** Rectangular eraser block */
  eraser: svg('<path d="M20 20H7L3 16l10-10 8 8-4 4"/><path d="M6.5 17.5l4-4"/>'),

  /** Rectangle shape */
  rectangle: svg('<rect x="3" y="3" width="18" height="18" rx="2"/>'),

  /** Ellipse shape */
  ellipse: svg('<ellipse cx="12" cy="12" rx="10" ry="7"/>'),

  /** Pentagon / polygon shape */
  polygon: svg('<path d="M12 2l9.5 7-3.5 10h-12L2.5 9z"/>'),

  /** Five-pointed star */
  star: svg('<path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.27 5.82 21 7 14.14l-5-4.87 6.91-1.01z"/>'),

  /** Open hand for pan/grab */
  pan: svg('<path d="M18 11V6a2 2 0 0 0-4 0"/><path d="M14 10V4a2 2 0 0 0-4 0v6"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 11a2 2 0 0 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34L3.35 16.5a2 2 0 0 1 3.3-2.26L8 16"/>'),

  /** Magnifying glass */
  magnify: svg('<circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>'),

  /** Dot grid pattern */
  gridDots: svg('<circle cx="5" cy="5" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="5" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="5" r="1" fill="currentColor" stroke="none"/><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="5" cy="19" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="19" r="1" fill="currentColor" stroke="none"/>'),

  /** Line grid pattern */
  gridLines: svg('<path d="M3 12h18M12 3v18M3 7h18M3 17h18M7 3v18M17 3v18" stroke-width="1"/>'),

  /** Grid with slash for no grid */
  gridNone: svg('<circle cx="5" cy="5" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="5" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="5" r="1" fill="currentColor" stroke="none"/><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="5" cy="19" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="19" r="1" fill="currentColor" stroke="none"/><line x1="4" y1="4" x2="20" y2="20" stroke-width="2"/>'),

  /** Plus in circle for zoom in */
  zoomIn: svg('<circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/><path d="M11 8v6"/><path d="M8 11h6"/>'),

  /** Minus in circle for zoom out */
  zoomOut: svg('<circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/><path d="M8 11h6"/>'),

  /** Expand arrows for fit-all */
  fitAll: svg('<path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/>'),

  /** Curved arrow left for undo */
  undo: svg('<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9H3"/>'),

  /** Curved arrow right for redo */
  redo: svg('<path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9h9"/>'),

  /** Download arrow for export */
  export: svg('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>'),

  /** House icon for home */
  home: svg('<path d="M3 12l9-9 9 9"/><path d="M5 10v10a1 1 0 0 0 1 1h3v-6h6v6h3a1 1 0 0 0 1-1V10"/>'),

  /** Circle with question mark for help */
  help: svg('<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><circle cx="12" cy="17" r="0.5" fill="currentColor" stroke="none"/>'),

  /** Gear icon for settings */
  settings: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1.08 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 0 1 0 4h-.09c-.658.003-1.25.396-1.51 1z"/>'),

  /** Half-filled square for fill toggle */
  fillToggle: svg('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 3h18v18" fill="currentColor" opacity="0.3"/>'),

  /** Droplet for opacity */
  opacity: svg('<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>'),

  /** Circle with diameter line for brush size */
  brushSize: svg('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4" fill="currentColor" opacity="0.3"/>'),
  /** Pen preset — fine-tip pen nib */
  pen: svg('<path d="M17 3l4 4L7.5 20.5 2 22l1.5-5.5z"/><path d="M15 5l4 4"/>'),

  /** Pencil preset — classic pencil */
  pencil: svg('<path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>'),

  /** Marker preset — broad marker tip */
  marker: svg('<path d="M9 11l-6 6v3h3l6-6"/><path d="M19.071 4.929a3 3 0 0 0-4.242 0L9 10.758 13.242 15l5.829-5.829a3 3 0 0 0 0-4.242z" fill="currentColor" opacity="0.2"/>'),

  /** Highlighter preset — angled broad tip */
  highlighter: svg('<path d="M18 2l4 4-9.5 9.5-4-4z" fill="currentColor" opacity="0.25"/><path d="M12.5 15.5L8.5 11.5 2 22l10.5-6.5z"/>'),

  /** Turtle — stylized turtle for turtle graphics mode */
  turtle: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="13" rx="8" ry="6"/><ellipse cx="12" cy="13" rx="4.5" ry="3" fill="currentColor" opacity="0.15"/><circle cx="20" cy="11" r="2.2"/><circle cx="7" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/><circle cx="5.5" cy="9" r="1.5"/><circle cx="18.5" cy="9" r="1.5"/></svg>`,

  /** Bookmark / flag icon */
  bookmark: svg('<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>'),

  /** Small pencil for inline edit */
  pencilSmall: svg('<path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>'),

  /** Small trash can for delete */
  trashSmall: svg('<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>'),

  /** Turtle — stylized turtle for turtle graphics mode */
  turtle: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="13" rx="8" ry="6"/><ellipse cx="12" cy="13" rx="4.5" ry="3" fill="currentColor" opacity="0.15"/><circle cx="20" cy="11" r="2.2"/><circle cx="7" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/><circle cx="5.5" cy="9" r="1.5"/><circle cx="18.5" cy="9" r="1.5"/></svg>`,
} as const;
