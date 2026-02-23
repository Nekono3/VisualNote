/**
 * VisualNote — Main Entry Point (Phase 3: Two-Hand)
 * Orchestrates: camera → vision → gestures (2 hands) → workspace interaction → rendering
 *
 * Hand Roles:
 *   Right Hand → Precision: cursor, select, click, drag notes
 *   Left Hand  → Workspace: pan, zoom (with right hand)
 *
 * Two-Hand Combos:
 *   Both pinching → Zoom (distance ratio)
 *   Both open     → Pan (midpoint tracking)
 */

import { initCamera } from './camera/stream.js';
import { initHandTracking } from './vision/handTracking.js';
import { processAllHands, getMultiHandState, resetAllHands } from './gesture/gestureEngine.js';
import {
    workspace, screenToWorld, applyZoom, applyZoomFactor, applyPan,
    zoomToFit, selectNote, clearSelection, selection, getSelectedNotes
} from './workspace/workspaceState.js';
import {
    createNote, deleteSelectedNotes, moveSelectedNotes,
    hitTestNote, getNoteById, getNoteCenter
} from './workspace/noteModel.js';
import { createLink } from './workspace/linkModel.js';
import {
    initRenderer, clearFrame, drawVideoBackground,
    applyWorldTransform, restoreScreenSpace, drawGrid,
    drawHandCursor, drawNoHandIndicator, drawModeIndicator,
    drawTwoHandZoomFeedback, drawTwoHandPanFeedback
} from './render/renderer.js';
import { drawHandConnections, drawHandLandmarks } from './render/drawHand.js';
import { drawAllNotes } from './render/drawNotes.js';
import { drawAllLinks, drawLinkPreview } from './render/drawLinks.js';
import {
    createToolbar, updateToolbarLayout,
    checkToolbarHover, checkToolbarClick,
    getToolbarButtons, drawToolbarButton,
    getActiveTool, isToolbarMinimized, getButtonById
} from './ui/toolbar.js';
import { openEditor, closeEditor, isEditorOpen } from './ui/noteEditor.js';
import {
    openExportMenu, closeExportMenu, isExportMenuOpen,
    checkExportMenuHover, checkExportMenuClick,
    drawExportMenu, isCursorInExportMenu
} from './ui/exportMenu.js';
import { exportProjectJSON, exportCleanPNG } from './export/exportManager.js';

// --- DOM Elements ---
const videoEl = document.getElementById('webcam');
const canvasEl = document.getElementById('output-canvas');
const loadingScreen = document.getElementById('loading-screen');
const errorScreen = document.getElementById('error-screen');
const errorMessage = document.getElementById('error-message');
const loadingStatus = document.getElementById('loading-status');
const retryBtn = document.getElementById('retry-btn');
const fpsCounter = document.getElementById('fps-counter');

// --- Runtime State ---
let ctx = null;
let latestResults = null;
let isRunning = false;

// FPS
let frameCount = 0;
let lastFpsUpdate = performance.now();
let currentFps = 0;

// Interaction state
let hoveredNoteId = null;
let isDragging = false;
let isPanning = false;

// Export toast
let toastMessage = '';
let toastStartTime = 0;
const TOAST_DURATION = 2500;

// --- Bootstrap ---
async function init() {
    try {
        const renderer = initRenderer(canvasEl);
        ctx = renderer.ctx;

        updateLoadingStatus('Requesting camera access...');
        await initCamera(videoEl);

        await initHandTracking(videoEl, onHandResults, updateLoadingStatus);

        createToolbar(canvasEl.height);
        seedDemoNotes();

        window.addEventListener('resize', () => {
            updateToolbarLayout(canvasEl.height);
        });

        // Mouse wheel zoom fallback
        canvasEl.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -1 : 1;
            applyZoom(delta, e.clientX, e.clientY);
        }, { passive: false });

        loadingScreen.classList.add('fade-out');
        setTimeout(() => { loadingScreen.style.display = 'none'; }, 600);

        isRunning = true;
        requestAnimationFrame(renderLoop);

    } catch (err) {
        handleError(err);
    }
}

function seedDemoNotes() {
    createNote(400, 300, 'Welcome to VisualNote');
    createNote(750, 250, 'Right hand: Pinch to select');
    createNote(750, 450, 'Right hand: Fist to drag');
    createNote(400, 550, 'Both hands: Pinch to zoom');

    if (workspace.notes.length >= 2) {
        createLink(workspace.notes[0].id, workspace.notes[1].id);
    }
    if (workspace.notes.length >= 4) {
        createLink(workspace.notes[0].id, workspace.notes[3].id);
    }
}

function onHandResults(results) {
    latestResults = results;
}

// ============================================================
// Main Render Loop
// ============================================================

function renderLoop(timestamp) {
    if (!isRunning) return;

    // FPS
    frameCount++;
    if (timestamp - lastFpsUpdate >= 1000) {
        currentFps = frameCount;
        frameCount = 0;
        lastFpsUpdate = timestamp;
        fpsCounter.textContent = `${currentFps} FPS`;
    }

    const w = canvasEl.width;
    const h = canvasEl.height;

    // 1. Clear
    clearFrame(ctx, canvasEl);

    // 2. Video background
    if (videoEl.readyState >= 2) {
        drawVideoBackground(ctx, videoEl, canvasEl);
    }

    // 3. Process all hands
    if (latestResults) {
        processAllHands(latestResults, w, h);
    } else {
        resetAllHands();
    }

    const mhs = getMultiHandState();
    const anyHand = mhs.right.detected || mhs.left.detected;

    // 4. World-space rendering
    applyWorldTransform(ctx);
    drawGrid(ctx, w, h);
    drawAllLinks(ctx, workspace.links, null);
    drawAllNotes(ctx, workspace.notes, hoveredNoteId);

    // Link preview while linking
    if (getActiveTool() === 'link' && selection.linkSourceId && mhs.right.detected) {
        const sourceNote = getNoteById(selection.linkSourceId);
        if (sourceNote) {
            const worldCursor = screenToWorld(mhs.right.cursor.x, mhs.right.cursor.y);
            drawLinkPreview(ctx, sourceNote, worldCursor);
        }
    }

    restoreScreenSpace(ctx);

    // 5. Screen-space overlays
    if (anyHand) {
        // Draw hand skeletons (per-hand coloring)
        if (mhs.right.detected) {
            drawHandConnections(ctx, mhs.right.landmarks, w, h, 'right');
            drawHandLandmarks(ctx, mhs.right.landmarks, w, h, 'right');
        }
        if (mhs.left.detected) {
            drawHandConnections(ctx, mhs.left.landmarks, w, h, 'left');
            drawHandLandmarks(ctx, mhs.left.landmarks, w, h, 'left');
        }

        // --- Interaction Logic (priority-based) ---
        processInteraction(mhs, w, h);

        // Two-hand visual feedback
        if (mhs.mode === 'two_hand_zoom') {
            drawTwoHandZoomFeedback(ctx, mhs.right.cursor, mhs.left.cursor);
        } else if (mhs.mode === 'two_hand_pan') {
            drawTwoHandPanFeedback(ctx, mhs.right.cursor, mhs.left.cursor);
        }

        // Mode indicator
        drawModeIndicator(ctx, w, mhs.mode, mhs.right.gestureMode, mhs.left.gestureMode, getActiveTool());

        // Cursors (drawn last for visibility)
        if (mhs.right.detected) {
            drawHandCursor(ctx, 'right', mhs.right);
        }
        if (mhs.left.detected) {
            drawHandCursor(ctx, 'left', mhs.left);
        }
    } else {
        resetInteractionState();
        drawNoHandIndicator(ctx, w, h);
    }

    // 6. Toolbar (screen space, always on top)
    const buttons = getToolbarButtons();
    if (!isToolbarMinimized()) {
        for (const btn of buttons) {
            drawToolbarButton(ctx, btn, getActiveTool() === btn.id);
        }
    } else {
        const toggleBtn = buttons.find(b => b.id === 'toggle');
        if (toggleBtn) drawToolbarButton(ctx, toggleBtn, false);
    }

    // 7. Export Menu (above toolbar)
    drawExportMenu(ctx);

    // 8. Toast notification
    drawToast(ctx, w, h);

    requestAnimationFrame(renderLoop);
}

// ============================================================
// Interaction Processing (Priority-Based)
// ============================================================

function processInteraction(mhs, canvasWidth, canvasHeight) {
    // Close editor if doing workspace actions
    if (isEditorOpen() && mhs.mode !== 'idle' && mhs.mode !== 'single_right') {
        closeEditor();
    }

    // Priority 1: Two-hand combos (highest)
    if (mhs.mode === 'two_hand_zoom') {
        handleTwoHandZoom(mhs);
        isDragging = false;
        isPanning = false;
        return;
    }

    if (mhs.mode === 'two_hand_pan') {
        handleTwoHandPan(mhs);
        isDragging = false;
        isPanning = false;
        return;
    }

    // Priority 2: Right hand (editing / precision)
    if (mhs.right.detected) {
        processRightHand(mhs.right, canvasWidth, canvasHeight);
    }

    // Priority 3: Left hand (workspace control, only when right isn't dragging)
    if (mhs.left.detected && !isDragging) {
        processLeftHand(mhs.left);
    }
}

// --- Two-Hand Handlers ---

function handleTwoHandZoom(mhs) {
    const factor = mhs.twoHand.zoomFactor;
    const center = mhs.twoHand.midpoint;

    if (Math.abs(factor - 1) > 0.002) {
        applyZoomFactor(factor, center.x, center.y);
    }
}

function handleTwoHandPan(mhs) {
    const delta = mhs.twoHand.panDelta;
    if (Math.abs(delta.x) > 0.5 || Math.abs(delta.y) > 0.5) {
        applyPan(delta.x, delta.y);
    }
}

// --- Right Hand (Precision & Editing) ---

function processRightHand(rh, canvasWidth, canvasHeight) {
    // If editor is open, don't process workspace gestures
    if (isEditorOpen()) return;

    const cursor = rh.cursor;
    const worldCursor = screenToWorld(cursor.x, cursor.y);
    const tool = getActiveTool();

    // 0. Export menu interaction (highest priority when open)
    if (isExportMenuOpen()) {
        checkExportMenuHover(cursor);
        const exportAction = checkExportMenuClick(cursor, rh.pinchJustConfirmed);
        if (exportAction) {
            handleExportAction(exportAction, canvasWidth, canvasHeight);
            return;
        }
        // If cursor is in menu, block other interactions
        if (isCursorInExportMenu(cursor)) return;
        // Click outside menu = close it
        if (rh.pinchJustConfirmed) {
            closeExportMenu();
            return;
        }
    }

    // 1. Toolbar interaction (highest priority in single-hand mode)
    const hoveredBtn = checkToolbarHover(cursor);
    const action = checkToolbarClick(cursor, rh.pinchJustConfirmed);

    if (action) {
        handleToolbarAction(action, canvasWidth, canvasHeight);
        return;
    }

    if (hoveredBtn) {
        hoveredNoteId = null;
        return;
    }

    // 2. Workspace interaction
    const noteUnderCursor = hitTestNote(worldCursor.x, worldCursor.y);
    hoveredNoteId = noteUnderCursor ? noteUnderCursor.id : null;

    switch (rh.gestureMode) {
        case 'point':
            if (isDragging || isPanning) {
                isDragging = false;
                isPanning = false;
            }
            break;

        case 'pinch':
            handleRightPinch(rh, tool, worldCursor, noteUnderCursor);
            break;

        case 'fist':
            handleRightFist(rh, cursor, noteUnderCursor);
            break;

        default:
            isDragging = false;
            isPanning = false;
            break;
    }
}

function handleRightPinch(rh, tool, worldCursor, noteUnderCursor) {
    if (!rh.pinchJustConfirmed) return;

    switch (tool) {
        case 'select':
            if (noteUnderCursor) {
                if (noteUnderCursor.selected) {
                    // Pinch on already-selected note → open text editor
                    openEditor(noteUnderCursor);
                } else {
                    selectNote(noteUnderCursor.id, false);
                }
            } else {
                clearSelection();
            }
            break;

        case 'note':
            createNote(worldCursor.x, worldCursor.y, 'New Note');
            break;

        case 'link':
            if (noteUnderCursor) {
                if (!selection.linkSourceId) {
                    selection.linkSourceId = noteUnderCursor.id;
                    selectNote(noteUnderCursor.id, false);
                } else {
                    createLink(selection.linkSourceId, noteUnderCursor.id);
                    selection.linkSourceId = null;
                    clearSelection();
                }
            } else {
                selection.linkSourceId = null;
                clearSelection();
            }
            break;

        case 'delete':
            if (noteUnderCursor) {
                selectNote(noteUnderCursor.id, false);
                deleteSelectedNotes();
            }
            break;
    }
}

function handleRightFist(rh, cursor, noteUnderCursor) {
    const delta = rh.cursorDelta;

    if (!isDragging && !isPanning) {
        if (noteUnderCursor && noteUnderCursor.selected) {
            isDragging = true;
        } else if (noteUnderCursor && !noteUnderCursor.selected) {
            selectNote(noteUnderCursor.id, false);
            isDragging = true;
        } else {
            // Right hand fist on empty space = pan (fallback if no left hand)
            isPanning = true;
        }
    }

    if (isDragging) {
        const worldDx = delta.x / workspace.zoom;
        const worldDy = delta.y / workspace.zoom;
        moveSelectedNotes(worldDx, worldDy);
    } else if (isPanning) {
        applyPan(delta.x, delta.y);
    }
}

// --- Left Hand (Workspace Control) ---

function processLeftHand(lh) {
    if (lh.gestureMode === 'fist') {
        // Left fist = pan workspace
        const delta = lh.cursorDelta;
        if (Math.abs(delta.x) > 0.5 || Math.abs(delta.y) > 0.5) {
            applyPan(delta.x, delta.y);
        }
    }
    // Left hand open or point = no single-hand action
    // (Two-hand combos are handled at priority 1 level)
}

// --- Toolbar Actions ---

function handleToolbarAction(action, canvasWidth, canvasHeight) {
    switch (action) {
        case 'fit':
            zoomToFit(canvasWidth, canvasHeight);
            break;
        case 'delete':
            deleteSelectedNotes();
            break;
        case 'link':
            selection.linkSourceId = null;
            break;
        case 'download': {
            const btn = getButtonById('download');
            if (btn) {
                openExportMenu(btn.x + btn.width, btn.y);
            }
            break;
        }
    }
}

async function handleExportAction(exportType) {
    closeExportMenu();

    switch (exportType) {
        case 'json':
            exportProjectJSON();
            showToast('✅ Project saved as JSON');
            break;

        case 'png': {
            const ok = await exportCleanPNG();
            showToast(ok ? '✅ Exported as PNG' : '❌ No notes to export');
            break;
        }
    }
}

// --- Toast Notification ---

function showToast(message) {
    toastMessage = message;
    toastStartTime = performance.now();
}

function drawToast(ctx, canvasWidth, canvasHeight) {
    if (!toastMessage) return;

    const elapsed = performance.now() - toastStartTime;
    if (elapsed > TOAST_DURATION) {
        toastMessage = '';
        return;
    }

    // Fade in/out
    let alpha = 1;
    if (elapsed < 300) alpha = elapsed / 300;
    if (elapsed > TOAST_DURATION - 500) alpha = (TOAST_DURATION - elapsed) / 500;
    alpha = Math.max(0, Math.min(1, alpha));

    ctx.save();
    ctx.globalAlpha = alpha;

    ctx.font = '500 14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const tw = ctx.measureText(toastMessage).width;
    const px = 20, py = 12;
    const x = canvasWidth / 2;
    const y = canvasHeight - 80;

    // Background pill
    ctx.beginPath();
    ctx.roundRect(x - tw / 2 - px, y - py, tw + px * 2, py * 2 + 4, 12);
    ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#10b981';
    ctx.fillText(toastMessage, x, y + 2);

    ctx.restore();
}

function resetInteractionState() {
    hoveredNoteId = null;
    isDragging = false;
    isPanning = false;
}

// ============================================================
// Error Handling
// ============================================================

function updateLoadingStatus(message) {
    if (loadingStatus) loadingStatus.textContent = message;
}

function handleError(err) {
    loadingScreen.style.display = 'none';

    let message = 'An unexpected error occurred. Please try again.';
    if (err.message === 'PERMISSION_DENIED') {
        message = 'Camera access was denied. Please allow camera permissions.';
    } else if (err.message === 'NO_CAMERA') {
        message = 'No camera found. Please connect a webcam.';
    } else if (err.message && err.message.startsWith('CAMERA_ERROR')) {
        message = `Camera error: ${err.message.replace('CAMERA_ERROR: ', '')}`;
    }

    errorMessage.textContent = message;
    errorScreen.classList.remove('hidden');
    console.error('[VisualNote] Init error:', err);
}

retryBtn.addEventListener('click', () => {
    errorScreen.classList.add('hidden');
    loadingScreen.style.display = 'flex';
    loadingScreen.classList.remove('fade-out');
    init();
});

// --- Go! ---
init();
