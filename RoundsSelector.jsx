import React from "react";

const options = [3, 5, 7];

export default function RoundsSelector({ selected, onSelect }) {
  return (
    <div style={{ marginTop: "2rem" }}>
      <h2>Choose Number of Rounds</h2>
      <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
        {options.map((num) => (
          <button
            key={num}
            style={{
              padding: "0.5rem 1.5rem",
              fontSize: "1.2rem",
              borderRadius: 8,
              border: selected === num ? "3px solid #007bff" : "2px solid #ccc",
              background: selected === num ? "#e6f0ff" : "#fff",
              cursor: "pointer"
            }}
            onClick={() => onSelect(num)}
          >
            {num}
          </button>
        ))}
      </div>
    </div>
  );
} 