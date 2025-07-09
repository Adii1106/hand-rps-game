import React, { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import * as tf from "@tensorflow/tfjs";
import * as handPoseDetection from "@tensorflow-models/hand-pose-detection";
import { cropHandFromVideo } from "./handCropUtils";

const GESTURES = ["Rock", "Paper", "Scissors"];
const PADDING = 30; // pixels of padding around the bounding box

export default function DataCollector() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [handModel, setHandModel] = useState(null);
  const [selectedGesture, setSelectedGesture] = useState(GESTURES[0]);
  const [croppedImgDataUrl, setCroppedImgDataUrl] = useState(null);
  const [status, setStatus] = useState("");
  const [noHand, setNoHand] = useState(false);
  const [lastCropBox, setLastCropBox] = useState(null);
  const [imageCounts, setImageCounts] = useState({ Rock: 0, Paper: 0, Scissors: 0 });

  // Load hand detection model
  React.useEffect(() => {
    handPoseDetection.createDetector(
      handPoseDetection.SupportedModels.MediaPipeHands,
      { runtime: 'tfjs', modelType: 'lite' }
    ).then(setHandModel);
  }, []); 

  // Fetch image counts from backend
  const fetchCounts = async () => {
    try {
      const res = await fetch('/api/image-counts');
      if (res.ok) {
        const data = await res.json();
        setImageCounts(data);
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    fetchCounts();
  }, []);

  // Draw keypoints and bounding box, and overlay the crop area
  const drawHand = (hands, video) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    if (hands.length > 0) {
      const keypoints = hands[0].keypoints;
      ctx.fillStyle = "#00FF00";
      keypoints.forEach(pt => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4, 0, 2 * Math.PI);
        ctx.fill();
      });
      const xs = keypoints.map(pt => pt.x);
      const ys = keypoints.map(pt => pt.y);
      let xMin = Math.max(0, Math.floor(Math.min(...xs) - PADDING));
      let xMax = Math.min(ctx.canvas.width, Math.floor(Math.max(...xs) + PADDING));
      let yMin = Math.max(0, Math.floor(Math.min(...ys) - PADDING));
      let yMax = Math.min(ctx.canvas.height, Math.floor(Math.max(...ys) + PADDING));
      let width = xMax - xMin;
      let height = yMax - yMin;
      ctx.strokeStyle = "#FF0000";
      ctx.lineWidth = 2;
      ctx.strokeRect(xMin, yMin, width, height);
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = "#007bff";
      ctx.fillRect(xMin, yMin, width, height);
      ctx.restore();
      // Save the crop box for use in cropping (in display coordinates)
      setLastCropBox({ x: xMin, y: yMin, width, height });
    } else {
      setLastCropBox(null);
    }
  };

  // Detect and crop hand
  const detectAndCrop = async () => {
    setNoHand(false);
    if (!handModel || !webcamRef.current || !webcamRef.current.video) return;
    const video = webcamRef.current.video;
    const hands = await handModel.estimateHands(video);
    drawHand(hands, video);
    if (hands.length > 0 && lastCropBox) {
      // Use shared cropping utility
      const keypoints = hands[0].keypoints;
      const { previewDataUrl } = await cropHandFromVideo({
        keypoints,
        canvas: canvasRef.current,
        video,
        padding: PADDING,
        targetSize: 224
      });
      setCroppedImgDataUrl(previewDataUrl);
    } else {
      setCroppedImgDataUrl(null);
      setNoHand(true);
    }
  };

  // Draw hand landmarks in real time
  React.useEffect(() => {
    let animationId;
    const drawLoop = async () => {
      if (!handModel || !webcamRef.current || !webcamRef.current.video) {
        animationId = requestAnimationFrame(drawLoop);
        return;
      }
      const video = webcamRef.current.video;
      const hands = await handModel.estimateHands(video);
      drawHand(hands, video);
      animationId = requestAnimationFrame(drawLoop);
    };
    drawLoop();
    return () => cancelAnimationFrame(animationId);
  }, [handModel]);

  // Save image to backend
  const handleSave = async () => {
    if (!croppedImgDataUrl) {
      setStatus("No hand detected!");
      return;
    }
    setStatus("Saving...");
    // Send to backend
    const res = await fetch("/api/save-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gesture: selectedGesture,
        imageData: croppedImgDataUrl
      })
    });
    if (res.ok) {
      setStatus("Saved!");
      fetchCounts(); // update counter after save
    } else {
      setStatus("Failed to save.");
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: "2rem" }}>
      <h2>Data Collector for RPS</h2>
      <div>
        <label>Gesture: </label>
        <select value={selectedGesture} onChange={e => setSelectedGesture(e.target.value)}>
          {GESTURES.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <span style={{ marginLeft: 20 }}>
          {GESTURES.map(g => (
            <span key={g} style={{ marginRight: 10 }}>
              {g}: {imageCounts[g] || 0}
            </span>
          ))}
        </span>
      </div>
      <div style={{ margin: "2rem auto", width: 400, position: "relative" }}>
        <Webcam
          ref={webcamRef}
          audio={false}
          width={400}
          height={300}
          screenshotFormat="image/jpeg"
          mirrored={false}
        />
        <canvas
          ref={canvasRef}
          width={400}
          height={300}
          style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
        />
        <button onClick={detectAndCrop} style={{ marginTop: 10 }}>Preview Cropped Hand</button>
      </div>
      {noHand && <div style={{ color: 'red', marginTop: 10 }}>No hand detected! Please adjust your hand position.</div>}
      {croppedImgDataUrl && (
        <div style={{ marginTop: 20 }}>
          <div>Cropped Image Preview:</div>
          <img src={croppedImgDataUrl} alt="Cropped Hand" style={{ border: '2px solid #007bff', borderRadius: 8, marginTop: 8 }} />
        </div>
      )}
      <div style={{ marginTop: 20 }}>
        <button onClick={handleSave} disabled={!croppedImgDataUrl}>Save Image</button>
      </div>
      <div style={{ marginTop: 10, color: 'green' }}>{status}</div>
    </div>
  );
} 