/**
 * VisualNote — Workspace State
 * Central workspace state: zoom, pan, world↔screen coordinate transforms.
 */

// --- Workspace State ---
export const workspace = {
    notes: [],
    links: [],
    zoom: 1.0,
    offsetX: 0,
    offsetY: 0,
};

// --- Selection State ---
export const selection = {
    selectedNoteIds: [],
    linkSourceId: null,     // When linking: the first note selected
};

// --- Zoom Limits ---
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 3.0;

/**
 * Convert world coordinates to screen coordinates.
 */
export function worldToScreen(wx, wy) {
    return {
        x: (wx + workspace.offsetX) * workspace.zoom,
        y: (wy + workspace.offsetY) * workspace.zoom,
    };
}

/**
 * Convert screen coordinates to world coordinates.
 */
export function screenToWorld(sx, sy) {
    return {
        x: sx / workspace.zoom - workspace.offsetX,
        y: sy / workspace.zoom - workspace.offsetY,
    };
}

/**
 * Apply zoom centered at a screen position.
 * @param {number} delta - Positive = zoom in, negative = zoom out
 * @param {number} centerX - Screen X to zoom toward
 * @param {number} centerY - Screen Y to zoom toward
 */
export function applyZoom(delta, centerX, centerY) {
    const oldZoom = workspace.zoom;
    const factor = delta > 0 ? 1.08 : 0.92;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, oldZoom * factor));

    if (newZoom === oldZoom) return;

    // Adjust offset so the point under cursor stays fixed
    const worldX = centerX / oldZoom - workspace.offsetX;
    const worldY = centerY / oldZoom - workspace.offsetY;

    workspace.zoom = newZoom;
    workspace.offsetX = centerX / newZoom - worldX;
    workspace.offsetY = centerY / newZoom - worldY;
}

/**
 * Apply zoom by a ratio factor, centered at a screen position.
 * Used for two-hand pinch zoom: factor = currentDist / prevDist.
 * @param {number} factor - Zoom ratio (>1 = zoom in, <1 = zoom out)
 * @param {number} centerX - Screen X to zoom toward
 * @param {number} centerY - Screen Y to zoom toward
 */
export function applyZoomFactor(factor, centerX, centerY) {
    const oldZoom = workspace.zoom;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, oldZoom * factor));

    if (Math.abs(newZoom - oldZoom) < 0.001) return;

    const worldX = centerX / oldZoom - workspace.offsetX;
    const worldY = centerY / oldZoom - workspace.offsetY;

    workspace.zoom = newZoom;
    workspace.offsetX = centerX / newZoom - worldX;
    workspace.offsetY = centerY / newZoom - worldY;
}

/**
 * Apply pan (offset shift) in screen-space delta pixels.
 */
export function applyPan(dxScreen, dyScreen) {
    workspace.offsetX += dxScreen / workspace.zoom;
    workspace.offsetY += dyScreen / workspace.zoom;
}

/**
 * Reset zoom and offset to fit all notes on screen.
 */
export function zoomToFit(canvasWidth, canvasHeight) {
    const notes = workspace.notes;
    if (notes.length === 0) {
        workspace.zoom = 1;
        workspace.offsetX = 0;
        workspace.offsetY = 0;
        return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of notes) {
        minX = Math.min(minX, n.x);
        minY = Math.min(minY, n.y);
        maxX = Math.max(maxX, n.x + n.width);
        maxY = Math.max(maxY, n.y + n.height);
    }

    const worldWidth = maxX - minX + 200;   // padding
    const worldHeight = maxY - minY + 200;

    const zoomX = canvasWidth / worldWidth;
    const zoomY = canvasHeight / worldHeight;
    workspace.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.min(zoomX, zoomY)));

    workspace.offsetX = (canvasWidth / workspace.zoom - (minX + maxX)) / 2 + 100 / workspace.zoom;
    workspace.offsetY = (canvasHeight / workspace.zoom - (minY + maxY)) / 2 + 100 / workspace.zoom;
}

/**
 * Select a note. If addToSelection is false, clear others first.
 */
export function selectNote(noteId, addToSelection = false) {
    if (!addToSelection) {
        clearSelection();
    }
    if (!selection.selectedNoteIds.includes(noteId)) {
        selection.selectedNoteIds.push(noteId);
    }
    // Update note.selected flags
    for (const n of workspace.notes) {
        n.selected = selection.selectedNoteIds.includes(n.id);
    }
}

/**
 * Deselect a single note.
 */
export function deselectNote(noteId) {
    selection.selectedNoteIds = selection.selectedNoteIds.filter(id => id !== noteId);
    const note = workspace.notes.find(n => n.id === noteId);
    if (note) note.selected = false;
}

/**
 * Clear all selections.
 */
export function clearSelection() {
    selection.selectedNoteIds = [];
    for (const n of workspace.notes) {
        n.selected = false;
    }
}

/**
 * Get all selected notes.
 */
export function getSelectedNotes() {
    return workspace.notes.filter(n => n.selected);
}
