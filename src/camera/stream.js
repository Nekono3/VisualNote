/**
 * VisualNote — Camera Stream
 * Handles webcam access and video stream initialization.
 */

/**
 * Initialize the camera and attach the stream to the video element.
 * @param {HTMLVideoElement} videoElement
 * @returns {Promise<MediaStream>}
 */
export async function initCamera(videoElement) {
    const constraints = {
        video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user',
            frameRate: { ideal: 30 },
        },
        audio: false,
    };

    try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        videoElement.srcObject = stream;

        return new Promise((resolve, reject) => {
            videoElement.onloadedmetadata = () => {
                videoElement.play()
                    .then(() => resolve(stream))
                    .catch(reject);
            };
            videoElement.onerror = () => reject(new Error('Video element error'));
        });
    } catch (err) {
        if (err.name === 'NotAllowedError') {
            throw new Error('PERMISSION_DENIED');
        } else if (err.name === 'NotFoundError') {
            throw new Error('NO_CAMERA');
        } else {
            throw new Error(`CAMERA_ERROR: ${err.message}`);
        }
    }
}
