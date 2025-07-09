import React, { useState } from 'react';
import './RoundsSelectPage.css';
import SettingsIcon from '../../icons/setting-3.svg';
import PrevSvg from '../../icons/prev.svg';
import NexSvg from '../../icons/nex.svg';
import BoxSvg from '../../icons/box.svg';
import Start1 from '../../icons/start1.svg';
import Start2 from '../../icons/startt2.svg';
import Start3 from '../../icons/start3.svg';

const ROUND_OPTIONS = [1, 3, 5, 7, 9];

export default function RoundsSelectPage({ onStart, onSettings, onGoHome }) {
  const [roundIdx, setRoundIdx] = useState(1); // default to 3 rounds
  const rounds = ROUND_OPTIONS[roundIdx];
  const [hover, setHover] = useState(false);
  const [active, setActive] = useState(false);

  const handleLeft = () => {
    if (roundIdx > 0) setRoundIdx(roundIdx - 1);
  };
  const handleRight = () => {
    if (roundIdx < ROUND_OPTIONS.length - 1) setRoundIdx(roundIdx + 1);
  };

  return (
    <div className="rounds-bg">
      <header className="rounds-select-header" style={{ position: 'relative', width: '100%', height: '0' }}>
        <button
          className="icon-btn settings-btn"
          aria-label="Settings"
          onClick={onSettings}
          style={{ position: 'absolute', top: 24, right: 32 }}
        >
          <img src={SettingsIcon} alt="Settings" className="icon-img settings-icon-img" />
        </button>
      </header>
      <h1 className="rounds-title" style={{ marginTop: '60px', marginBottom: '1.2em' }}>Choose Number of Rounds</h1>
      <div className="rounds-selector-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2.2em', marginBottom: '1em' }}>
        {roundIdx > 0 && (
          <button className="rounds-arrow" onClick={handleLeft} style={{ background: 'none', border: 'none', boxShadow: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src={PrevSvg} alt="Previous" style={{ width: 80, height: 80, display: 'block' }} />
          </button>
        )}
        <div style={{ position: 'relative', width: 200, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src={BoxSvg} alt="Box" style={{ width: '100%', height: '100%', display: 'block' }} />
          <span style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontFamily: 'Fredoka, Inter, Arial, sans-serif',
            fontSize: '5rem',
            fontWeight: 700,
            color: '#7035f6',
            textAlign: 'center',
            width: '100%',
            userSelect: 'none',
            pointerEvents: 'none',
          }}>{rounds}</span>
        </div>
        {roundIdx < ROUND_OPTIONS.length - 1 && (
          <button className="rounds-arrow" onClick={handleRight} style={{ background: 'none', border: 'none', boxShadow: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src={NexSvg} alt="Next" style={{ width: 80, height: 80, display: 'block' }} />
          </button>
        )}
      </div>
      <div className="rounds-start-row" style={{ marginTop: '0.5em', marginBottom: '0.5em' }}>
        <button
          className="rounds-start-btn"
          onClick={() => onStart(rounds)}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => { setHover(false); setActive(false); }}
          onMouseDown={() => setActive(true)}
          onMouseUp={() => setActive(false)}
          style={{ background: 'none', border: 'none', padding: 0, boxShadow: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <img
            src={active ? Start3 : hover ? Start2 : Start1}
            alt="Start"
            style={{ width: 140, height: 70, display: 'block' }}
          />
        </button>
      </div>
      <div className="rounds-subtitle">Let the <span className="battle">Battle</span> Begin!</div>
    </div>
  );
} 