/**
 * VisualNote — Gesture Engine (Phase 3: Two-Hand)
 *
 * Processes up to 2 hands independently, classifies per-hand gestures,
 * and detects two-hand combos (zoom, pan, link).
 *
 * Hand Roles:
 *   Right Hand → Precision: cursor, select, click, drag notes
 *   Left Hand  → Workspace: pan, zoom, selection box
 *
 * Two-Hand Combos:
 *   Both pinching → Zoom (track distance between index tips)
 *   Both open     → Pan (track midpoint shift)
 *   Each pinching different note → Auto-link
 */

// --- Configuration ---
const PINCH_THRESHOLD = 0.06;
const PINCH_DEBOUNCE_MS = 120;
const RELEASE_THRESHOLD = 0.09;
const SMOOTHING_FACTOR = 0.4;
const GESTURE_CONFIRM_FRAMES = 3;

// Hand landmark indices
const THUMB_TIP = 4;
const INDEX_MCP = 5;
const INDEX_TIP = 8;
const MIDDLE_MCP = 9;
const MIDDLE_TIP = 12;
const RING_MCP = 13;
const RING_TIP = 16;
const PINKY_MCP = 17;
const PINKY_TIP = 20;

// ============================================================
// Per-Hand State Factory
// ============================================================

function createHandState() {
    return {
        detected: false,
        landmarks: null,
        cursor: { x: 0, y: 0 },
        smoothCursor: { x: 0, y: 0 },
        prevSmoothCursor: { x: 0, y: 0 },
        isPinching: false,
        pinchStartTime: 0,
        pinchConfirmed: false,
        pinchJustConfirmed: false,
        pinchJustReleased: false,
        gestureMode: 'none',        // 'point' | 'pinch' | 'fist' | 'open' | 'none'
        prevGestureMode: 'none',
        gestureCandidate: 'none',
        gestureCandidateFrames: 0,
    };
}

// --- Two independent hand states ---
const rightHand = createHandState();
const leftHand = createHandState();

// --- Two-hand combo state ---
const twoHand = {
    active: false,
    mode: 'none',  // 'zoom' | 'pan' | 'link' | 'none'
    interHandDist: 0,
    prevInterHandDist: 0,
    zoomFactor: 1,
    midpoint: { x: 0, y: 0 },
    prevMidpoint: { x: 0, y: 0 },
    panDelta: { x: 0, y: 0 },
};

// --- Global interaction mode ---
let interactionMode = 'idle';
// 'idle' | 'single_right' | 'single_left' | 'two_hand_zoom' | 'two_hand_pan' | 'two_hand_link'

// ============================================================
// Utilities
// ============================================================

function dist(a, b) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function isFingerExtended(lm, tipIdx, mcpIdx) {
    return lm[tipIdx].y < lm[mcpIdx].y - 0.02;
}

function isFingerCurled(lm, tipIdx, mcpIdx) {
    return lm[tipIdx].y > lm[mcpIdx].y + 0.01;
}

function smooth(current, previous, factor) {
    return previous + (current - previous) * factor;
}

/**
 * Classify a single hand's pose.
 */
function classifyGesture(lm) {
    const thumbIndexDist = dist(lm[THUMB_TIP], lm[INDEX_TIP]);

    if (thumbIndexDist < PINCH_THRESHOLD) {
        return 'pinch';
    }

    const indexExtended = isFingerExtended(lm, INDEX_TIP, INDEX_MCP);
    const middleExtended = isFingerExtended(lm, MIDDLE_TIP, MIDDLE_MCP);
    const ringCurled = isFingerCurled(lm, RING_TIP, RING_MCP);
    const pinkyCurled = isFingerCurled(lm, PINKY_TIP, PINKY_MCP);
    const indexCurled = isFingerCurled(lm, INDEX_TIP, INDEX_MCP);
    const middleCurled = isFingerCurled(lm, MIDDLE_TIP, MIDDLE_MCP);
    const ringExtended = isFingerExtended(lm, RING_TIP, RING_MCP);
    const pinkyExtended = isFingerExtended(lm, PINKY_TIP, PINKY_MCP);

    // Fist: all curled
    if (indexCurled && middleCurled && ringCurled && pinkyCurled) {
        return 'fist';
    }

    // Open hand: most fingers extended
    if (indexExtended && middleExtended && ringExtended && pinkyExtended) {
        return 'open';
    }

    // Point: index extended, rest curled
    if (indexExtended && middleCurled && ringCurled && pinkyCurled) {
        return 'point';
    }

    // Default: treat as point if index is up
    if (indexExtended) {
        return 'point';
    }

    return 'none';
}

// ============================================================
// Per-Hand Processing
// ============================================================

/**
 * Update a single hand's state from raw landmarks.
 */
function processOneHand(handState, landmarks, canvasWidth, canvasHeight) {
    if (!landmarks || landmarks.length < 21) {
        resetOneHand(handState);
        return;
    }

    handState.detected = true;
    handState.landmarks = landmarks;

    // --- Cursor (index finger tip, mirrored X) ---
    const indexTip = landmarks[INDEX_TIP];
    const rawX = (1 - indexTip.x) * canvasWidth;
    const rawY = indexTip.y * canvasHeight;

    handState.prevSmoothCursor.x = handState.smoothCursor.x;
    handState.prevSmoothCursor.y = handState.smoothCursor.y;

    handState.cursor.x = rawX;
    handState.cursor.y = rawY;

    handState.smoothCursor.x = smooth(rawX, handState.smoothCursor.x, SMOOTHING_FACTOR);
    handState.smoothCursor.y = smooth(rawY, handState.smoothCursor.y, SMOOTHING_FACTOR);

    // --- Gesture classification with confirmation frames ---
    const rawGesture = classifyGesture(landmarks);

    if (rawGesture === handState.gestureCandidate) {
        handState.gestureCandidateFrames++;
    } else {
        handState.gestureCandidate = rawGesture;
        handState.gestureCandidateFrames = 1;
    }

    handState.prevGestureMode = handState.gestureMode;

    if (handState.gestureCandidateFrames >= GESTURE_CONFIRM_FRAMES) {
        handState.gestureMode = handState.gestureCandidate;
    }

    // --- Pinch state machine ---
    handState.pinchJustConfirmed = false;
    handState.pinchJustReleased = false;

    const thumbIndexDist = dist(landmarks[THUMB_TIP], landmarks[INDEX_TIP]);
    const wasPinching = handState.isPinching;

    if (!wasPinching && thumbIndexDist < PINCH_THRESHOLD) {
        handState.isPinching = true;
        handState.pinchStartTime = performance.now();
        handState.pinchConfirmed = false;
    } else if (wasPinching && thumbIndexDist > RELEASE_THRESHOLD) {
        handState.isPinching = false;
        if (handState.pinchConfirmed) {
            handState.pinchJustReleased = true;
        }
        handState.pinchConfirmed = false;
        handState.pinchStartTime = 0;
    }

    if (handState.isPinching && !handState.pinchConfirmed) {
        const elapsed = performance.now() - handState.pinchStartTime;
        if (elapsed >= PINCH_DEBOUNCE_MS) {
            handState.pinchConfirmed = true;
            handState.pinchJustConfirmed = true;
        }
    }
}

function resetOneHand(handState) {
    handState.detected = false;
    handState.landmarks = null;
    handState.isPinching = false;
    handState.pinchConfirmed = false;
    handState.pinchJustConfirmed = false;
    handState.pinchJustReleased = false;
    handState.gestureMode = 'none';
    handState.prevGestureMode = 'none';
    handState.gestureCandidate = 'none';
    handState.gestureCandidateFrames = 0;
}

// ============================================================
// Two-Hand Combo Processing
// ============================================================

function processTwoHandCombos(canvasWidth, canvasHeight) {
    if (!rightHand.detected || !leftHand.detected) {
        resetTwoHand();
        return;
    }

    const rCursor = rightHand.smoothCursor;
    const lCursor = leftHand.smoothCursor;

    // --- Inter-hand distance (screen space) ---
    twoHand.prevInterHandDist = twoHand.interHandDist;
    twoHand.interHandDist = Math.sqrt(
        (rCursor.x - lCursor.x) ** 2 + (rCursor.y - lCursor.y) ** 2
    );

    // --- Midpoint ---
    twoHand.prevMidpoint.x = twoHand.midpoint.x;
    twoHand.prevMidpoint.y = twoHand.midpoint.y;
    twoHand.midpoint.x = (rCursor.x + lCursor.x) / 2;
    twoHand.midpoint.y = (rCursor.y + lCursor.y) / 2;

    // --- Detect two-hand mode ---
    const bothPinching = rightHand.pinchConfirmed && leftHand.pinchConfirmed;
    const bothOpen = rightHand.gestureMode === 'open' && leftHand.gestureMode === 'open';

    if (bothPinching) {
        twoHand.active = true;
        twoHand.mode = 'zoom';

        // Zoom factor = ratio of current to previous distance
        if (twoHand.prevInterHandDist > 10) {
            twoHand.zoomFactor = twoHand.interHandDist / twoHand.prevInterHandDist;
            // Dampen for stability
            twoHand.zoomFactor = 1 + (twoHand.zoomFactor - 1) * 0.6;
        } else {
            twoHand.zoomFactor = 1;
        }
    } else if (bothOpen) {
        twoHand.active = true;
        twoHand.mode = 'pan';

        // Pan delta
        if (twoHand.prevMidpoint.x !== 0 || twoHand.prevMidpoint.y !== 0) {
            twoHand.panDelta.x = twoHand.midpoint.x - twoHand.prevMidpoint.x;
            twoHand.panDelta.y = twoHand.midpoint.y - twoHand.prevMidpoint.y;
        } else {
            twoHand.panDelta.x = 0;
            twoHand.panDelta.y = 0;
        }
    } else {
        // Check for two-hand link: right pinching + left pinching different notes
        // (This is detected by main.js, we just flag the possibility)
        if (rightHand.pinchConfirmed || leftHand.pinchConfirmed) {
            twoHand.active = false;
            twoHand.mode = 'none';
        } else {
            twoHand.active = false;
            twoHand.mode = 'none';
        }
        twoHand.zoomFactor = 1;
        twoHand.panDelta.x = 0;
        twoHand.panDelta.y = 0;
    }
}

function resetTwoHand() {
    twoHand.active = false;
    twoHand.mode = 'none';
    twoHand.interHandDist = 0;
    twoHand.prevInterHandDist = 0;
    twoHand.zoomFactor = 1;
    twoHand.midpoint.x = 0;
    twoHand.midpoint.y = 0;
    twoHand.prevMidpoint.x = 0;
    twoHand.prevMidpoint.y = 0;
    twoHand.panDelta.x = 0;
    twoHand.panDelta.y = 0;
}

// ============================================================
// Resolve Interaction Mode (Priority Order)
// ============================================================

function resolveInteractionMode() {
    // Priority 1: Two-hand combos
    if (twoHand.active) {
        if (twoHand.mode === 'zoom') {
            interactionMode = 'two_hand_zoom';
            return;
        }
        if (twoHand.mode === 'pan') {
            interactionMode = 'two_hand_pan';
            return;
        }
    }

    // Priority 2: Right hand (editing)
    if (rightHand.detected && rightHand.gestureMode !== 'none') {
        interactionMode = 'single_right';
        return;
    }

    // Priority 3: Left hand (workspace only)
    if (leftHand.detected && leftHand.gestureMode !== 'none') {
        interactionMode = 'single_left';
        return;
    }

    interactionMode = 'idle';
}

// ============================================================
// Public API
// ============================================================

/**
 * Process all hands from MediaPipe results.
 * @param {object} results - MediaPipe Hands results object
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 */
export function processAllHands(results, canvasWidth, canvasHeight) {
    // MediaPipe provides multiHandLandmarks and multiHandedness arrays
    const landmarks = results?.multiHandLandmarks || [];
    const handedness = results?.multiHandedness || [];

    // Reset both hands by default
    let rightLandmarks = null;
    let leftLandmarks = null;

    // Identify hands by handedness label
    // Note: MediaPipe "Right" label in selfie mode = user's right hand
    for (let i = 0; i < landmarks.length; i++) {
        const label = handedness[i]?.label || '';
        // MediaPipe in selfie/mirrored mode: "Right" = user's left, "Left" = user's right
        // We mirror X in cursor calculation, so we need to swap labels
        if (label === 'Left') {
            rightLandmarks = landmarks[i]; // MediaPipe "Left" = user's Right hand
        } else if (label === 'Right') {
            leftLandmarks = landmarks[i];  // MediaPipe "Right" = user's Left hand
        }
    }

    // If only one hand and we can't identify, default to right
    if (landmarks.length === 1 && !rightLandmarks && !leftLandmarks) {
        rightLandmarks = landmarks[0];
    }

    processOneHand(rightHand, rightLandmarks, canvasWidth, canvasHeight);
    processOneHand(leftHand, leftLandmarks, canvasWidth, canvasHeight);
    processTwoHandCombos(canvasWidth, canvasHeight);
    resolveInteractionMode();
}

/**
 * Get the full multi-hand state for consumption by other modules.
 */
export function getMultiHandState() {
    return {
        mode: interactionMode,
        right: {
            detected: rightHand.detected,
            cursor: { x: rightHand.smoothCursor.x, y: rightHand.smoothCursor.y },
            prevCursor: { x: rightHand.prevSmoothCursor.x, y: rightHand.prevSmoothCursor.y },
            cursorDelta: {
                x: rightHand.smoothCursor.x - rightHand.prevSmoothCursor.x,
                y: rightHand.smoothCursor.y - rightHand.prevSmoothCursor.y,
            },
            gestureMode: rightHand.gestureMode,
            isPinching: rightHand.isPinching,
            pinchConfirmed: rightHand.pinchConfirmed,
            pinchJustConfirmed: rightHand.pinchJustConfirmed,
            pinchJustReleased: rightHand.pinchJustReleased,
            landmarks: rightHand.landmarks,
        },
        left: {
            detected: leftHand.detected,
            cursor: { x: leftHand.smoothCursor.x, y: leftHand.smoothCursor.y },
            prevCursor: { x: leftHand.prevSmoothCursor.x, y: leftHand.prevSmoothCursor.y },
            cursorDelta: {
                x: leftHand.smoothCursor.x - leftHand.prevSmoothCursor.x,
                y: leftHand.smoothCursor.y - leftHand.prevSmoothCursor.y,
            },
            gestureMode: leftHand.gestureMode,
            isPinching: leftHand.isPinching,
            pinchConfirmed: leftHand.pinchConfirmed,
            pinchJustConfirmed: leftHand.pinchJustConfirmed,
            pinchJustReleased: leftHand.pinchJustReleased,
            landmarks: leftHand.landmarks,
        },
        twoHand: {
            active: twoHand.active,
            mode: twoHand.mode,
            zoomFactor: twoHand.zoomFactor,
            panDelta: { x: twoHand.panDelta.x, y: twoHand.panDelta.y },
            midpoint: { x: twoHand.midpoint.x, y: twoHand.midpoint.y },
            interHandDist: twoHand.interHandDist,
        },
    };
}

/**
 * Reset all gesture state.
 */
export function resetAllHands() {
    resetOneHand(rightHand);
    resetOneHand(leftHand);
    resetTwoHand();
    interactionMode = 'idle';
}
