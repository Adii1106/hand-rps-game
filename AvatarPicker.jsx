import React from "react";

const avatars = [
  "https://randomuser.me/api/portraits/men/1.jpg",
  "https://randomuser.me/api/portraits/women/2.jpg",
  "https://randomuser.me/api/portraits/men/3.jpg",
  "https://randomuser.me/api/portraits/women/4.jpg"
];

export default function AvatarPicker({ selected, onSelect }) {
  return (
    <div>
      <h2>Choose Your Avatar</h2>
      <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
        {avatars.map((url, idx) => (
          <img
            key={idx}
            src={url}
            alt={`Avatar ${idx + 1}`}
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              border: selected === url ? "3px solid #007bff" : "2px solid #ccc",
              cursor: "pointer"
            }}
            onClick={() => onSelect(url)}
          />
        ))}
      </div>
    </div>
  );
} 