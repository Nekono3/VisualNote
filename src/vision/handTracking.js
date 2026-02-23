/**
 * VisualNote — Hand Tracking (Vision Layer)
 * Sets up MediaPipe Hands for real-time hand landmark detection.
 */

/**
 * Initialize MediaPipe Hands model and connect it to the video stream.
 * @param {HTMLVideoElement} videoElement
 * @param {Function} onResults - Callback receiving hand detection results each frame
 * @param {Function} onStatusUpdate - Callback for loading status messages
 * @returns {Promise<{hands: object, camera: object}>}
 */
export async function initHandTracking(videoElement, onResults, onStatusUpdate) {
    onStatusUpdate('Loading hand tracking model...');

    const hands = new window.Hands({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`;
        },
    });

    hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.6,
    });

    hands.onResults(onResults);

    onStatusUpdate('Initializing hand tracker...');
    await hands.initialize();

    onStatusUpdate('Starting camera stream...');

    const camera = new window.Camera(videoElement, {
        onFrame: async () => {
            await hands.send({ image: videoElement });
        },
        width: 1280,
        height: 720,
    });

    await camera.start();
    onStatusUpdate('Ready!');

    return { hands, camera };
}
