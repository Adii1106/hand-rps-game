import React, { useState, useEffect } from "react";
import HomePage from "./components/HomePage";
import AvatarSelectPage from "./components/AvatarSelectPage";
import RoundsSelectPage from "./components/RoundsSelectPage";
import GameAreaPage from "./components/GameAreaPage";

const MODEL_URL = "/model/model.json";
const GESTURE_LABELS = ["Paper", "Rock", "Scissors"];
const PADDING = 30;

export default function App() {
  const [page, setPage] = useState("home");
  const [avatar, setAvatar] = useState(null);
  const [playerName, setPlayerName] = useState("Player");
  const [botName] = useState("Bot");
  const [rounds, setRounds] = useState(3);
  const [currentRound, setCurrentRound] = useState(1);
  const [playerScore, setPlayerScore] = useState(0);
  const [botScore, setBotScore] = useState(0);
  const [roundPhase, setRoundPhase] = useState("waiting"); // waiting, countdown, result, finished
  const [countdown, setCountdown] = useState(3);
  const [playerMove, setPlayerMove] = useState("");
  const [botMove, setBotMove] = useState("");
  const [result, setResult] = useState("");
  const [predictionBuffer, setPredictionBuffer] = useState([]);
  const [finalWinner, setFinalWinner] = useState("");

  // Countdown effect
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
    const bot = GESTURE_LABELS[Math.floor(Math.random() * GESTURE_LABELS.length)];
    setBotMove(bot);
    let res = "";
    if (move === bot) res = "Draw";
    else if (
      (move === "Rock" && bot === "Scissors") ||
      (move === "Paper" && bot === "Rock") ||
      (move === "Scissors" && bot === "Paper")
    ) res = "You WIN";
    else res = "You LOSE";
    setResult(res);
    if (res === "You WIN") setPlayerScore(s => s + 1);
    if (res === "You LOSE") setBotScore(s => s + 1);
    setRoundPhase("result");
    setPredictionBuffer([]);
  };

  // Start round button handler
  const handleStartRound = () => {
    setCountdown(3);
    setRoundPhase("countdown");
    setPlayerMove("");
    setBotMove("");
    setResult("");
    setPredictionBuffer([]);
  };

  // Next round or finish
  const handleNextRound = () => {
    if (currentRound === rounds) {
      // Game over
      let winner = playerScore > botScore ? playerName : botScore > playerScore ? botName : "Draw";
      setFinalWinner(winner);
      setRoundPhase("finished");
      return;
    }
    setCurrentRound(r => r + 1);
    setCountdown(3);
    setRoundPhase("waiting");
    setPlayerMove("");
    setBotMove("");
    setResult("");
    setPredictionBuffer([]);
  };

  // Avatar selection
  const handleAvatarNext = ({ name, avatar }) => {
    setPlayerName(name || "Player");
    setAvatar(avatar);
    setPage("rounds");
  };

  // Rounds selection
  const handleRoundsStart = (numRounds) => {
    setRounds(numRounds);
    setCurrentRound(1);
    setPlayerScore(0);
    setBotScore(0);
    setFinalWinner("");
    setPage("game");
  };

  // Go to home handler
  const handleGoHome = () => {
    setPage('home');
  };

  // Play again handler
  const handlePlayAgain = () => {
    setPage('rounds');
  };

  // Use a default bot avatar if not set
  const defaultBotAvatar = null; // You can set a bot avatar image here if you want

  if (page === "home") {
    return <HomePage onPlay={() => setPage("avatar")} onSettings={() => alert("Settings clicked!")} />;
  }
  if (page === "avatar") {
    return (
      <AvatarSelectPage
        onNext={handleAvatarNext}
        onSettings={() => alert("Settings clicked!")}
      />
    );
  }
  if (page === "rounds") {
    return (
      <RoundsSelectPage
        onStart={handleRoundsStart}
        onSettings={() => alert("Settings clicked!")}
      />
    );
  }
  if (page === "game") {
    return (
      <GameAreaPage
        round={currentRound}
        totalRounds={rounds}
        playerName={playerName}
        botName={botName}
        playerAvatar={avatar}
        botAvatar={defaultBotAvatar}
        playerMove={playerMove}
        botMove={botMove}
        result={result}
        onStart={handleStartRound}
        onNextRound={handleNextRound}
        onGoHome={handleGoHome}
        roundPhase={roundPhase}
        countdown={countdown}
        finalWinner={finalWinner}
        playerScore={playerScore}
        botScore={botScore}
        onPlayAgain={handlePlayAgain}
      />
    );
  }
  return null;
}
