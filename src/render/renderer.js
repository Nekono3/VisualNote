/**
 * VisualNote — Renderer (Phase 3: Two-Hand)
 * Core rendering pipeline with world transform support.
 * Now supports dual cursors, two-hand mode indicators, and zoom feedback.
 */

import { workspace } from '../workspace/workspaceState.js';

/**
 * Initialize the renderer.
 */
export function initRenderer(canvas) {
    const ctx = canvas.getContext('2d');

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    resize();
    window.addEventListener('resize', resize);

    return { ctx, resize };
}

/**
 * Clear the canvas.
 */
export function clearFrame(ctx, canvas) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

/**
 * Draw the mirrored webcam video as background.
 */
export function drawVideoBackground(ctx, video, canvas) {
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    // Darker overlay for better contrast with notes
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

/**
 * Apply the world-to-screen transform to the canvas context.
 */
export function applyWorldTransform(ctx) {
    ctx.save();
    ctx.scale(workspace.zoom, workspace.zoom);
    ctx.translate(workspace.offsetX, workspace.offsetY);
}

/**
 * Restore the canvas context to screen space.
 */
export function restoreScreenSpace(ctx) {
    ctx.restore();
}

/**
 * Draw a subtle dot grid in world space.
 */
export function drawGrid(ctx, canvasWidth, canvasHeight) {
    const gridSize = 50;
    const zoom = workspace.zoom;
    const ox = workspace.offsetX;
    const oy = workspace.offsetY;

    const worldLeft = -ox;
    const worldTop = -oy;
    const worldRight = canvasWidth / zoom - ox;
    const worldBottom = canvasHeight / zoom - oy;

    const startX = Math.floor(worldLeft / gridSize) * gridSize;
    const startY = Math.floor(worldTop / gridSize) * gridSize;
    const endX = Math.ceil(worldRight / gridSize) * gridSize;
    const endY = Math.ceil(worldBottom / gridSize) * gridSize;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';

    for (let x = startX; x <= endX; x += gridSize) {
        for (let y = startY; y <= endY; y += gridSize) {
            ctx.beginPath();
            ctx.arc(x, y, 1.5 / zoom, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// ============================================================
// Cursors (Per-Hand)
// ============================================================

/**
 * Draw a cursor for a specific hand.
 * @param {string} handId - 'right' | 'left'
 * @param {object} handState - Per-hand state from getMultiHandState()
 */
export function drawHandCursor(ctx, handId, handState) {
    if (!handState.detected) return;

    const { x, y } = handState.cursor;
    const mode = handState.gestureMode;
    const isRight = handId === 'right';
    const baseRadius = isRight ? 14 : 11;

    // Base colors by hand
    const primaryColor = isRight ? '#6366f1' : '#10b981';   // indigo vs emerald
    const primaryRGB = isRight ? '99, 102, 241' : '16, 185, 129';

    if (handState.pinchConfirmed) {
        // Active pinch — pulsing ring
        const pulseRadius = baseRadius + Math.sin(performance.now() * 0.01) * 3;

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, pulseRadius + 12);
        gradient.addColorStop(0, `rgba(236, 72, 153, 0.5)`);
        gradient.addColorStop(1, `rgba(236, 72, 153, 0)`);
        ctx.beginPath();
        ctx.arc(x, y, pulseRadius + 12, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, pulseRadius, 0, Math.PI * 2);
        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = isRight ? 3 : 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(x, y, isRight ? 4 : 3, 0, Math.PI * 2);
        ctx.fillStyle = '#ec4899';
        ctx.fill();
    } else if (mode === 'fist') {
        // Fist — orange grab cursor
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, baseRadius + 8);
        gradient.addColorStop(0, 'rgba(245, 158, 11, 0.35)');
        gradient.addColorStop(1, 'rgba(245, 158, 11, 0)');
        ctx.beginPath();
        ctx.arc(x, y, baseRadius + 8, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.7;
        for (let i = 0; i < 4; i++) {
            const angle = (i * Math.PI) / 4 + Math.PI / 8;
            ctx.beginPath();
            ctx.moveTo(x + Math.cos(angle) * 5, y + Math.sin(angle) * 5);
            ctx.lineTo(x + Math.cos(angle) * 12, y + Math.sin(angle) * 12);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;

        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#f59e0b';
        ctx.fill();
    } else if (mode === 'open') {
        // Open hand — soft glow of hand color
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, baseRadius + 6);
        gradient.addColorStop(0, `rgba(${primaryRGB}, 0.2)`);
        gradient.addColorStop(1, `rgba(${primaryRGB}, 0)`);
        ctx.beginPath();
        ctx.arc(x, y, baseRadius + 6, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, baseRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${primaryRGB}, 0.4)`;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${primaryRGB}, 0.6)`;
        ctx.fill();
    } else {
        // Default point cursor
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, baseRadius + 8);
        gradient.addColorStop(0, `rgba(${primaryRGB}, 0.25)`);
        gradient.addColorStop(1, `rgba(${primaryRGB}, 0)`);
        ctx.beginPath();
        ctx.arc(x, y, baseRadius + 8, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, baseRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${primaryRGB}, 0.6)`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = primaryColor;
        ctx.fill();
    }

    // Hand label (small text below cursor)
    ctx.font = '500 9px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = `rgba(${primaryRGB}, 0.5)`;
    ctx.fillText(isRight ? 'R' : 'L', x, y + baseRadius + 6);
}

// ============================================================
// Two-Hand Visual Feedback
// ============================================================

/**
 * Draw visual feedback for two-hand zoom (line between hands + scale indicator).
 */
export function drawTwoHandZoomFeedback(ctx, rightCursor, leftCursor) {
    const rx = rightCursor.x, ry = rightCursor.y;
    const lx = leftCursor.x, ly = leftCursor.y;
    const midX = (rx + lx) / 2;
    const midY = (ry + ly) / 2;

    ctx.save();

    // Line between hands
    const gradient = ctx.createLinearGradient(lx, ly, rx, ry);
    gradient.addColorStop(0, 'rgba(16, 185, 129, 0.6)');  // Green (left)
    gradient.addColorStop(0.5, 'rgba(34, 211, 238, 0.8)');  // Cyan (center)
    gradient.addColorStop(1, 'rgba(99, 102, 241, 0.6)');  // Indigo (right)

    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(rx, ry);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Center zoom icon
    const pulseR = 18 + Math.sin(performance.now() * 0.008) * 4;

    ctx.beginPath();
    ctx.arc(midX, midY, pulseR, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(midX, midY, pulseR * 0.5, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Zoom label
    const zoomPct = Math.round(workspace.zoom * 100);
    ctx.font = '600 12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(34, 211, 238, 0.9)';
    ctx.fillText(`${zoomPct}%`, midX, midY);

    ctx.restore();
}

/**
 * Draw visual feedback for two-hand pan (line + pan icon).
 */
export function drawTwoHandPanFeedback(ctx, rightCursor, leftCursor) {
    const rx = rightCursor.x, ry = rightCursor.y;
    const lx = leftCursor.x, ly = leftCursor.y;
    const midX = (rx + lx) / 2;
    const midY = (ry + ly) / 2;

    ctx.save();

    // Soft line between hands
    const gradient = ctx.createLinearGradient(lx, ly, rx, ry);
    gradient.addColorStop(0, 'rgba(16, 185, 129, 0.4)');
    gradient.addColorStop(1, 'rgba(99, 102, 241, 0.4)');

    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(rx, ry);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 6]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Pan icon at center - arrow cross
    const size = 10;
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.6)';
    ctx.lineWidth = 1.5;

    // Up
    ctx.beginPath();
    ctx.moveTo(midX, midY - size);
    ctx.lineTo(midX, midY + size);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(midX - size, midY);
    ctx.lineTo(midX + size, midY);
    ctx.stroke();

    ctx.restore();
}

// ============================================================
// Mode Indicator (Updated for Two-Hand)
// ============================================================

/**
 * Draw gesture mode indicator (top-center).
 * @param {string} interactionMode - From getMultiHandState().mode
 * @param {string} rightGesture - Right hand gesture mode
 * @param {string} leftGesture - Left hand gesture mode
 * @param {string} activeTool
 */
export function drawModeIndicator(ctx, canvasWidth, interactionMode, rightGesture, leftGesture, activeTool) {
    const modeLabels = {
        two_hand_zoom: '🤏🤏 Zoom',
        two_hand_pan: '✋✋ Pan',
        two_hand_link: '🔗 Auto-Link',
    };

    const singleLabels = {
        point: '👆 Point',
        pinch: '🤏 Pinch',
        fist: '✊ Drag',
        open: '✋ Open',
        none: '',
    };

    let label = '';

    if (modeLabels[interactionMode]) {
        label = modeLabels[interactionMode];
    } else if (interactionMode === 'single_right') {
        label = singleLabels[rightGesture] || '';
    } else if (interactionMode === 'single_left') {
        label = `L: ${singleLabels[leftGesture] || ''}`;
    }

    if (!label) return;

    const toolLabel = activeTool.charAt(0).toUpperCase() + activeTool.slice(1);
    const text = `${label}  •  ${toolLabel}`;

    ctx.font = '500 13px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const tw = ctx.measureText(text).width;
    const px = 16;

    // Background pill
    ctx.beginPath();
    ctx.roundRect(canvasWidth / 2 - tw / 2 - px, 14, tw + px * 2, 30, 15);
    ctx.fillStyle = 'rgba(15, 15, 25, 0.6)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = 'rgba(241, 245, 249, 0.8)';
    ctx.fillText(text, canvasWidth / 2, 29);
}

/**
 * Draw "no hand detected" indicator.
 */
export function drawNoHandIndicator(ctx, canvasWidth, canvasHeight) {
    ctx.font = '500 16px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
    ctx.fillText('✋ Show your hands to start', canvasWidth / 2, canvasHeight - 50);
}
