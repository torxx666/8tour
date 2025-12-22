// src/App.jsx
import { useEffect, useState, useRef } from "react";
import logo8 from "./assets/logo8.png";
import Board from "./components/Board";

function App() {
  const [board, setBoard] = useState([]);
  const [current, setCurrent] = useState(1);
  const [score, setScore] = useState({ 1: 0, 2: 0 });
  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState("hva"); // 'hvh' or 'hva'
  const [phase, setPhase] = useState("PLACEMENT");
  const [piecesPlaced, setPiecesPlaced] = useState({ 1: 0, 2: 0 });
  const [winner, setWinner] = useState(null);
  const [aiHighlight, setAIHighlight] = useState(null);
  const [destHighlight, setDestHighlight] = useState(null);
  const [capturedStatic, setCapturedStatic] = useState([]);
  const [capturedHighlight, setCapturedHighlight] = useState([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [validMoves, setValidMoves] = useState([]);

  // Clarity Features
  const [moveHistory, setMoveHistory] = useState([]); // { player, type, from, to, capturedCount }
  const [lastMove, setLastMove] = useState(null); // { fx, fy, tx, ty } for ghost trails
  const [showPhaseOverlay, setShowPhaseOverlay] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem("soundEnabled");
    return saved === null ? true : saved === "true";
  });

  const logEndRef = useRef(null);
  const audioCtxRef = useRef(null);
  const lastPhaseRef = useRef(null);

  const API_HOST = window.location.hostname;
  const API_URL = `http://${API_HOST}:8000`;

  useEffect(() => {
    localStorage.setItem("soundEnabled", soundEnabled);
  }, [soundEnabled]);

  useEffect(() => {
    const checkTouch = () => {
      setIsTouchDevice(window.matchMedia('(pointer: coarse)').matches);
    };
    checkTouch();
    window.addEventListener('resize', checkTouch);
    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  // Sound Utilities
  const playThud = () => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      const noise = ctx.createBufferSource();
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(200, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.1);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start();
    } catch (e) {
      // Audio blocked
    }
  };

  const playSlide = () => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      const noise = ctx.createBufferSource();
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(800, ctx.currentTime);
      filter.frequency.linearRampToValueAtTime(400, ctx.currentTime + 0.3);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.05);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start();
    } catch (e) {
      // Audio blocked
    }
  };

  const playError = () => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;

      const beep = (freq, startTime, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth"; // Harsher than square/triangle
        osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
        gain.gain.setValueAtTime(0, ctx.currentTime + startTime);
        gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + startTime + 0.01);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + startTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + startTime);
        osc.stop(ctx.currentTime + startTime + duration);
      };

      // Dissonant double beep
      beep(150, 0, 0.1);
      beep(130, 0.05, 0.15);
      beep(110, 0.1, 0.2);
    } catch (e) {
      // Audio blocked
    }
  };

  const triggerPhaseSignal = () => {
    setShowPhaseOverlay(true);
    playThud(); // Physical notification
    setTimeout(() => setShowPhaseOverlay(false), 2500);
  };

  const fetchState = async () => {
    try {
      const r = await fetch(`${API_URL}/state`);
      const data = await r.json();
      setBoard(data.board || []);
      setCurrent(data.current ?? 1);
      if (data.score) setScore(data.score);
      if (data.phase) {
        if (lastPhaseRef.current && lastPhaseRef.current !== data.phase) {
          triggerPhaseSignal();
        }
        setPhase(data.phase);
        lastPhaseRef.current = data.phase;
      }
      if (data.pieces_placed) setPiecesPlaced(data.pieces_placed);
      if (data.winner) setWinner(data.winner);
    } catch (e) {
      // Fetch error handled
    }
  };

  useEffect(() => {
    fetchState().then(() => {
      // Small delay on first load to let things settle
      setTimeout(triggerPhaseSignal, 500);
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!winner && !isAnimating) fetchState();
    }, 2000);
    return () => clearInterval(interval);
  }, [winner, isAnimating]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [moveHistory]);

  const handleCellClick = async (x, y) => {
    if (winner || isAnimating) return;
    if (mode === "hva" && current !== 1) return;

    if (phase === "PLACEMENT") {
      playPlacement(x, y);
    } else {
      playMovement(x, y);
    }
  };

  const playPlacement = async (x, y) => {
    if (board[x][y] !== 0) return;
    const nextBoard = cloneBoard(board);
    nextBoard[x][y] = current;
    setBoard(nextBoard);
    playThud();
    setPiecesPlaced(prev => ({ ...prev, [current]: prev[current] + 1 }));
    setLastMove(null);
    await sendMove({ type: "place", x, y });
  };

  const getValidMoves = (fx, fy, currentBoard) => {
    const moves = [];
    const neigh = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

    // Dist 1
    neigh.forEach(([dx, dy]) => {
      const nx = fx + dx, ny = fy + dy;
      if (nx >= 0 && nx < 9 && ny >= 0 && ny < 9 && currentBoard[nx][ny] === 0) {
        moves.push({ x: nx, y: ny });
        // Dist 2 from here
        neigh.forEach(([dx2, dy2]) => {
          const nnx = nx + dx2, nny = ny + dy2;
          if (nnx >= 0 && nnx < 9 && nny >= 0 && nny < 9 && currentBoard[nnx][nny] === 0) {
            moves.push({ x: nnx, y: nny });
          }
        });
      }
    });
    // Remove duplicates
    return moves.filter((v, i, a) => a.findIndex(t => t.x === v.x && t.y === v.y) === i);
  };

  useEffect(() => {
    if (selected && phase === "MOVEMENT") {
      setValidMoves(getValidMoves(selected.x, selected.y, board));
    } else {
      setValidMoves([]);
    }
  }, [selected, board, phase]);

  const playMovement = async (x, y) => {
    const clickedCell = board[x][y];
    if (clickedCell === current) {
      // Toggle selection: if already selected, deselect
      if (selected && selected.x === x && selected.y === y) {
        setSelected(null);
      } else {
        setSelected({ x, y });
      }
      return;
    }
    if (selected && clickedCell !== 0 && clickedCell !== current) {
      setSelected(null);
      return;
    }
    if (selected && clickedCell === 0) {
      setLastMove(null);
      await sendMove({ type: "move", fx: selected.x, fy: selected.y, tx: x, ty: y });
      setSelected(null);
    }
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const cloneBoard = (b) => b.map(row => [...row]);

  const addLogEntry = (player, type, fx, fy, tx, ty, capturedCount) => {
    const entry = { player, type, fx, fy, tx, ty, capturedCount, timestamp: Date.now() };
    setMoveHistory(prev => [...prev, entry]);
  };

  const animateMove = async (baseBoard, move, captured, finalResult, isAI = false) => {
    if (isAI) {
      // 1. Clignotement du pion source
      setAIHighlight({ x: move.fx, y: move.fy });
      await sleep(1500);

      // 2. Marquage de la cible (Entourage épais)
      setDestHighlight({ x: move.tx, y: move.ty });
      await sleep(1200);

      if (captured && captured.length > 0) {
        const victims = captured.map(p => ({ x: p[0], y: p[1] }));
        setCapturedStatic(victims);
        await sleep(1200);
      }
    } else {
      // Pour l'humain, on marque juste la cible un court instant
      setDestHighlight({ x: move.tx, y: move.ty });
      await sleep(300);
    }

    // 4. MOUVEMENT PHYSIQUE (Le pion change de place sur la grille)
    const nextBoard = cloneBoard(baseBoard);
    const player = nextBoard[move.fx][move.fy];
    nextBoard[move.fx][move.fy] = 0;
    nextBoard[move.tx][move.ty] = player;
    setBoard(nextBoard);
    playSlide();

    // On maintient les indicateurs un instant pour confirmer l'arrivée
    await sleep(800);
    setAIHighlight(null);
    setDestHighlight(null);

    if (captured && captured.length > 0) {
      const victims = captured.map(p => ({ x: p[0], y: p[1] }));
      setCapturedStatic([]);
      setCapturedHighlight(victims);
      await sleep(1500);
      setCapturedHighlight([]);
    }

    // On ne met lastMove qu'à la toute fin
    setLastMove({ fx: move.fx, fy: move.fy, tx: move.tx, ty: move.ty });
    updateState(finalResult);
    return finalResult.board;
  };

  const sendMove = async (payload) => {
    setLastMove(null);
    setAIHighlight(null);
    setDestHighlight(null);
    setIsAnimating(true);

    try {
      let url = "";
      if (mode === "hva") {
        url = `${API_URL}/play_ai?ai_player=2`;
        if (payload.type === "place") {
          url += `&x=${payload.x}&y=${payload.y}`;
        } else {
          url += `&fx=${payload.fx}&fy=${payload.fy}&tx=${payload.tx}&ty=${payload.ty}`;
        }
      } else {
        url = (payload.type === "place")
          ? `${API_URL}/play?x=${payload.x}&y=${payload.y}`
          : `${API_URL}/move?fx=${payload.fx}&fy=${payload.fy}&tx=${payload.tx}&ty=${payload.ty}`;
      }

      const r = await fetch(url, { method: "POST" });
      const data = await r.json();

      if (data.error || (data.afterHuman && data.afterHuman.error)) {
        playError(); // Buzzer sound for illegal move
        fetchState();
        return;
      }

      let currentVisualBoard = cloneBoard(board);

      if (mode === "hva") {
        const res = data.afterHuman.result;
        if (payload.type === "move") {
          const caps = res.captured?.length || 0;
          addLogEntry(1, "Saut", payload.fx, payload.fy, payload.tx, payload.ty, caps);
          currentVisualBoard = await animateMove(currentVisualBoard, payload, res.captured || [], res, false);
        } else {
          // Instant human placement
          addLogEntry(1, "Place", payload.x, payload.y, null, null, 0);
          updateState(res);
          currentVisualBoard = res.board;
          await sleep(500); // Petit temps mort après placement
        }
      } else {
        if (payload.type === "move") {
          const caps = data.captured?.length || 0;
          addLogEntry(current, "Saut", payload.fx, payload.fy, payload.tx, payload.ty, caps);
          await animateMove(currentVisualBoard, payload, data.captured || [], data, false);
        } else {
          addLogEntry(current, "Place", payload.x, payload.y, null, null, 0);
          updateState(data);
        }
        return;
      }

      // --- AI Turn Processing ---
      if (data.afterAI) {
        const isPlacement = data.afterAI.type === "place";
        await sleep(isPlacement ? 400 : 1500); // Rapide pour placement, lent pour mouvement
        const ai = data.afterAI;
        const aiRes = ai.result;

        if (ai.type === "place") {
          // Pour le placement, on simplifie : pas de délai de ciblage, juste la bordure du dernier coup
          addLogEntry(2, "Place", ai.x, ai.y, null, null, 0);
          setLastMove({ fx: null, fy: null, tx: ai.x, ty: ai.y });
          updateState(aiRes);
        } else {
          const fx = ai.from[0], fy = ai.from[1];
          const tx = ai.to[0], ty = ai.to[1];
          const captured = aiRes.captured || [];

          addLogEntry(2, "Saut", fx, fy, tx, ty, captured.length);
          const aiPayload = { fx, fy, tx, ty };
          // On continue l'animation depuis le plateau modifié par l'humain
          await animateMove(currentVisualBoard, aiPayload, captured, aiRes, true);
        }
      }
    } catch (e) {
      // Move processing error handled
    } finally {
      setIsAnimating(false);
    }
  };

  const updateState = (result) => {
    if (!result) return;
    if (result.board) setBoard(result.board);
    if (result.score) setScore(result.score);
    if (result.pieces_placed) setPiecesPlaced(result.pieces_placed);
    if (result.phase) {
      if (lastPhaseRef.current && lastPhaseRef.current !== result.phase) {
        triggerPhaseSignal();
      }
      setPhase(result.phase);
      lastPhaseRef.current = result.phase;
    }
    if (result.winner) setWinner(result.winner);
    setCurrent(result.nextPlayer ?? 1);
  };

  const handleFinalData = (data) => {
    if (!data) return;
    setBoard(data.board || []);
    setCurrent(data.current ?? 1);
    if (data.score) setScore(data.score);
    if (data.phase) {
      if (lastPhaseRef.current && lastPhaseRef.current !== data.phase) {
        triggerPhaseSignal();
      }
      setPhase(data.phase);
      lastPhaseRef.current = data.phase;
    }
    if (data.pieces_placed) setPiecesPlaced(data.pieces_placed);
    if (data.winner) setWinner(data.winner);
  };

  const reset = async () => {
    setLastPhaseRef(null);
    await fetch(`${API_URL}/reset`, { method: "POST" });
    fetchState();
    setSelected(null);
    setWinner(null);
    setAIHighlight(null);
    setDestHighlight(null);
    setCapturedStatic([]);
    setCapturedHighlight([]);
    setMoveHistory([]);
    setLastMove(null);
    setIsAnimating(false);
    triggerPhaseSignal();
  };

  // Helper to force set ref for reset since lastPhaseRef is a ref
  const setLastPhaseRef = (val) => { lastPhaseRef.current = val; };

  return (
    <div className="app-shell">
      {/* Phase Transition Overlay */}
      {showPhaseOverlay && (
        <div className="phase-overlay">
          <div className="phase-content">
            <div className="phase-msg">
              {phase === "PLACEMENT" ? "PLACEMENT" : "MOUVEMENT"}
            </div>
            <div className="phase-sub">
              {phase === "PLACEMENT" ? "Placez vos 18 pièces" : "Capturez l'adversaire"}
            </div>
          </div>
        </div>
      )}

      <div className="dashboard">
        {/* Board Panel */}
        <div className="board-panel" style={{ textAlign: "center" }}>
          <Board
            board={board}
            onCellClick={handleCellClick}
            selected={selected}
            aiHighlight={aiHighlight}
            destHighlight={destHighlight}
            capturedStatic={capturedStatic}
            capturedHighlight={capturedHighlight}
            lastMove={lastMove}
            isTouchDevice={isTouchDevice}
            validMoves={validMoves}
            phase={phase}
          />
        </div>

        {/* Info Panel */}
        <div className="panel move-log">
          <div className="side-header">
            <div className="logo-container">
              <img src={logo8} alt="Logo 8" className="game-logo" />
            </div>
            <div className="hud-compact">
              <div className={`stat-pill ${current === 1 ? "active" : ""}`}>
                <span className="dot blue"></span> {score[1]}
              </div>
              <div className={`stat-pill ${current === 2 ? "active" : ""}`}>
                <span className="dot orange"></span> {score[2]}
              </div>
            </div>
          </div>

          <div className="controls-row">
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="hvh">H v H</option>
              <option value="hva">H v CPU</option>
            </select>
            <button className="btn-icon" onClick={() => setSoundEnabled(!soundEnabled)} title="Toggle Sound">
              {soundEnabled ? "🔊" : "🔈"}
            </button>
            <button className="btn-icon" onClick={reset} title="Reset Game">🔄</button>
          </div>
          <div className="rules-section">
            <h3>Règles du Jeu</h3>
            <ul>
              <li><strong>Placement</strong>: Placez vos 6 pièces alternativement.</li>
              <li><strong>Mouvement</strong>: 1 ou 2 cases vers une case vide.</li>
              <li><strong>Capture</strong>: Entourez un pion adverse avec 3 des vôtres.</li>
              <li><strong>Victoire</strong>: Réduisez l'ennemi à moins de 3 pions.</li>
            </ul>
          </div>

          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", marginBottom: "1rem" }}>
            Historique des coups
          </h2>
          <div className="log-container">
            {moveHistory.length === 0 && (
              <div style={{ color: "var(--text-dim)", fontStyle: "italic", textAlign: "center", marginTop: "2rem" }}>
                Aucun coup joué pour l'instant
              </div>
            )}
            {moveHistory.map((m, idx) => (
              <div key={m.timestamp || idx} className="log-entry">
                <span className={`entry-player ${m.player === 1 ? "blue" : "orange"}`}>
                  {m.player === 1 ? "Bleu" : "Orange"}
                </span>
                <span className="entry-type">{m.type}</span>
                <span className="entry-coords">
                  {m.type === "Place"
                    ? `(${m.fx},${m.fy})`
                    : `(${m.fx},${m.fy}) → (${m.tx},${m.ty})`}
                </span>
                {m.capturedCount > 0 && (
                  <span className="entry-meta">+{m.capturedCount}</span>
                )}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>

          <div className="phase-footer">
            <div className="status-line">
              <span className="stat-label">Phase:</span>
              <span style={{ fontWeight: 600 }}>
                {phase === "PLACEMENT" ? "Placement" : "Mouvement"}
              </span>
            </div>
            {phase === "PLACEMENT" && (
              <div className="status-line">
                <span className="stat-label">Pieces:</span>
                <span>{piecesPlaced[1]}/6 vs {piecesPlaced[2]}/6</span>
              </div>
            )}
            <div className="turn-indicator" style={{ color: current === 1 ? "var(--accent-blue)" : "var(--accent-orange)" }}>
              {isAnimating ? "..." : `Tour: ${current === 1 ? "Bleu" : "Orange"}`}
            </div>
          </div>
        </div>

      </div>

      {winner && (
        <div className="winner-modal">
          <div className="winner-card">
            <h1 className="title" style={{ fontSize: "4rem" }}>VICTOIRE !</h1>
            <p style={{ fontSize: "1.5rem", marginBottom: "2rem", color: winner === 1 ? "var(--accent-blue)" : "var(--accent-orange)" }}>
              Le joueur {winner === 1 ? "Bleu" : "Orange"} a gagné la partie.
            </p>
            <button className="btn-primary" onClick={reset}>Rejouer une partie</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
