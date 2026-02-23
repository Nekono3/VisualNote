/**
 * VisualNote — Note Model
 * CRUD operations, hit testing, and spatial queries for notes.
 */

import { workspace, selection, clearSelection } from './workspaceState.js';
import { deleteLinksForNote } from './linkModel.js';

let noteCounter = 0;

// Note color palette for variety
const NOTE_COLORS = [
    '#6366f1', // Indigo
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#22d3ee', // Cyan
    '#ef4444', // Red
    '#3b82f6', // Blue
];

/**
 * Create a new note at world coordinates.
 * @param {number} worldX - World X position
 * @param {number} worldY - World Y position
 * @param {string} text - Note text content
 * @returns {object} The created note
 */
export function createNote(worldX, worldY, text = 'New Note') {
    const width = 200;
    const height = 120;
    const note = {
        id: `note_${++noteCounter}`,
        x: worldX - width / 2,   // Center on cursor
        y: worldY - height / 2,
        width,
        height,
        text,
        selected: false,
        color: NOTE_COLORS[noteCounter % NOTE_COLORS.length],
    };
    workspace.notes.push(note);
    return note;
}

/**
 * Delete a note by ID (and all connected links).
 */
export function deleteNote(id) {
    deleteLinksForNote(id);
    workspace.notes = workspace.notes.filter(n => n.id !== id);
    selection.selectedNoteIds = selection.selectedNoteIds.filter(sid => sid !== id);
}

/**
 * Delete all selected notes.
 */
export function deleteSelectedNotes() {
    const ids = [...selection.selectedNoteIds];
    for (const id of ids) {
        deleteNote(id);
    }
    clearSelection();
}

/**
 * Move a single note by delta in world coordinates.
 */
export function moveNote(id, dx, dy) {
    const note = workspace.notes.find(n => n.id === id);
    if (note) {
        note.x += dx;
        note.y += dy;
    }
}

/**
 * Move all selected notes by delta in world coordinates.
 */
export function moveSelectedNotes(dx, dy) {
    for (const id of selection.selectedNoteIds) {
        moveNote(id, dx, dy);
    }
}

/**
 * Hit test: find the note under a world coordinate.
 * Returns the topmost (last in array) note hit, or null.
 */
export function hitTestNote(worldX, worldY) {
    // Iterate in reverse so topmost notes are tested first
    for (let i = workspace.notes.length - 1; i >= 0; i--) {
        const n = workspace.notes[i];
        if (
            worldX >= n.x &&
            worldX <= n.x + n.width &&
            worldY >= n.y &&
            worldY <= n.y + n.height
        ) {
            return n;
        }
    }
    return null;
}

/**
 * Update a note's text.
 */
export function updateNoteText(id, newText) {
    const note = workspace.notes.find(n => n.id === id);
    if (note) {
        note.text = newText;
    }
}

/**
 * Get the center point of a note in world coordinates.
 */
export function getNoteCenter(note) {
    return {
        x: note.x + note.width / 2,
        y: note.y + note.height / 2,
    };
}

/**
 * Get note by ID.
 */
export function getNoteById(id) {
    return workspace.notes.find(n => n.id === id) || null;
}
