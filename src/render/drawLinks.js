/**
 * VisualNote — Draw Links
 * Renders connection lines between notes with arrows and gradients.
 */

import { getNoteCenter, getNoteById } from '../workspace/noteModel.js';

/**
 * Draw a link line between two notes.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} link - Link object { id, from, to }
 * @param {boolean} isHovered
 */
export function drawLink(ctx, link, isHovered = false) {
    const fromNote = getNoteById(link.from);
    const toNote = getNoteById(link.to);
    if (!fromNote || !toNote) return;

    const from = getNoteCenter(fromNote);
    const to = getNoteCenter(toNote);

    ctx.save();

    // --- Gradient line ---
    const gradient = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
    gradient.addColorStop(0, fromNote.color || '#6366f1');
    gradient.addColorStop(1, toNote.color || '#8b5cf6');

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);

    // Slight curve for aesthetics
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const offset = Math.min(Math.sqrt(dx * dx + dy * dy) * 0.1, 40);
    const cpX = midX - dy * 0.1;
    const cpY = midY + dx * 0.1;

    ctx.quadraticCurveTo(cpX, cpY, to.x, to.y);

    ctx.strokeStyle = gradient;
    ctx.lineWidth = isHovered ? 3 : 2;
    ctx.globalAlpha = isHovered ? 0.9 : 0.6;
    ctx.stroke();

    // --- Arrow at endpoint ---
    const angle = Math.atan2(to.y - cpY, to.x - cpX);
    const arrowLen = 12;
    const arrowWidth = Math.PI / 6;

    // Offset arrow to stop at note edge
    const arrowTipX = to.x - Math.cos(angle) * (toNote.width / 2 * 0.6);
    const arrowTipY = to.y - Math.sin(angle) * (toNote.height / 2 * 0.6);

    ctx.beginPath();
    ctx.moveTo(arrowTipX, arrowTipY);
    ctx.lineTo(
        arrowTipX - arrowLen * Math.cos(angle - arrowWidth),
        arrowTipY - arrowLen * Math.sin(angle - arrowWidth)
    );
    ctx.lineTo(
        arrowTipX - arrowLen * Math.cos(angle + arrowWidth),
        arrowTipY - arrowLen * Math.sin(angle + arrowWidth)
    );
    ctx.closePath();
    ctx.fillStyle = toNote.color || '#8b5cf6';
    ctx.globalAlpha = isHovered ? 0.9 : 0.7;
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.restore();
}

/**
 * Draw a live preview link line from a note to the cursor (while linking).
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} fromNote
 * @param {{ x: number, y: number }} cursorWorld - Cursor position in world coords
 */
export function drawLinkPreview(ctx, fromNote, cursorWorld) {
    if (!fromNote) return;

    const from = getNoteCenter(fromNote);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(cursorWorld.x, cursorWorld.y);
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Dot at cursor end
    ctx.beginPath();
    ctx.arc(cursorWorld.x, cursorWorld.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(99, 102, 241, 0.7)';
    ctx.fill();

    ctx.restore();
}

/**
 * Draw all links.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array} links
 * @param {string|null} hoveredLinkId
 */
export function drawAllLinks(ctx, links, hoveredLinkId) {
    for (const link of links) {
        drawLink(ctx, link, link.id === hoveredLinkId);
    }
}
