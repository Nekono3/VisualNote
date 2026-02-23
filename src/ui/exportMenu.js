/**
 * VisualNote — Export Menu (UI Layer)
 * Canvas-rendered dropdown menu for export options.
 * Appears next to the Download toolbar button.
 * Glassmorphism styling matching the toolbar.
 */

// --- Configuration ---
const MENU_WIDTH = 200;
const ITEM_HEIGHT = 42;
const MENU_PADDING = 8;
const MENU_RADIUS = 14;
const HOVER_COLOR = 'rgba(99, 102, 241, 0.25)';

const MENU_ITEMS = [
    { id: 'json', label: '💾 Save Project (.json)', desc: 'Full workspace state' },
    { id: 'png', label: '📸 Export as PNG', desc: 'Notes only, white background' },
];

// --- State ---
let isOpen = false;
let menuX = 0;
let menuY = 0;
let hoveredItemId = null;
let entryAnimation = 0;    // 0→1 for fade-in

/**
 * Open the export menu at a position (next to the download button).
 * @param {number} x - Screen X position (right edge of download button)
 * @param {number} y - Screen Y position (top of download button)
 */
export function openExportMenu(x, y) {
    menuX = x + 12;  // Offset from button
    menuY = y;
    isOpen = true;
    hoveredItemId = null;
    entryAnimation = 0;
}

/**
 * Close the export menu.
 */
export function closeExportMenu() {
    isOpen = false;
    hoveredItemId = null;
    entryAnimation = 0;
}

/**
 * Toggle the export menu.
 */
export function toggleExportMenu(x, y) {
    if (isOpen) {
        closeExportMenu();
    } else {
        openExportMenu(x, y);
    }
}

/**
 * Check if the export menu is open.
 */
export function isExportMenuOpen() {
    return isOpen;
}

/**
 * Check hover state for menu items.
 * @param {object} cursor - { x, y }
 * @returns {string|null} Hovered item ID or null
 */
export function checkExportMenuHover(cursor) {
    if (!isOpen) return null;

    const totalHeight = MENU_ITEMS.length * ITEM_HEIGHT + MENU_PADDING * 2;

    // Check if cursor is within menu bounds
    if (
        cursor.x < menuX || cursor.x > menuX + MENU_WIDTH ||
        cursor.y < menuY || cursor.y > menuY + totalHeight
    ) {
        hoveredItemId = null;
        return null;
    }

    // Find which item is hovered
    const relY = cursor.y - menuY - MENU_PADDING;
    const itemIndex = Math.floor(relY / ITEM_HEIGHT);

    if (itemIndex >= 0 && itemIndex < MENU_ITEMS.length) {
        hoveredItemId = MENU_ITEMS[itemIndex].id;
        return hoveredItemId;
    }

    hoveredItemId = null;
    return null;
}

/**
 * Check for a click on a menu item.
 * @param {object} cursor - { x, y }
 * @param {boolean} pinchJustConfirmed
 * @returns {string|null} Selected item ID
 */
export function checkExportMenuClick(cursor, pinchJustConfirmed) {
    if (!isOpen || !pinchJustConfirmed) return null;

    const hovered = checkExportMenuHover(cursor);
    if (hovered) {
        closeExportMenu();
        return hovered;
    }

    // Clicked outside menu = close
    closeExportMenu();
    return null;
}

/**
 * Draw the export menu on the canvas.
 * @param {CanvasRenderingContext2D} ctx
 */
export function drawExportMenu(ctx) {
    if (!isOpen) return;

    // Animate entry
    entryAnimation = Math.min(1, entryAnimation + 0.12);
    const alpha = entryAnimation;
    const scale = 0.95 + 0.05 * alpha;

    const totalHeight = MENU_ITEMS.length * ITEM_HEIGHT + MENU_PADDING * 2;

    ctx.save();

    // Transform for animation
    const cx = menuX + MENU_WIDTH / 2;
    const cy = menuY + totalHeight / 2;
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);
    ctx.globalAlpha = alpha;

    // Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 8;

    // Menu background
    ctx.beginPath();
    ctx.roundRect(menuX, menuY, MENU_WIDTH, totalHeight, MENU_RADIUS);
    ctx.fillStyle = 'rgba(15, 15, 30, 0.92)';
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw items
    for (let i = 0; i < MENU_ITEMS.length; i++) {
        const item = MENU_ITEMS[i];
        const itemY = menuY + MENU_PADDING + i * ITEM_HEIGHT;
        const isHovered = hoveredItemId === item.id;

        // Hover background
        if (isHovered) {
            ctx.beginPath();
            ctx.roundRect(menuX + 4, itemY, MENU_WIDTH - 8, ITEM_HEIGHT, 8);
            ctx.fillStyle = HOVER_COLOR;
            ctx.fill();
        }

        // Item label
        ctx.font = '500 13px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = isHovered ? '#e2e8f0' : '#94a3b8';
        ctx.fillText(item.label, menuX + 14, itemY + ITEM_HEIGHT * 0.38);

        // Item description
        ctx.font = '400 10px Inter, sans-serif';
        ctx.fillStyle = isHovered ? 'rgba(148, 163, 184, 0.8)' : 'rgba(148, 163, 184, 0.5)';
        ctx.fillText(item.desc, menuX + 14, itemY + ITEM_HEIGHT * 0.72);

        // Separator (except last)
        if (i < MENU_ITEMS.length - 1) {
            ctx.beginPath();
            ctx.moveTo(menuX + 14, itemY + ITEM_HEIGHT);
            ctx.lineTo(menuX + MENU_WIDTH - 14, itemY + ITEM_HEIGHT);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }

    ctx.restore();
}

/**
 * Check if cursor is within menu bounds (for preventing other interactions).
 */
export function isCursorInExportMenu(cursor) {
    if (!isOpen) return false;
    const totalHeight = MENU_ITEMS.length * ITEM_HEIGHT + MENU_PADDING * 2;
    return (
        cursor.x >= menuX && cursor.x <= menuX + MENU_WIDTH &&
        cursor.y >= menuY && cursor.y <= menuY + totalHeight
    );
}
