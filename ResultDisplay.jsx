import React from "react";

export default function ResultDisplay({
  roundResult,
  playerScore,
  botScore,
  currentRound,
  totalRounds,
  finalWinner
}) {
  return (
    <div style={{ marginTop: "2rem" }}>
      <h3>Round {currentRound} / {totalRounds}</h3>
      {roundResult && <h2>{roundResult}</h2>}
      <div style={{ fontSize: "1.2rem", margin: "1rem 0" }}>
        <span style={{ marginRight: 20 }}>Player: {playerScore}</span>
        <span>Bot: {botScore}</span>
      </div>
      {finalWinner && (
        <h1 style={{ color: "#007bff" }}>Winner: {finalWinner}</h1>
      )}
    </div>
  );
} 