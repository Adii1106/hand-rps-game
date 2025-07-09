import * as tf from '@tensorflow/tfjs';

/**
 * Crop the hand region from the video based on keypoints and canvas, matching DataCollector logic.
 * @param {Object[]} keypoints - Array of {x, y} hand keypoints from MediaPipe.
 * @param {HTMLCanvasElement} canvas - The canvas element used for overlay.
 * @param {HTMLVideoElement} video - The video element from webcam.
 * @param {number} padding - Padding (in px) to add around the bounding box.
 * @param {number} targetSize - The size to resize the cropped image for the model (e.g., 224).
 * @returns {Promise<{tensor: tf.Tensor4D, previewDataUrl: string}>} - The cropped, resized tensor and a preview image data URL.
 */
export async function cropHandFromVideo({ keypoints, canvas, video, padding = 30, targetSize = 224 }) {
  // Compute bounding box in canvas coordinates
  const xs = keypoints.map(pt => pt.x);
  const ys = keypoints.map(pt => pt.y);
  let xMin = Math.max(0, Math.floor(Math.min(...xs) - padding));
  let xMax = Math.min(canvas.width, Math.floor(Math.max(...xs) + padding));
  let yMin = Math.max(0, Math.floor(Math.min(...ys) - padding));
  let yMax = Math.min(canvas.height, Math.floor(Math.max(...ys) + padding));
  let width = xMax - xMin;
  let height = yMax - yMin;
  // Map canvas crop box to video pixel coordinates
  const videoRect = video.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();
  const offsetX = videoRect.left - canvasRect.left;
  const offsetY = videoRect.top - canvasRect.top;
  const scaleX = video.videoWidth / videoRect.width;
  const scaleY = video.videoHeight / videoRect.height;
  const cropX = Math.floor((xMin - offsetX) * scaleX);
  const cropY = Math.floor((yMin - offsetY) * scaleY);
  const cropW = Math.floor(width * scaleX);
  const cropH = Math.floor(height * scaleY);
  // Clamp to video frame
  const safeW = Math.min(cropW, video.videoWidth - cropX);
  const safeH = Math.min(cropH, video.videoHeight - cropY);
  // Crop and resize
  const imgTensor = tf.browser.fromPixels(video);
  const croppedImg = imgTensor.slice([cropY, cropX, 0], [safeH, safeW, 3]);
  const resized = tf.image.resizeBilinear(croppedImg, [targetSize, targetSize]).div(tf.scalar(255.0)).expandDims();
  // For preview: 300x300, uint8
  const resizedForDisplay = tf.image.resizeBilinear(croppedImg, [300, 300]).toInt();
  const pixels = await tf.browser.toPixels(resizedForDisplay);
  const previewCanvas = document.createElement('canvas');
  previewCanvas.width = 300;
  previewCanvas.height = 300;
  const previewCtx = previewCanvas.getContext('2d');
  const imageData = previewCtx.createImageData(300, 300);
  imageData.data.set(pixels);
  previewCtx.putImageData(imageData, 0, 0);
  const previewDataUrl = previewCanvas.toDataURL();
  tf.dispose([imgTensor, croppedImg, resizedForDisplay]);
  return { tensor: resized, previewDataUrl };
} 