/**
 * VisualNote — Draw Notes
 * Renders note cards on the canvas with glassmorphism style.
 */

/**
 * Draw a single note card.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} note - Note object with x, y, width, height, text, selected, color
 * @param {boolean} isHovered - Whether cursor is over this note
 */
export function drawNote(ctx, note, isHovered = false) {
    const { x, y, width, height, text, selected, color } = note;
    const radius = 16;

    ctx.save();

    // --- Shadow ---
    if (selected) {
        ctx.shadowColor = 'rgba(99, 102, 241, 0.5)';
        ctx.shadowBlur = 24;
        ctx.shadowOffsetY = 4;
    } else {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 2;
    }

    // --- Background ---
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.fillStyle = 'rgba(20, 20, 35, 0.75)';
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // --- Color accent bar at top ---
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, width, 6, [radius, radius, 0, 0]);
    ctx.fillStyle = color || '#6366f1';
    ctx.fill();
    ctx.restore();

    // --- Border ---
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    if (selected) {
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.8)';
        ctx.lineWidth = 2.5;
    } else if (isHovered) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1.5;
    } else {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
        ctx.lineWidth = 1;
    }
    ctx.stroke();

    // --- Selection glow ---
    if (selected) {
        ctx.beginPath();
        ctx.roundRect(x - 4, y - 4, width + 8, height + 8, radius + 4);
        const glow = ctx.createRadialGradient(
            x + width / 2, y + height / 2, 0,
            x + width / 2, y + height / 2, Math.max(width, height)
        );
        glow.addColorStop(0, 'rgba(99, 102, 241, 0.08)');
        glow.addColorStop(1, 'rgba(99, 102, 241, 0)');
        ctx.fillStyle = glow;
        ctx.fill();
    }

    // --- Hover glow ---
    if (isHovered && !selected) {
        ctx.beginPath();
        ctx.roundRect(x - 2, y - 2, width + 4, height + 4, radius + 2);
        const hGlow = ctx.createRadialGradient(
            x + width / 2, y + height / 2, 0,
            x + width / 2, y + height / 2, Math.max(width, height) * 0.8
        );
        hGlow.addColorStop(0, 'rgba(255, 255, 255, 0.04)');
        hGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = hGlow;
        ctx.fill();
    }

    // --- Text ---
    ctx.font = '500 14px Inter, sans-serif';
    ctx.fillStyle = '#f1f5f9';
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

    // Limit to 3 lines
    if (lines.length > 3) {
        lines = lines.slice(0, 3);
        lines[2] = lines[2].slice(0, -3) + '...';
    }

    const lineHeight = 20;
    const textStartY = y + height / 2 - ((lines.length - 1) * lineHeight) / 2 + 6;

    for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], x + width / 2, textStartY + i * lineHeight);
    }

    ctx.restore();
}

/**
 * Draw all notes.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array} notes
 * @param {string|null} hoveredNoteId
 */
export function drawAllNotes(ctx, notes, hoveredNoteId) {
    for (const note of notes) {
        drawNote(ctx, note, note.id === hoveredNoteId);
    }
}
