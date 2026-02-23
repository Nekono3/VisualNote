/**
 * VisualNote — Toolbar (UI Layer)
 * Floating toolbar with gesture-based interaction.
 * New tool set for the workspace engine.
 */

// --- Configuration ---
const BUTTON_WIDTH = 68;
const BUTTON_HEIGHT = 68;
const BUTTON_GAP = 10;
const TOOLBAR_PADDING = 16;
const HOVER_DELAY_MS = 250;

const TOOLS = [
    { id: 'select', label: 'Select', icon: '👆' },
    { id: 'note', label: 'Note', icon: '📝' },
    { id: 'link', label: 'Link', icon: '🔗' },
    { id: 'delete', label: 'Delete', icon: '🗑️' },
    { id: 'download', label: 'Export', icon: '💾' },
    { id: 'fit', label: 'Fit View', icon: '🔍' },
    { id: 'toggle', label: 'Hide', icon: '👁️' },
];

let toolbarButtons = [];
let toolbarMinimized = false;
let activeTool = 'select';

/**
 * Create the toolbar button layout (left side, vertically centered).
 */
export function createToolbar(canvasHeight) {
    const totalHeight = TOOLS.length * (BUTTON_HEIGHT + BUTTON_GAP) - BUTTON_GAP;
    const startY = (canvasHeight - totalHeight) / 2;
    const startX = TOOLBAR_PADDING + 6;

    toolbarButtons = TOOLS.map((tool, i) => ({
        ...tool,
        x: startX,
        y: startY + i * (BUTTON_HEIGHT + BUTTON_GAP),
        width: BUTTON_WIDTH,
        height: BUTTON_HEIGHT,
        isHovered: false,
        hoverStartTime: 0,
        hoverProgress: 0,
        lastClickTime: 0,
    }));

    return toolbarButtons;
}

/**
 * Update toolbar layout on resize.
 */
export function updateToolbarLayout(canvasHeight) {
    const totalHeight = toolbarButtons.length * (BUTTON_HEIGHT + BUTTON_GAP) - BUTTON_GAP;
    const startY = (canvasHeight - totalHeight) / 2;

    toolbarButtons.forEach((btn, i) => {
        btn.y = startY + i * (BUTTON_HEIGHT + BUTTON_GAP);
    });
}

/**
 * Check hover state for all buttons.
 * @returns {object|null} The hovered button or null
 */
export function checkToolbarHover(cursor) {
    if (toolbarMinimized) {
        // Only check the toggle button
        const toggleBtn = toolbarButtons.find(b => b.id === 'toggle');
        if (!toggleBtn) return null;
        return checkSingleButtonHover(toggleBtn, cursor);
    }

    let hoveredBtn = null;
    const now = performance.now();

    for (const btn of toolbarButtons) {
        const inside = isInsideButton(cursor, btn);

        if (inside) {
            if (!btn.isHovered) {
                btn.isHovered = true;
                btn.hoverStartTime = now;
            }
            btn.hoverProgress = Math.min((now - btn.hoverStartTime) / 300, 1);
            hoveredBtn = btn;
        } else {
            btn.isHovered = false;
            btn.hoverStartTime = 0;
            btn.hoverProgress = Math.max((btn.hoverProgress || 0) - 0.08, 0);
        }
    }

    return hoveredBtn;
}

function checkSingleButtonHover(btn, cursor) {
    const now = performance.now();
    const inside = isInsideButton(cursor, btn);
    if (inside) {
        if (!btn.isHovered) {
            btn.isHovered = true;
            btn.hoverStartTime = now;
        }
        btn.hoverProgress = Math.min((now - btn.hoverStartTime) / 300, 1);
        return btn;
    } else {
        btn.isHovered = false;
        btn.hoverProgress = Math.max((btn.hoverProgress || 0) - 0.08, 0);
        return null;
    }
}

function isInsideButton(cursor, btn) {
    return (
        cursor.x >= btn.x &&
        cursor.x <= btn.x + btn.width &&
        cursor.y >= btn.y &&
        cursor.y <= btn.y + btn.height
    );
}

/**
 * Check if a pinch click should trigger a toolbar action.
 * @returns {string|null} The action triggered, or null
 */
export function checkToolbarClick(cursor, pinchJustConfirmed) {
    if (!pinchJustConfirmed) return null;

    const now = performance.now();

    // When minimized, only toggle is clickable
    const buttonsToCheck = toolbarMinimized
        ? toolbarButtons.filter(b => b.id === 'toggle')
        : toolbarButtons;

    for (const btn of buttonsToCheck) {
        if (!btn.isHovered) continue;

        const hoverDuration = now - btn.hoverStartTime;
        if (hoverDuration < HOVER_DELAY_MS) continue;

        if (now - btn.lastClickTime < 500) continue;

        btn.lastClickTime = now;

        // Handle toggle internally
        if (btn.id === 'toggle') {
            toolbarMinimized = !toolbarMinimized;
            btn.label = toolbarMinimized ? 'Show' : 'Hide';
            btn.icon = toolbarMinimized ? '👁️‍🗨️' : '👁️';
            return null; // Internal action, no external side effect
        }

        // For other tools, just switch the active tool
        if (btn.id !== 'fit' && btn.id !== 'delete' && btn.id !== 'download') {
            activeTool = btn.id;
        }

        return btn.id; // Return action for main.js to handle
    }

    return null;
}

/**
 * Draw a toolbar button on the canvas.
 */
export function drawToolbarButton(ctx, button, isActive) {
    const { x, y, width, height, label, icon, isHovered, hoverProgress } = button;
    const radius = 14;
    const hp = hoverProgress || 0;

    ctx.save();

    // Background
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);

    if (isActive) {
        ctx.fillStyle = 'rgba(99, 102, 241, 0.35)';
    } else if (isHovered) {
        ctx.fillStyle = `rgba(99, 102, 241, ${0.1 + hp * 0.15})`;
    } else {
        ctx.fillStyle = 'rgba(15, 15, 25, 0.6)';
    }
    ctx.fill();

    // Border
    ctx.strokeStyle = isActive
        ? 'rgba(99, 102, 241, 0.7)'
        : isHovered
            ? `rgba(255, 255, 255, ${0.08 + hp * 0.12})`
            : 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Hover glow
    if (isHovered && hp > 0) {
        const glowGrad = ctx.createRadialGradient(
            x + width / 2, y + height / 2, 0,
            x + width / 2, y + height / 2, width * 0.8
        );
        glowGrad.addColorStop(0, `rgba(99, 102, 241, ${0.08 * hp})`);
        glowGrad.addColorStop(1, 'rgba(99, 102, 241, 0)');
        ctx.beginPath();
        ctx.roundRect(x - 10, y - 10, width + 20, height + 20, radius + 10);
        ctx.fillStyle = glowGrad;
        ctx.fill();
    }

    ctx.restore();

    // Icon
    ctx.font = `${Math.round(height * 0.34)}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(icon, x + width / 2, y + height * 0.42);

    // Label
    ctx.font = `500 ${Math.round(height * 0.15)}px Inter, sans-serif`;
    ctx.fillStyle = isActive ? '#c7d2fe' : isHovered ? '#e2e8f0' : '#94a3b8';
    ctx.fillText(label, x + width / 2, y + height * 0.76);
}

/**
 * Get toolbar buttons list.
 */
export function getToolbarButtons() {
    return toolbarButtons;
}

/**
 * Get a toolbar button by ID.
 */
export function getButtonById(id) {
    return toolbarButtons.find(b => b.id === id) || null;
}

/**
 * Get the active tool.
 */
export function getActiveTool() {
    return activeTool;
}

/**
 * Check if toolbar is minimized.
 */
export function isToolbarMinimized() {
    return toolbarMinimized;
}
