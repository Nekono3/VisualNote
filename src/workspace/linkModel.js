/**
 * VisualNote — Link Model
 * CRUD operations for links connecting notes.
 * Links never store positions — they are always computed from note centers.
 */

import { workspace } from './workspaceState.js';

let linkCounter = 0;

/**
 * Create a link between two notes.
 * Prevents duplicate links and self-links.
 * @param {string} fromId - Source note ID
 * @param {string} toId - Target note ID
 * @returns {object|null} The created link or null if invalid
 */
export function createLink(fromId, toId) {
    // No self-links
    if (fromId === toId) return null;

    // No duplicates (in either direction)
    const exists = workspace.links.some(
        l => (l.from === fromId && l.to === toId) ||
            (l.from === toId && l.to === fromId)
    );
    if (exists) return null;

    const link = {
        id: `link_${++linkCounter}`,
        from: fromId,
        to: toId,
    };
    workspace.links.push(link);
    return link;
}

/**
 * Delete a link by ID.
 */
export function deleteLink(id) {
    workspace.links = workspace.links.filter(l => l.id !== id);
}

/**
 * Delete all links connected to a specific note.
 * Used for cascading delete when a note is removed.
 */
export function deleteLinksForNote(noteId) {
    workspace.links = workspace.links.filter(
        l => l.from !== noteId && l.to !== noteId
    );
}

/**
 * Get all links connected to a specific note.
 */
export function getLinksForNote(noteId) {
    return workspace.links.filter(
        l => l.from === noteId || l.to === noteId
    );
}

/**
 * Hit test a link line. Checks if a world point is near any link line.
 * @param {number} worldX
 * @param {number} worldY
 * @param {Function} getCenter - Function to get note center by note object
 * @param {number} tolerance - Distance threshold in world units
 * @returns {object|null} The link under cursor or null
 */
export function hitTestLink(worldX, worldY, getNoteById, getCenter, tolerance = 15) {
    for (let i = workspace.links.length - 1; i >= 0; i--) {
        const link = workspace.links[i];
        const fromNote = getNoteById(link.from);
        const toNote = getNoteById(link.to);
        if (!fromNote || !toNote) continue;

        const from = getCenter(fromNote);
        const to = getCenter(toNote);

        // Point-to-line-segment distance
        const dist = pointToSegmentDist(worldX, worldY, from.x, from.y, to.x, to.y);
        if (dist < tolerance) {
            return link;
        }
    }
    return null;
}

/**
 * Calculate distance from a point to a line segment.
 */
function pointToSegmentDist(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);

    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));

    const projX = x1 + t * dx;
    const projY = y1 + t * dy;
    return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
}
