/**
 * VisualNote — Export Manager
 * Handles JSON project save and clean PNG export.
 * PNG exports render notes-only on white background — no camera, toolbar, or overlays.
 */

import { workspace } from '../workspace/workspaceState.js';

const PROJECT_VERSION = '1.0';

// ============================================================
// JSON Project Export
// ============================================================

/**
 * Export full workspace state as a downloadable .json file.
 */
export function exportProjectJSON() {
    const project = {
        version: PROJECT_VERSION,
        timestamp: new Date().toISOString(),
        workspace: {
            zoom: workspace.zoom,
            offsetX: workspace.offsetX,
            offsetY: workspace.offsetY,
        },
        notes: workspace.notes.map(n => ({
            id: n.id,
            x: n.x,
            y: n.y,
            width: n.width,
            height: n.height,
            text: n.text,
            color: n.color,
        })),
        links: workspace.links.map(l => ({
            id: l.id,
            from: l.from,
            to: l.to,
        })),
    };

    const json = JSON.stringify(project, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    triggerDownload(blob, `visualnote_${formatTimestamp()}.json`);
    return true;
}

// ============================================================
// Clean PNG Export (Notes Only, White Background)
// ============================================================

/**
 * Export workspace as a clean PNG: white background + notes only.
 * No camera feed, no toolbar, no hand landmarks, no UI overlays.
 */
export function exportCleanPNG() {
    const notes = workspace.notes;
    if (notes.length === 0) return false;

    // Step 1 — Calculate workspace bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of notes) {
        minX = Math.min(minX, n.x);
        minY = Math.min(minY, n.y);
        maxX = Math.max(maxX, n.x + n.width);
        maxY = Math.max(maxY, n.y + n.height);
    }

    const padding = 60;
    const canvasWidth = Math.ceil(maxX - minX + padding * 2);
    const canvasHeight = Math.ceil(maxY - minY + padding * 2);

    // Step 2 — Create offscreen canvas
    const offscreen = document.createElement('canvas');
    offscreen.width = canvasWidth;
    offscreen.height = canvasHeight;
    const ctx = offscreen.getContext('2d');

    // Step 3 — White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Step 4 — Render notes only (clean style for white bg)
    for (const note of notes) {
        drawCleanNote(ctx, note, minX - padding, minY - padding);
    }

    // Step 5 — Export as PNG
    return new Promise((resolve) => {
        offscreen.toBlob((blob) => {
            if (!blob) {
                resolve(false);
                return;
            }
            triggerDownload(blob, `visualnote_${formatTimestamp()}.png`);

            // Cleanup
            offscreen.width = 0;
            offscreen.height = 0;
            resolve(true);
        }, 'image/png');
    });
}

// ============================================================
// Clean Note Renderer (Print-Friendly)
// ============================================================

/**
 * Draw a single note in clean, print-friendly style for white background.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} note
 * @param {number} originX - World X origin offset
 * @param {number} originY - World Y origin offset
 */
function drawCleanNote(ctx, note, originX, originY) {
    const x = note.x - originX;
    const y = note.y - originY;
    const { width, height, text, color } = note;
    const radius = 12;

    ctx.save();

    // --- Card shadow ---
    ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;

    // --- Card background (white with subtle warmth) ---
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.fillStyle = '#fafafa';
    ctx.fill();

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // --- Color accent bar at top ---
    ctx.beginPath();
    ctx.roundRect(x, y, width, 5, [radius, radius, 0, 0]);
    ctx.fillStyle = color || '#6366f1';
    ctx.fill();

    // --- Border ---
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.stroke();

    // --- Text (dark for white background) ---
    ctx.font = '500 14px Inter, sans-serif';
    ctx.fillStyle = '#1e293b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Word wrap
    const maxWidth = width - 24;
    const words = text.split(' ');
    let lines = [];
    let currentLine = '';

    for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        if (ctx.measureText(testLine).width > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    }
    if (currentLine) lines.push(currentLine);

    // Limit to 5 lines for export
    if (lines.length > 5) {
        lines = lines.slice(0, 5);
        lines[4] = lines[4].slice(0, -3) + '...';
    }

    const lineHeight = 20;
    const textStartY = y + height / 2 - ((lines.length - 1) * lineHeight) / 2 + 4;

    for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], x + width / 2, textStartY + i * lineHeight);
    }

    ctx.restore();
}

// ============================================================
// Utilities
// ============================================================

function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

function formatTimestamp() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}
