import React, { useRef, useEffect, useState } from "react";
import Webcam from "react-webcam";
import * as tf from "@tensorflow/tfjs";
import * as handPoseDetection from "@tensorflow-models/hand-pose-detection";

const MODEL_URL = "/model/model.json";
const GESTURE_LABELS = ["Paper", "Rock", "Scissors"]; // Your gesture model's labels
const BOT_AVATARS = [
  "https://robohash.org/bot1.png?size=64x64",
  "https://robohash.org/bot2.png?size=64x64"
];

const PADDING = 30; // Match DataCollector

// --- Helper Functions ---
function getBotMove() {
  return GESTURE_LABELS[Math.floor(Math.random() * GESTURE_LABELS.length)];
}

function decideWinner(player, bot) {
  if (player === bot) return "Draw";
  if (
    (player === "Rock" && bot === "Scissors") ||
    (player === "Paper" && bot === "Rock") ||
    (player === "Scissors" && bot === "Paper")
  ) {
    return "Player";
  }
  return "Bot";
}

// --- Main Component ---
export default function GameArea({ avatar, rounds, onGameEnd }) {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [gestureModel, setGestureModel] = useState(null);
  const [handModel, setHandModel] = useState(null);

  // Game State
  const [playerScore, setPlayerScore] = useState(0);
  const [botScore, setBotScore] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  const [finalWinner, setFinalWinner] = useState("");
  const [botAvatar] = useState(BOT_AVATARS[Math.floor(Math.random() * BOT_AVATARS.length)]);

  // Round State
  const [roundPhase, setRoundPhase] = useState("waiting"); // 'waiting', 'countdown', 'result', 'finished'
  const [countdown, setCountdown] = useState(3);
  const [playerMove, setPlayerMove] = useState("");
  const [botMove, setBotMove] = useState("");
  const [roundResult, setRoundResult] = useState("");
  const [livePrediction, setLivePrediction] = useState("");
  const [predictionBuffer, setPredictionBuffer] = useState([]);

  // Add a state to track if the result is being shown
  const [showResult, setShowResult] = useState(false);

  // Add a state to track the cropped image data URL
  const [croppedImgDataUrl, setCroppedImgDataUrl] = useState(null);

  // Load models
  useEffect(() => {
    const loadModels = async () => {
      tf.loadLayersModel(MODEL_URL).then(setGestureModel);
      const handDetector = await handPoseDetection.createDetector(
        handPoseDetection.SupportedModels.MediaPipeHands,
        { runtime: 'tfjs', modelType: 'lite' }
      );
      setHandModel(handDetector);
    };
    loadModels();
  }, []);

  // Main detection loop
  useEffect(() => {
    if (!gestureModel || !handModel) return;
    let stopped = false;
    const runDetection = async () => {
      if (stopped) return;
      const video = webcamRef.current?.video;
      if (!video || video.readyState !== 4) {
        requestAnimationFrame(runDetection);
        return;
      }
      const hands = await handModel.estimateHands(video);
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      if (hands.length > 0) {
        // Draw keypoints and bounding box with padding (like DataCollector)
        const keypoints = hands[0].keypoints;
        if (ctx) {
          ctx.fillStyle = "#00FF00";
          keypoints.forEach(pt => {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 4, 0, 2 * Math.PI);
            ctx.fill();
          });
        }
        const xs = keypoints.map(pt => pt.x);
        const ys = keypoints.map(pt => pt.y);
        let xMin = Math.max(0, Math.floor(Math.min(...xs) - PADDING));
        let xMax = Math.min(ctx.canvas.width, Math.floor(Math.max(...xs) + PADDING));
        let yMin = Math.max(0, Math.floor(Math.min(...ys) - PADDING));
        let yMax = Math.min(ctx.canvas.height, Math.floor(Math.max(...ys) + PADDING));
        let width = xMax - xMin;
        let height = yMax - yMin;
        if (ctx) {
          ctx.strokeStyle = "#FF0000";
          ctx.lineWidth = 2;
          ctx.strokeRect(xMin, yMin, width, height);
          ctx.save();
          ctx.globalAlpha = 0.3;
          ctx.fillStyle = "#007bff";
          ctx.fillRect(xMin, yMin, width, height);
          ctx.restore();
        }
        // --- Cropping logic identical to DataCollector ---
        // Get the actual displayed video size
        const videoRect = video.getBoundingClientRect();
        const canvasRect = canvasRef.current.getBoundingClientRect();
        // Calculate the offset of the video inside the canvas (in case of letterboxing)
        const offsetX = videoRect.left - canvasRect.left;
        const offsetY = videoRect.top - canvasRect.top;
        // Calculate the scale factors
        const scaleX = video.videoWidth / videoRect.width;
        const scaleY = video.videoHeight / videoRect.height;
        // Adjust crop box from canvas to video pixel coordinates
        const cropX = Math.floor((xMin - offsetX) * scaleX);
        const cropY = Math.floor((yMin - offsetY) * scaleY);
        const cropW = Math.floor(width * scaleX);
        const cropH = Math.floor(height * scaleY);
        // Clamp to video frame
        const safeW = Math.min(cropW, video.videoWidth - cropX);
        const safeH = Math.min(cropH, video.videoHeight - cropY);
        const imgTensor = tf.browser.fromPixels(video);
        const croppedImg = imgTensor.slice(
          [cropY, cropX, 0],
          [safeH, safeW, 3]
        );
        // Visualize the cropped image (for display)
        const resizedForDisplay = tf.image.resizeBilinear(croppedImg, [300, 300]).toInt();
        const pixels = await tf.browser.toPixels(resizedForDisplay);
        const previewCanvas = document.createElement('canvas');
        previewCanvas.width = 300;
        previewCanvas.height = 300;
        const previewCtx = previewCanvas.getContext('2d');
        const imageData = previewCtx.createImageData(300, 300);
        imageData.data.set(pixels);
        previewCtx.putImageData(imageData, 0, 0);
        const dataUrl = previewCanvas.toDataURL();
        setCroppedImgDataUrl(dataUrl);
        tf.dispose([resizedForDisplay]);
        // Prepare for model (resize to 224x224, normalize)
        const finalImg = tf.image.resizeBilinear(croppedImg, [224, 224])
          .div(tf.scalar(255.0))
          .expandDims();
        // Predict gesture
        const predictionTensor = await gestureModel.predict(finalImg);
        const predictionArray = await predictionTensor.data();
        const maxIndex = predictionArray.indexOf(Math.max(...predictionArray));
        setLivePrediction(GESTURE_LABELS[maxIndex]);
        // If round is running, buffer predictions for stability
        if (roundPhase === "countdown" && countdown > 0) {
          setPredictionBuffer(prev => [...prev, GESTURE_LABELS[maxIndex]]);
        }
        tf.dispose([imgTensor, croppedImg, finalImg, predictionTensor]);
      } else {
        setLivePrediction("");
        setCroppedImgDataUrl(null);
      }
      requestAnimationFrame(runDetection);
    };
    runDetection();
    return () => { stopped = true; };
  }, [gestureModel, handModel, roundPhase, countdown]);

  // Countdown effect for round
  useEffect(() => {
    if (roundPhase !== "countdown") return;
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      handleRound();
    }
  }, [roundPhase, countdown]);

  // Handle round logic
  const handleRound = () => {
    // Use the most frequent prediction in the buffer
    let move = "";
    if (predictionBuffer.length > 0) {
      const freq = {};
      predictionBuffer.forEach(p => { freq[p] = (freq[p] || 0) + 1; });
      move = Object.keys(freq).reduce((a, b) => freq[a] > freq[b] ? a : b);
    }
    setPlayerMove(move);
    const bot = getBotMove();
    setBotMove(bot);
    const winner = decideWinner(move, bot);
    setRoundResult(
      winner === "Draw" ? "It's a Draw!" : `${winner} wins the round!`
    );
    if (winner === "Player") setPlayerScore(s => s + 1);
    if (winner === "Bot") setBotScore(s => s + 1);
    setShowResult(true);
    setRoundPhase("waiting");
  };

  // Handle next round or finish
  const handleNextRound = () => {
    setPredictionBuffer([]);
    setPlayerMove("");
    setBotMove("");
    setRoundResult("");
    setShowResult(false);
    if (currentRound === rounds) {
      // Game over
      let final = playerScore > botScore ? "Player" : botScore > playerScore ? "Bot" : "Draw";
      setFinalWinner(final);
      setRoundPhase("finished");
      onGameEnd(final);
    } else {
      setCurrentRound(r => r + 1);
      setCountdown(3);
      setShowResult(false);
      setRoundPhase("countdown"); // Immediately start countdown for next round
    }
  };

  // Start round button handler
  const handleStartRound = () => {
    setCountdown(3);
    setPredictionBuffer([]);
    setShowResult(false);
    setRoundPhase("countdown");
  };

  return (
    <div style={{ textAlign: "center", marginTop: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", maxWidth: 500, margin: "auto" }}>
        <div>
          <img src={avatar} alt="Player Avatar" style={{ width: 64, height: 64, borderRadius: "50%" }} />
          <div>Player: {playerScore}</div>
        </div>
        <h2>VS</h2>
        <div>
          <img src={botAvatar} alt="Bot Avatar" style={{ width: 64, height: 64, borderRadius: "50%" }} />
          <div>Bot: {botScore}</div>
        </div>
      </div>

      <div style={{ position: "relative", width: 400, height: 300, margin: "2rem auto" }}>
        <Webcam
          ref={webcamRef}
          audio={false}
          width={400}
          height={300}
          style={{ borderRadius: "10px" }}
        />
        <canvas
          ref={canvasRef}
          width={400}
          height={300}
          style={{ position: "absolute", top: 0, left: 0 }}
        />
      </div>

      <div style={{minHeight: 100}}>
        {(roundPhase === "waiting") && !finalWinner && !showResult && (
          <button onClick={handleStartRound} style={{ fontSize: "1.2rem", padding: "0.7rem 2rem", borderRadius: 8 }}>
            {currentRound === 1 ? `Start Round 1` : `Start Next Round (${currentRound})`}
          </button>
        )}
        {(roundPhase === "countdown") && <h2>Show your move in... {countdown}</h2>}
        {showResult && !finalWinner && (
          <>
            <h2>{roundResult}</h2>
            <h3>You played: {playerMove || "No move"} | Bot played: {botMove}</h3>
            <button onClick={handleNextRound} style={{ fontSize: "1.1rem", padding: "0.5rem 1.5rem", borderRadius: 8, marginTop: 10 }}>
              {currentRound === rounds ? "Finish Game" : `Start Next Round (${currentRound + 1})`}
            </button>
          </>
        )}
        {finalWinner && (
          <h1>Game Over! The winner is {finalWinner}!</h1>
        )}
      </div>

      <h3>Live Prediction: <span style={{color: "green"}}>{livePrediction}</span></h3>
      {croppedImgDataUrl && (
        <div style={{ marginTop: 20 }}>
          <div>Cropped Image Sent to Model:</div>
          <img src={croppedImgDataUrl} alt="Cropped Hand" style={{ border: '2px solid #007bff', borderRadius: 8, marginTop: 8 }} />
        </div>
      )}
    </div>
  );
}