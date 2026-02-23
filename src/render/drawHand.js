/**
 * VisualNote — Draw Hand (Phase 3: Two-Hand)
 * Renders hand skeletons with per-hand coloring.
 * Right hand → Blue/Indigo palette (precision)
 * Left hand  → Green/Emerald palette (workspace)
 */

// MediaPipe hand connection pairs
const HAND_CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 4],
    [0, 5], [5, 6], [6, 7], [7, 8],
    [0, 9], [9, 10], [10, 11], [11, 12],
    [0, 13], [13, 14], [14, 15], [15, 16],
    [0, 17], [17, 18], [18, 19], [19, 20],
    [5, 9], [9, 13], [13, 17],
];

// Color palettes per hand
const RIGHT_COLORS = {
    thumb: '#f59e0b',
    index: '#6366f1',
    middle: '#818cf8',
    ring: '#a78bfa',
    pinky: '#c4b5fd',
    palm: 'rgba(99, 102, 241, 0.3)',
};

const LEFT_COLORS = {
    thumb: '#f59e0b',
    index: '#10b981',
    middle: '#34d399',
    ring: '#6ee7b7',
    pinky: '#a7f3d0',
    palm: 'rgba(16, 185, 129, 0.3)',
};

function getFingerGroup(index) {
    if (index <= 4) return 'thumb';
    if (index <= 8) return 'index';
    if (index <= 12) return 'middle';
    if (index <= 16) return 'ring';
    if (index <= 20) return 'pinky';
    return 'palm';
}

function getConnectionColor(i1, i2, palette) {
    // Use the finger group of the higher landmark index
    const maxIdx = Math.max(i1, i2);
    const group = getFingerGroup(maxIdx);
    return palette[group] || palette.palm;
}

function getLandmarkColor(index, palette) {
    const group = getFingerGroup(index);
    return palette[group] || '#ffffff';
}

/**
 * Draw hand skeleton connections.
 * @param {string} handId - 'right' | 'left'
 */
export function drawHandConnections(ctx, landmarks, canvasWidth, canvasHeight, handId = 'right') {
    if (!landmarks) return;

    const palette = handId === 'left' ? LEFT_COLORS : RIGHT_COLORS;

    for (const [i1, i2] of HAND_CONNECTIONS) {
        const x1 = (1 - landmarks[i1].x) * canvasWidth;
        const y1 = landmarks[i1].y * canvasHeight;
        const x2 = (1 - landmarks[i2].x) * canvasWidth;
        const y2 = landmarks[i2].y * canvasHeight;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = getConnectionColor(i1, i2, palette);
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.globalAlpha = 0.5;
        ctx.stroke();
        ctx.globalAlpha = 1;
    }
}

/**
 * Draw hand landmarks as glowing dots.
 * @param {string} handId - 'right' | 'left'
 */
export function drawHandLandmarks(ctx, landmarks, canvasWidth, canvasHeight, handId = 'right') {
    if (!landmarks) return;

    const palette = handId === 'left' ? LEFT_COLORS : RIGHT_COLORS;

    for (let i = 0; i < landmarks.length; i++) {
        const x = (1 - landmarks[i].x) * canvasWidth;
        const y = landmarks[i].y * canvasHeight;
        const color = getLandmarkColor(i, palette);
        const radius = (i === 8 || i === 4) ? 6 : 3;

        // Glow
        ctx.beginPath();
        ctx.arc(x, y, radius + 3, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.15;
        ctx.fill();
        ctx.globalAlpha = 1;

        // Dot
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
    }
}
