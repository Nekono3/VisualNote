/**
 * VisualNote — Note Editor (UI Layer)
 * Manages the HTML textarea overlay for editing note text.
 * Positioned at the note's screen coordinates using world→screen transform.
 */

import { worldToScreen } from '../workspace/workspaceState.js';
import { updateNoteText, getNoteById } from '../workspace/noteModel.js';

// --- DOM References ---
const editorEl = document.getElementById('note-editor');
const textareaEl = document.getElementById('note-editor-textarea');

// --- Editor State ---
let isOpen = false;
let editingNoteId = null;

/**
 * Open the editor for a specific note.
 * @param {object} note - The note to edit
 */
export function openEditor(note) {
    if (!note) return;

    editingNoteId = note.id;
    isOpen = true;

    // Position at note's screen location
    const screen = worldToScreen(note.x, note.y);

    editorEl.style.left = `${screen.x}px`;
    editorEl.style.top = `${screen.y}px`;

    // Match textarea size to note
    textareaEl.style.width = `${Math.max(200, note.width)}px`;
    textareaEl.style.minHeight = `${Math.max(80, note.height)}px`;

    // Set text content
    textareaEl.value = note.text || '';

    // Show editor
    editorEl.classList.remove('hidden');

    // Trigger enter animation on next frame
    requestAnimationFrame(() => {
        editorEl.classList.add('visible');
        textareaEl.focus();
        textareaEl.select();
    });
}

/**
 * Close the editor, saving the text.
 */
export function closeEditor() {
    if (!isOpen) return;

    const note = getNoteById(editingNoteId);
    if (note && textareaEl.value.trim()) {
        updateNoteText(editingNoteId, textareaEl.value.trim());
    }

    isOpen = false;
    editingNoteId = null;

    editorEl.classList.remove('visible');
    setTimeout(() => {
        editorEl.classList.add('hidden');
    }, 200); // Wait for fade-out animation

    // Blur to release keyboard focus
    textareaEl.blur();
}

/**
 * Check if the editor is currently open.
 */
export function isEditorOpen() {
    return isOpen;
}

/**
 * Get the ID of the note currently being edited.
 */
export function getEditingNoteId() {
    return editingNoteId;
}

// --- Keyboard Events ---
textareaEl.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        e.preventDefault();
        closeEditor();
    }

    // Ctrl/Cmd+Enter to save and close
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        closeEditor();
    }

    // Stop propagation so canvas/gesture system doesn't interfere
    e.stopPropagation();
});

// --- Click outside to close ---
document.addEventListener('mousedown', (e) => {
    if (isOpen && !editorEl.contains(e.target)) {
        closeEditor();
    }
});
