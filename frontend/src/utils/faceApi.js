import * as faceapi from "face-api.js";

const MODEL_URL = "/models";
let modelsLoaded = false;

/**
 * Load all required face-api.js models
 */
export const loadFaceModels = async () => {
  if (modelsLoaded) return;
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);
  modelsLoaded = true;
};

/**
 * Detect a single face and return its 128-d descriptor
 * @param {HTMLVideoElement|HTMLImageElement|HTMLCanvasElement} mediaElement
 * @returns {Float32Array | null}
 */
export const getFaceDescriptor = async (mediaElement) => {
  await loadFaceModels();
  const detection = await faceapi
    .detectSingleFace(mediaElement, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();

  return detection ? detection.descriptor : null;
};

/**
 * Compare two face descriptors
 * @param {number[]} desc1
 * @param {number[]} desc2
 * @param {number} threshold
 * @returns {{ match: boolean, distance: number }}
 */
export const compareFaces = (desc1, desc2, threshold = 0.5) => {
  if (!desc1 || !desc2 || desc1.length !== desc2.length) {
    return { match: false, distance: Infinity };
  }
  const distance = faceapi.euclideanDistance(
    new Float32Array(desc1),
    new Float32Array(desc2)
  );
  return { match: distance < threshold, distance };
};

/**
 * Draw detections on a canvas overlay
 * @param {HTMLCanvasElement} canvas
 * @param {HTMLVideoElement} video
 * @param {object} detections
 */
export const drawDetections = (canvas, video, detections) => {
  const dims = faceapi.matchDimensions(canvas, video, true);
  const resized = faceapi.resizeResults(detections, dims);
  faceapi.draw.drawDetections(canvas, resized);
  faceapi.draw.drawFaceLandmarks(canvas, resized);
};
