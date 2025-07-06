import React, { useState } from 'react';
import './AvatarSelectPage.css';
import SettingsIcon from '../../icons/setting-3.svg';
import NextIcon from '../../icons/next.svg';
import NextIcon2 from '../../icons/next2.svg';
import NextIcon3 from '../../icons/next3.svg';
import WaitAMinMp4 from '../../icons/Wait_a_min.mp4';
import AbhijeetPng from '../../icons/Abhijeet.png';
import GangLeaderPng from '../../icons/gangleader.png';

export default function AvatarSelectPage({ onNext, onSettings }) {
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [hover, setHover] = useState(false);
  const [active, setActive] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const videoRef = React.useRef(null);
  // Placeholder avatars (just gray circles for now)
  const avatars = [0, 1, 2, 'gangleader', 'Abhijeet'];

  React.useEffect(() => {
    if (videoRef.current) {
      if (isTyping) {
        videoRef.current.currentTime = 0;
        videoRef.current.play();
      } else {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    }
  }, [isTyping]);

  return (
    <div className="avatar-bg" style={{ position: 'relative', zIndex: 1 }}>
      <header className="avatar-select-header" style={{ position: 'relative', width: '100%', height: '0' }}>
        <button
          className="icon-btn settings-btn"
          aria-label="Settings"
          onClick={onSettings}
          style={{ position: 'absolute', top: 24, right: 32 }}
        >
          <img src={SettingsIcon} alt="Settings" className="icon-img settings-icon-img" />
        </button>
      </header>
      <h1 className="avatar-title">Choose Your Avatar</h1>
      <div className="avatar-row" style={{ marginBottom: 90 }}>
        {avatars.map((a, i) => {
          if (a === 'Abhijeet') {
            return (
              <img
                key={i}
                src={AbhijeetPng}
                alt="Abhijeet Avatar"
                className={`avatar-placeholder${selectedAvatar === i ? ' selected' : ''}`}
                style={{ objectFit: 'cover' }}
                onClick={() => setSelectedAvatar(i)}
              />
            );
          } else if (a === 'gangleader') {
            return (
              <img
                key={i}
                src={GangLeaderPng}
                alt="Gang Leader Avatar"
                className={`avatar-placeholder${selectedAvatar === i ? ' selected' : ''}`}
                style={{ objectFit: 'cover' }}
                onClick={() => setSelectedAvatar(i)}
              />
            );
          } else {
            return (
              <div
                key={i}
                className={`avatar-placeholder${selectedAvatar === i ? ' selected' : ''}`}
                onClick={() => setSelectedAvatar(i)}
              />
            );
          }
        })}
      </div>
      <h2 className="avatar-who">Who are You?</h2>
      <input
        className="avatar-input"
        type="text"
        placeholder="Enter your name"
        value={name}
        onChange={e => setName(e.target.value)}
        onFocus={() => setIsTyping(true)}
        onBlur={() => setIsTyping(false)}
      />
      {isTyping && (
        <video
          ref={videoRef}
          src={WaitAMinMp4}
          loop
          playsInline
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            objectFit: 'cover',
            zIndex: 0,
            opacity: 0.18,
            pointerEvents: 'none',
            background: 'black',
          }}
        />
      )}
      <div className="avatar-next-row">
        <button
          className="avatar-next-btn"
          onClick={() => onNext({ name, avatar: selectedAvatar })}
          disabled={!name}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, border: 'none', background: 'none', boxShadow: 'none', cursor: !name ? 'not-allowed' : 'pointer' }}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => { setHover(false); setActive(false); }}
          onMouseDown={() => setActive(true)}
          onMouseUp={() => setActive(false)}
        >
          {name ? (
            <img
              src={active ? NextIcon3 : hover ? NextIcon2 : NextIcon}
              alt="Next"
              style={{ width: 160, height: 160, display: 'block', marginTop: 8 }}
            />
          ) : (
            <span style={{
              width: 155,
              height: 56,
              minWidth: 155,
              minHeight: 56,
              maxWidth: 155,
              maxHeight: 56,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#b6b6b6',
              fontSize: '1.45rem',
              fontWeight: 700,
              background: '#e0e0e0',
              borderRadius: 16,
              marginTop: '56px'
            }}>Next</span>
          )}
        </button>
      </div>
    </div>
  );
} 