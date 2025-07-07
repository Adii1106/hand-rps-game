import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import './GameAreaPage.css';
import RoboSvg from '../../icons/Robo.svg';
import RpsGifMp4 from '../../icons/RPS-gif.mp4';
import ScissorsSvg from '../../icons/Scissors.svg';
import RockSvg from '../../icons/Rock .svg';
import PaperSvg from '../../icons/Paper.svg';
import * as tf from '@tensorflow/tfjs';
import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';
import { cropHandFromVideo } from '../handCropUtils';
import HomeIcon from '../../icons/home-.svg';
import SettingsIcon from '../../icons/setting-3.svg';
import Start2Svg from '../../icons/start2.svg';
import NextRoundSvg from '../../icons/next-r.svg';

const MODEL_URL = '/model/model.json';
const GESTURE_LABELS = ['Paper', 'Rock', 'Scissors'];
const PADDING = 30;

// Add this CSS class to the file or use inline style
const startBtnImgStyle = {
  width: 180,
  height: 90,
  display: 'block',
  transition: 'transform 0.2s, box-shadow 0.2s',
};
const startBtnImgHoverStyle = {
  transform: 'scale(1.1)',
  boxShadow: '0 4px 16px rgba(0,0,0,0.15)'
};

// Add blinking animation style
const blinkStyle = {
  animation: 'blinker 1s linear infinite',
  WebkitAnimation: 'blinker 1s linear infinite',
};

// Add keyframes for blinking (inject into the document head if not present)
if (typeof document !== 'undefined' && !document.getElementById('blinker-keyframes')) {
  const style = document.createElement('style');
  style.id = 'blinker-keyframes';
  style.innerHTML = `@keyframes blinker { 50% { opacity: 0; } }`;
  document.head.appendChild(style);
}

function getBotMove() {
  return GESTURE_LABELS[Math.floor(Math.random() * GESTURE_LABELS.length)];
}

function decideWinner(player, bot) {
  if (player === bot) return 'Draw';
  if (
    (player === 'Rock' && bot === 'Scissors') ||
    (player === 'Paper' && bot === 'Rock') ||
    (player === 'Scissors' && bot === 'Paper')
  ) {
    return 'Player';
  }
  return 'Bot';
}

export default function GameAreaPage({
  round = 1,
  totalRounds = 3,
  onGoHome,
  onPlayAgain,
  onSettings,
  playerName = 'Player',
  botName = 'Bot',
  playerAvatar,
  botAvatar,
}) {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [gestureModel, setGestureModel] = useState(null);
  const [handModel, setHandModel] = useState(null);

  // Game State
  const [playerScore, setPlayerScore] = useState(0);
  const [botScore, setBotScore] = useState(0);
  const [currentRound, setCurrentRound] = useState(round);
  const [finalWinner, setFinalWinner] = useState('');

  // Round State
  const [roundPhase, setRoundPhase] = useState('waiting'); // 'waiting', 'countdown', 'result', 'finished'
  const [countdown, setCountdown] = useState(3);
  const [playerMove, setPlayerMove] = useState('');
  const [botMove, setBotMove] = useState('');
  const [roundResult, setRoundResult] = useState('');
  const [livePrediction, setLivePrediction] = useState('');
  const [predictionBuffer, setPredictionBuffer] = useState([]);

  // --- Optimization: Use refs to avoid unnecessary re-renders ---
  const livePredictionRef = useRef('');
  const predictionBufferRef = useRef([]);

  const [showFinalResultPage, setShowFinalResultPage] = useState(false);

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

  // Main detection loop (optimized)
  useEffect(() => {
    if (!gestureModel || !handModel) return;
    let stopped = false;
    const runDetection = async () => {
      if (stopped) return;
      const video = webcamRef.current?.video;
      const canvas = canvasRef.current;
      if (!video || video.readyState !== 4 || !canvas) {
        requestAnimationFrame(runDetection);
        return;
      }
      const hands = await handModel.estimateHands(video);
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (hands.length > 0) {
        // Draw keypoints and bounding box with padding
        const keypoints = hands[0].keypoints;
        ctx.fillStyle = '#00FF00';
        keypoints.forEach(pt => {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 4, 0, 2 * Math.PI);
          ctx.fill();
        });
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 2;
        // (Bounding box drawing remains for visual feedback)
        const xs = keypoints.map(pt => pt.x);
        const ys = keypoints.map(pt => pt.y);
        let xMin = Math.max(0, Math.floor(Math.min(...xs) - PADDING));
        let xMax = Math.min(ctx.canvas.width, Math.floor(Math.max(...xs) + PADDING));
        let yMin = Math.max(0, Math.floor(Math.min(...ys) - PADDING));
        let yMax = Math.min(ctx.canvas.height, Math.floor(Math.max(...ys) + PADDING));
        let width = xMax - xMin;
        let height = yMax - yMin;
        ctx.strokeRect(xMin, yMin, width, height);
        // --- Use shared cropping utility ---
        const { tensor: finalImg } = await cropHandFromVideo({
          keypoints,
          canvas,
          video,
          padding: PADDING,
          targetSize: 224
        });
        // Predict gesture
        const predictionTensor = await gestureModel.predict(finalImg);
        const predictionArray = await predictionTensor.data();
        const maxIndex = predictionArray.indexOf(Math.max(...predictionArray));
        const maxProb = predictionArray[maxIndex];
        const predictedLabel = GESTURE_LABELS[maxIndex];
        // Only show prediction if confidence is above 0.85
        if (maxProb >= 0.60) {
          if (livePredictionRef.current !== predictedLabel) {
            livePredictionRef.current = predictedLabel;
            setLivePrediction(predictedLabel);
          }
          // Only update buffer during countdown, and only if prediction changes
          if (roundPhase === 'countdown' && countdown > 0) {
            if (
              predictionBufferRef.current.length === 0 ||
              predictionBufferRef.current[predictionBufferRef.current.length - 1] !== predictedLabel
            ) {
              predictionBufferRef.current = [...predictionBufferRef.current, predictedLabel];
              setPredictionBuffer([...predictionBufferRef.current]);
            }
          }
        } else {
          if (livePredictionRef.current !== '') {
            livePredictionRef.current = '';
            setLivePrediction('');
          }
        }
        tf.dispose([finalImg, predictionTensor]);
      } else {
        if (livePredictionRef.current !== '') {
          livePredictionRef.current = '';
          setLivePrediction('');
        }
      }
      requestAnimationFrame(runDetection);
    };
    runDetection();
    return () => { stopped = true; };
  }, [gestureModel, handModel, roundPhase, countdown]);

  // Countdown effect for round
  useEffect(() => {
    if (roundPhase !== 'countdown') return;
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
    let move = '';
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
      winner === 'Draw' ? "It's a Draw!" : `${winner} wins the round!`
    );
    if (winner === 'Player') setPlayerScore(s => s + 1);
    if (winner === 'Bot') setBotScore(s => s + 1);
    setRoundPhase('result');
  };

  // Start round button handler
  const handleStartRound = () => {
    setCountdown(3);
    predictionBufferRef.current = [];
    setPredictionBuffer([]);
    setRoundPhase('countdown');
    setPlayerMove('');
    setBotMove('');
    setRoundResult('');
  };

  // Next round or finish
  const handleNextRound = () => {
    if (currentRound === totalRounds) {
      // Game over
      let winner = playerScore > botScore ? playerName : botScore > playerScore ? botName : 'Draw';
      setFinalWinner(winner);
      setRoundPhase('finished');
      return;
    }
    setCurrentRound(r => r + 1);
    setCountdown(3);
    setRoundPhase('waiting');
    setPlayerMove('');
    setBotMove('');
    setRoundResult('');
    setPredictionBuffer([]);
  };

  // Show final result page
  const handleFinishGame = () => {
    setShowFinalResultPage(true);
  };

  // UI rendering
  if (showFinalResultPage) {
    return (
      <div className="gamearea-bg" style={{ minHeight: '100vh', background: '#fff', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Header with Home and Settings */}
        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'absolute', top: 24, left: 0, right: 0, zIndex: 10 }}>
          <button onClick={onGoHome} style={{ background: 'none', border: 'none', marginLeft: 30, cursor: 'pointer', boxShadow: 'none', padding: 0 }}>
            <img src={HomeIcon} alt="Home" style={{ width: 80, height: 80, background: 'none', boxShadow: 'none' }} />
          </button>
          <button className="icon-btn settings-btn" aria-label="Settings" onClick={onSettings}>
            <img src={SettingsIcon} alt="Settings" className="icon-img settings-icon-img" />
          </button>
        </div>
        {/* Main content */}
        <div style={{ width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', textAlign: 'center' }}>
          <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '6rem', marginTop: 80, marginBottom: 80, letterSpacing: 2, ...blinkStyle }}>Game Over!</div>
          <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '5rem', marginBottom: 80, lineHeight: 1.1 }}>
            {playerScore !== botScore && <div>YOU</div>}
            <div>
              {playerScore === botScore ? (
                <span style={{ display: 'inline-block', textAlign: 'center' }}>
                  It's a<br />Draw!!
                </span>
              ) : playerScore > botScore ? 'WIN!!' : 'LOSE!!'}
            </div>
          </div>
          <div style={{ fontSize: '2.2rem', marginBottom: 40 }}>
            Bot : {botScore} &nbsp;|&nbsp; {playerName} : {playerScore} &nbsp;|&nbsp; Draw: {totalRounds - (playerScore + botScore)}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', width: '100%', marginBottom: 0 }}>
            <button
              onClick={onPlayAgain}
              style={{
                fontSize: '2.2rem',
                fontWeight: 700,
                padding: '0.7em 3em',
                borderRadius: 20,
                border: 'none',
                background: 'linear-gradient(90deg, #6EC3F4 0%, #E8B2FC 100%, #FF6B6B 100%)',
                color: '#fff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                cursor: 'pointer',
                marginTop: 0
              }}
            >
              Play Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="gamearea-bg">
      <div className="gamearea-separator-thin" />
      {/* Bot (left) */}
      <div className="gamearea-split gamearea-left">
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          marginBottom: '1.5em',
          marginTop: '1em',
          marginLeft: 40,
        }}>
          <div style={{ position: 'relative', height: 160, display: 'flex', alignItems: 'center', marginBottom: '1.5em', marginTop: '1em' }}>
            {botAvatar ? (
              <img src={botAvatar} alt="Bot Avatar" style={{ width: 160, height: 160, borderRadius: '50%', background: '#d3d3d3', position: 'absolute', left: -80 }} />
            ) : (
              <div style={{ width: 160, height: 160, borderRadius: '50%', background: '#d3d3d3', position: 'absolute', left: -80 }} />
            )}
            <span style={{ fontSize: '1.3rem', fontWeight: 600, color: '#fff', letterSpacing: 1, marginLeft: 100 }}>BOT</span>
          </div>
          <div className="gamearea-move-box" style={{ overflow: 'hidden' }}>
            {roundPhase === 'countdown' ? (
              <video
                src={RpsGifMp4}
                autoPlay
                loop
                muted
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div className="gamearea-move-circle" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {roundPhase === 'result' ? (
                  botMove === 'Scissors' ? (
                    <img src={ScissorsSvg} alt="Scissors" className="gamearea-move-img-bot" style={{ width: 200, height: 200, margin: 0 }} />
                  ) : botMove === 'Rock' ? (
                    <img src={RockSvg} alt="Rock" className="gamearea-move-img-bot" style={{ width: 200, height: 200, margin: 0 }} />
                  ) : botMove === 'Paper' ? (
                    <img src={PaperSvg} alt="Paper" className="gamearea-move-img-bot" style={{ width: 200, height: 200, margin: 0 }} />
                  ) : (
                    <img src={RoboSvg} alt="Bot Move" className="gamearea-move-img-bot" style={{ width: 200, height: 200, margin: 0 }} />
                  )
                ) : (
                  <img src={RoboSvg} alt="Bot Move" className="gamearea-move-img-bot" style={{ width: 200, height: 200, margin: 0 }} />
                )}
              </div>
            )}
          </div>
          <div className="gamearea-label-move">{botMove}</div>
        </div>
      </div>
      {/* Player (right) */}
      <div className="gamearea-split gamearea-right">
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          marginBottom: '1.5em',
          marginTop: '1em',
          marginRight: 40,
        }}>
          <div style={{ position: 'relative', height: 160, display: 'flex', alignItems: 'center', marginBottom: '1.5em', marginTop: '1em', justifyContent: 'flex-end' }}>
            <span style={{ fontSize: '1.3rem', fontWeight: 600, color: '#fff', letterSpacing: 1, marginRight: 100 }}>{playerName}</span>
            {playerAvatar ? (
              <img src={playerAvatar} alt="Player Avatar" style={{ width: 160, height: 160, borderRadius: '50%', background: '#d3d3d3', position: 'absolute', right: -80 }} />
            ) : (
              <div style={{ width: 160, height: 160, borderRadius: '50%', background: '#d3d3d3', position: 'absolute', right: -80 }} />
            )}
          </div>
          <div className="gamearea-move-box gamearea-move-box-webcam" style={{position:'relative'}}>
            <Webcam className="gamearea-webcam-rect" audio={false} ref={webcamRef} width={350} height={270} />
            <canvas ref={canvasRef} width={350} height={270} style={{position:'absolute',top:0,left:0,pointerEvents:'none'}} />
          </div>
          <div className="gamearea-label-move">{playerMove}</div>
        </div>
      </div>
      <div className="gamearea-round-label-large">ROUND {currentRound}</div>
      {roundPhase === 'countdown' && <div className="gamearea-countdown" style={{ color: 'black' }}>{countdown}</div>}
      {roundPhase === 'waiting' && !finalWinner && (
        <StartButtonWithHover onClick={handleStartRound} />
      )}
      {/* Result display below the START button */}
      {roundPhase === 'result' && (
        <div className="gamearea-result-below-btn">
          <span className="gamearea-result-display">{roundResult}</span>
          {currentRound === totalRounds ? (
            <button className="gamearea-next-btn" onClick={handleFinishGame}>Finish Game</button>
          ) : (
            <button className="gamearea-next-btn" onClick={handleNextRound} style={{ background: 'none', border: 'none', boxShadow: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={NextRoundSvg} alt="Next Round" style={{ width: 180, height: 90, display: 'block' }} />
            </button>
          )}
        </div>
      )}
      {/* Live prediction at bottom right */}
      <div className="gamearea-live-prediction-small">LIVE PREDICTION: {livePrediction}</div>
    </div>
  );
}

function StartButtonWithHover({ onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      className="gamearea-start-btn-small"
      onClick={onClick}
      style={{
        background: 'none',
        border: 'none',
        boxShadow: 'none',
        padding: 0,
        margin: 0,
        borderRadius: 0,
        minWidth: 0,
        minHeight: 0,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        outline: 'none',
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <img
        src={Start2Svg}
        alt="Start"
        style={hover ? { ...startBtnImgStyle, ...startBtnImgHoverStyle } : startBtnImgStyle}
      />
    </button>
  );
} 