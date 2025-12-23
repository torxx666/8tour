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
  const [leaderboard, setLeaderboard] = useState([]);
  const [playerName, setPlayerName] = useState("");
  const [activeTab, setActiveTab] = useState("history"); // 'history' or 'leaderboard'
  const [moveHistory, setMoveHistory] = useState([]); // { player, type, from, to, capturedCount }
  const [lastMove, setLastMove] = useState(null); // { fx, fy, tx, ty } for ghost trails
  const [showPhaseOverlay, setShowPhaseOverlay] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showHall, setShowHall] = useState(false);

  const [gameId, setGameId] = useState(null);
  const [myPlayerId, setMyPlayerId] = useState(1); // 1 for Blue, 2 for Orange
  const [gameType, setGameType] = useState("solo"); // 'solo' or 'multi'
  const [view, setView] = useState("lobby"); // 'lobby' or 'game'
  const [waitingGames, setWaitingGames] = useState([]);
  const [isWaiting, setIsWaiting] = useState(false);
  const [processedEventId, setProcessedEventId] = useState(0);
  const [isFast, setIsFast] = useState(false);
  const [aiDifficulty, setAiDifficulty] = useState("initie"); // 'novice', 'initie', 'expert'
  const [aiStatus, setAiStatus] = useState(null);
  const [moveCount, setMoveCount] = useState(0);
  const [gameStartTime, setGameStartTime] = useState(null);
  const [elapsed, setElapsed] = useState(0);

  // Sound Utilities
  const soundEnabledInit = () => {
    const saved = localStorage.getItem("soundEnabled");
    return saved === null ? true : saved === "true";
  };
  const [soundEnabled, setSoundEnabled] = useState(soundEnabledInit);

  const logEndRef = useRef(null);
  const audioCtxRef = useRef(null);
  const lastPhaseRef = useRef(null);

  const API_HOST = window.location.hostname;
  const API_URL = `http://${API_HOST}:8000`;

  useEffect(() => {
    const saved = sessionStorage.getItem("8tour_session");
    if (saved) {
      try {
        const { gid, pid, type, v } = JSON.parse(saved);
        if (gid) {
          setGameId(gid);
          setMyPlayerId(pid);
          setGameType(type);
          setView(v);
        }
      } catch (e) { }
    }
  }, []);

  useEffect(() => {
    if (gameId) {
      sessionStorage.setItem("8tour_session", JSON.stringify({
        gid: gameId,
        pid: myPlayerId,
        type: gameType,
        v: view
      }));
    } else if (view === "lobby") {
      sessionStorage.removeItem("8tour_session");
    }
  }, [gameId, myPlayerId, gameType, view]);

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
    if (!gameId) return;
    try {
      const r = await fetch(`${API_URL}/state?game_id=${gameId}`);
      const data = await r.json();
      if (data.error) return;
      handleFinalData(data);
    } catch (e) {
      // Fetch error handled
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const r = await fetch(`${API_URL}/leaderboard`);
      const data = await r.json();
      setLeaderboard(data);
    } catch (e) { }
  };

  const fetchWaitingGames = async () => {
    try {
      const r = await fetch(`${API_URL}/games/list`);
      const data = await r.json();
      setWaitingGames(data.games || []);
    } catch (e) { }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  useEffect(() => {
    if (view === "lobby") {
      fetchWaitingGames();
      const itv = setInterval(fetchWaitingGames, 3000);
      return () => clearInterval(itv);
    }
  }, [view]);

  // Polling for multiplayer sync
  useEffect(() => {
    if (view === "game" && gameType === "multi" && current !== myPlayerId && !winner) {
      const itv = setInterval(() => {
        if (!isAnimating) fetchState();
      }, 2000);
      return () => clearInterval(itv);
    }
  }, [view, gameType, current, myPlayerId, winner, gameId, isAnimating]);

  useEffect(() => {
    if (gameId && view === "game") {
      fetchState();
    }
  }, [gameId, view]);

  useEffect(() => {
    if (view === "game" && gameStartTime && !winner) {
      const itv = setInterval(() => {
        setElapsed(Math.floor(Date.now() / 1000 - gameStartTime));
      }, 1000);
      return () => clearInterval(itv);
    }
  }, [view, gameStartTime, winner]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [moveHistory]);

  const handleCellClick = async (x, y) => {
    if (winner || isAnimating) return;
    if (current !== myPlayerId) return; // Not your turn (even in hva/solo)
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

    neigh.forEach(([dx, dy]) => {
      const nx1 = fx + dx, ny1 = fy + dy;
      if (nx1 >= 0 && nx1 < 9 && ny1 >= 0 && ny1 < 9 && currentBoard[nx1][ny1] === 0) {
        moves.push({ x: nx1, y: ny1 });
        // Dist 2 from here (BFS style)
        neigh.forEach(([dx2, dy2]) => {
          const nx2 = nx1 + dx2, ny2 = ny1 + dy2;
          if (nx2 >= 0 && nx2 < 9 && ny2 >= 0 && ny2 < 9 && currentBoard[nx2][ny2] === 0) {
            moves.push({ x: nx2, y: ny2 });
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
      setAIHighlight({ x: move.fx, y: move.fy });
      await sleep(1500);
      setDestHighlight({ x: move.tx, y: move.ty });
      await sleep(1200);
      if (captured && captured.length > 0) {
        const victims = captured.map(p => ({ x: p[0], y: p[1] }));
        setCapturedStatic(victims);
        await sleep(1200);
      }
    } else {
      setDestHighlight({ x: move.tx, y: move.ty });
      await sleep(300);
    }

    const nextBoard = cloneBoard(baseBoard);
    const player = nextBoard[move.fx][move.fy];
    nextBoard[move.fx][move.fy] = 0;
    nextBoard[move.tx][move.ty] = player;
    setBoard(nextBoard);
    playSlide();

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
        url = `${API_URL}/play_ai?game_id=${gameId}&ai_player=2`;
        if (payload.type === "place") {
          url += `&x=${payload.x}&y=${payload.y}`;
        } else {
          url += `&fx=${payload.fx}&fy=${payload.fy}&tx=${payload.tx}&ty=${payload.ty}`;
        }
      } else {
        url = (payload.type === "place")
          ? `${API_URL}/play?game_id=${gameId}&x=${payload.x}&y=${payload.y}`
          : `${API_URL}/move?game_id=${gameId}&fx=${payload.fx}&fy=${payload.fy}&tx=${payload.tx}&ty=${payload.ty}`;
      }

      const r = await fetch(url, { method: "POST" });
      if (mode === "hva") setAiStatus("L'IA réfléchit intensément...");
      const data = await r.json();
      if (mode === "hva") setAiStatus("L'IA a trouvé son coup !");

      if (data.error || (data.afterHuman && data.afterHuman.error)) {
        playError();
        fetchState();
        return;
      }

      // Mark this event as processed so handleFinalData (called via poll later) doesn't re-animate
      if (data.event_id) setProcessedEventId(data.event_id);

      let currentVisualBoard = cloneBoard(board);

      if (mode === "hva") {
        const res = data.afterHuman.result;
        if (payload.type === "move") {
          const caps = res.captured?.length || 0;
          addLogEntry(1, "Saut", payload.fx, payload.fy, payload.tx, payload.ty, caps);
          currentVisualBoard = await animateMove(currentVisualBoard, payload, res.captured || [], res, false);
        } else {
          addLogEntry(1, "Place", payload.x, payload.y, null, null, 0);
          updateState(res);
          currentVisualBoard = res.board;
          await sleep(100);
        }
      } else {
        if (payload.type === "move") {
          const caps = data.action_result?.captured?.length || 0;
          addLogEntry(current, "Saut", payload.fx, payload.fy, payload.tx, payload.ty, caps);
          await animateMove(currentVisualBoard, payload, data.action_result?.captured || [], data, false);
        } else {
          addLogEntry(current, "Place", payload.x, payload.y, null, null, 0);
          updateState(data);
        }
        return;
      }

      if (data.afterAI) {
        const isPlacement = data.afterAI.type === "place";
        await sleep(isPlacement ? 50 : 1500);
        const ai = data.afterAI;
        const aiRes = ai.result;

        if (ai.type === "place") {
          addLogEntry(2, "Place", ai.x, ai.y, null, null, 0);
          setLastMove({ fx: null, fy: null, tx: ai.x, ty: ai.y });
          updateState(aiRes);
        } else {
          const fx = ai.from[0], fy = ai.from[1], tx = ai.to[0], ty = ai.to[1];
          const captured = aiRes.captured || [];
          addLogEntry(2, "Saut", fx, fy, tx, ty, captured.length);
          await animateMove(currentVisualBoard, { fx, fy, tx, ty }, captured, aiRes, true);
        }
      }
    } catch (e) {
    } finally {
      setIsAnimating(false);
      setAiStatus(null);
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
    setCurrent(result.current ?? 1);
    if (result.move_count !== undefined) setMoveCount(result.move_count);
    if (result.start_time !== undefined) setGameStartTime(result.start_time);
  };

  const handleFinalData = async (data) => {
    if (!data) return;

    // Check for new external events (multiplayer animations)
    if (data.event_id > processedEventId) {
      setProcessedEventId(data.event_id);
      const ev = data.last_event;
      if (ev && ev.player !== myPlayerId && ev.type === "move") {
        const caps = ev.captured?.length || 0;
        addLogEntry(ev.player, "Saut", ev.fx, ev.fy, ev.tx, ev.ty, caps);
        setIsAnimating(true);
        await animateMove(board, { fx: ev.fx, fy: ev.fy, tx: ev.tx, ty: ev.ty }, ev.captured || [], data, false);
        setIsAnimating(false);
      } else {
        updateState(data);
      }
    } else {
      updateState(data);
    }
  };

  const reset = async () => {
    try {
      setLastPhaseRef(null);
      await fetch(`${API_URL}/reset?game_id=${gameId}`, { method: "POST" });
    } catch (e) {
    } finally {
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
      setPlayerName("");
      setProcessedEventId(0);
      triggerPhaseSignal();
      fetchLeaderboard();
    }
  };

  const createGame = async (type) => {
    try {
      setIsWaiting(true);
      setProcessedEventId(0);
      const r = await fetch(`${API_URL}/games/create?type=${type}&is_fast=${isFast}&ai_difficulty=${aiDifficulty}`, { method: "POST" });
      const data = await r.json();
      setGameId(data.game_id);
      setGameType(type);
      setMyPlayerId(1);
      setMode(type === "solo" ? "hva" : "hvh");
      setView("game");
      const r2 = await fetch(`${API_URL}/state?game_id=${data.game_id}`);
      const data2 = await r2.json();
      handleFinalData(data2);
    } catch (e) { } finally { setIsWaiting(false); }
  };

  const joinGame = async (gid) => {
    try {
      setIsWaiting(true);
      setProcessedEventId(0);
      const r = await fetch(`${API_URL}/games/join/${gid}`, { method: "POST" });
      const data = await r.json();
      if (data.success) {
        setGameId(gid);
        setGameType("multi");
        setMyPlayerId(2);
        setMode("hvh");
        setView("game");
        const r2 = await fetch(`${API_URL}/state?game_id=${gid}`);
        const data2 = await r2.json();
        handleFinalData(data2);
      }
    } catch (e) { } finally { setIsWaiting(false); }
  };

  const setLastPhaseRef = (val) => { lastPhaseRef.current = val; };

  const handleSubmitScore = async () => {
    if (!playerName.trim()) return;
    try {
      await fetch(`${API_URL}/submit_score?name=${encodeURIComponent(playerName)}&score_blue=${score[1]}&score_orange=${score[2]}&winner=${winner}`, { method: "POST" });
    } catch (e) {
    } finally {
      setPlayerName("");
      fetchLeaderboard();
      setActiveTab("history");
      setWinner(null);
      setShowHall(true);
    }
  };

  return (
    <div className="app-shell">
      {view === "lobby" ? (
        <div className="lobby-container">
          <div className="lobby-card panel">
            <h1 className="title" style={{ fontSize: "3.5rem", marginBottom: "1rem", textAlign: "center" }}>8-TOUR</h1>
            <p style={{ color: "var(--text-dim)", marginBottom: "1rem" }}>Jeu de stratégie et de capture</p>

            <div className="speed-selector" style={{ marginBottom: "1.5rem", display: "flex", gap: "1rem", justifyContent: "center" }}>
              <button className={`btn-icon ${!isFast ? "active" : ""}`} onClick={() => setIsFast(false)} style={{ fontSize: "0.85rem", padding: "0.5rem 1rem", opacity: !isFast ? 1 : 0.6, background: !isFast ? "rgba(255,255,255,0.15)" : "transparent" }}>
                ⏳ Mode Standard
              </button>
              <button className={`btn-icon ${isFast ? "active" : ""}`} onClick={() => setIsFast(true)} style={{ fontSize: "0.85rem", padding: "0.5rem 1rem", opacity: isFast ? 1 : 0.6, background: isFast ? "rgba(255,255,255,0.15)" : "transparent" }}>
                ⚡ Mode Express
              </button>
            </div>

            <div className="difficulty-selector" style={{ marginBottom: "2rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <p style={{ color: "var(--text-dim)", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "0.5rem", textAlign: "center" }}>Niveau de l'IA</p>
              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
                <button className={`btn-icon ${aiDifficulty === "novice" ? "active" : ""}`} onClick={() => setAiDifficulty("novice")} style={{ fontSize: "0.8rem", padding: "0.4rem 0.8rem", background: aiDifficulty === "novice" ? "rgba(34, 197, 94, 0.2)" : "transparent", opacity: aiDifficulty === "novice" ? 1 : 0.5, border: aiDifficulty === "novice" ? "1px solid #22c55e" : "1px solid var(--glass-border)" }}>
                  🌱 Novice
                </button>
                <button className={`btn-icon ${aiDifficulty === "initie" ? "active" : ""}`} onClick={() => setAiDifficulty("initie")} style={{ fontSize: "0.8rem", padding: "0.4rem 0.8rem", background: aiDifficulty === "initie" ? "rgba(59, 130, 246, 0.2)" : "transparent", opacity: aiDifficulty === "initie" ? 1 : 0.5, border: aiDifficulty === "initie" ? "1px solid #3b82f6" : "1px solid var(--glass-border)" }}>
                  🎓 Initié
                </button>
                <button className={`btn-icon ${aiDifficulty === "expert" ? "active" : ""}`} onClick={() => setAiDifficulty("expert")} style={{ fontSize: "0.8rem", padding: "0.4rem 0.8rem", background: aiDifficulty === "expert" ? "rgba(239, 68, 68, 0.2)" : "transparent", opacity: aiDifficulty === "expert" ? 1 : 0.5, border: aiDifficulty === "expert" ? "1px solid #ef4444" : "1px solid var(--glass-border)" }}>
                  🔥 Expert
                </button>
              </div>
            </div>

            <div className="lobby-actions">
              <button className="btn-primary lobby-btn" onClick={() => createGame("solo")} disabled={isWaiting}>
                {isWaiting ? "Chargement..." : "🕹️ Jouer contre l'IA"}
              </button>
              <div className="lobby-divider">OU</div>
              <button className="btn-secondary lobby-btn" onClick={() => createGame("multi")} disabled={isWaiting}>
                {isWaiting ? "Chargement..." : "🤝 Créer une Salle Multi"}
              </button>
            </div>
            <div className="waiting-list">
              <h3 style={{ marginBottom: "1rem", color: "var(--text-dim)", fontSize: "1rem", textTransform: "uppercase", letterSpacing: "1px" }}>Salles en attente</h3>
              {waitingGames.length === 0 ? (
                <p style={{ fontStyle: "italic", opacity: 0.6, fontSize: "0.9rem" }}>Aucune salle disponible pour le moment.</p>
              ) : (
                <div className="waiting-grid">
                  {waitingGames.map(gid => (
                    <div key={gid} className="waiting-item">
                      <span>Salle#<strong>{gid}</strong></span>
                      <button className="btn-join" onClick={() => joinGame(gid)}>Rejoindre</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          {showPhaseOverlay && (
            <div className="phase-overlay">
              <div className="phase-content">
                <div className="phase-msg">{phase === "PLACEMENT" ? "PLACEMENT" : "MOUVEMENT"}</div>
                <div className="phase-sub">{phase === "PLACEMENT" ? "Placez vos 6 pièces" : "Capturez l'adversaire"}</div>
              </div>
            </div>
          )}
          <div className="dashboard">
            <div className="board-panel" style={{ textAlign: "center" }}>
              <div className="performance-hud" style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "1.5rem",
                padding: "0.75rem 1.5rem",
                fontSize: "0.9rem",
                color: "var(--text-dim)",
                background: "rgba(255,255,255,0.03)",
                borderRadius: "15px",
                border: "1px solid var(--glass-border)",
                boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
                backdropFilter: "blur(12px)"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ opacity: 0.6 }}>⏱️ TEMPS</span>
                  <strong style={{ color: "var(--text-bright)", minWidth: "3.5rem" }}>{Math.floor(elapsed / 60)}:{(elapsed % 60).toString().padStart(2, '0')}</strong>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ opacity: 0.6 }}>🔢 COUPS</span>
                  <strong style={{ color: "var(--text-bright)" }}>{moveCount}</strong>
                </div>
              </div>
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
              {aiStatus && (
                <div className="ai-thinking-notif" style={{ marginTop: "1rem", fontSize: "0.9rem", color: "var(--accent-orange)", fontWeight: "bold", fontStyle: "italic", animation: "pulse 1.5s infinite" }}>
                  <span className="dot orange" style={{ marginRight: "0.5rem" }}></span>
                  {aiStatus}
                </div>
              )}
            </div>
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
                {gameType === "solo" && (
                  <select value={mode} onChange={(e) => setMode(e.target.value)}>
                    <option value="hvh">H v H</option>
                    <option value="hva">H v CPU</option>
                  </select>
                )}
                <button className="btn-icon" onClick={() => setSoundEnabled(!soundEnabled)} title="Toggle Sound">
                  {soundEnabled ? "🔊" : "🔈"}
                </button>
                <button className="btn-icon" onClick={() => setShowRules(true)} title="Afficher les Règles">📖</button>
                <button className="btn-icon" onClick={() => setShowHall(true)} title="Hall of Fame">🏆</button>
                <button className="btn-icon" onClick={reset} title="Reset Game">🔄</button>
              </div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", marginBottom: "1rem" }}>Historique des coups</h2>
              <div className="side-content">
                <div className="log-container" style={{ flex: 1 }}>
                  {moveHistory.length === 0 && (
                    <div style={{ color: "var(--text-dim)", fontStyle: "italic", textAlign: "center", marginTop: "2rem" }}>Aucun coup joué pour l'instant</div>
                  )}
                  {moveHistory.map((m, idx) => (
                    <div key={m.timestamp || idx} className="log-entry">
                      <span className={`entry-player ${m.player === 1 ? "blue" : "orange"}`}>{m.player === 1 ? "Bleu" : "Orange"}</span>
                      <span className="entry-type">{m.type}</span>
                      <span className="entry-coords">{m.type === "Place" ? `(${m.fx},${m.fy})` : `(${m.fx},${m.fy}) → (${m.tx},${m.ty})`}</span>
                      {m.capturedCount > 0 && <span className="entry-meta">+{m.capturedCount}</span>}
                    </div>
                  ))}
                  <div ref={logEndRef} />
                </div>
              </div>
              <div className="phase-footer">
                <div className="status-line" style={{ marginBottom: "0.5rem", opacity: 0.8 }}>
                  <span>Mode: <strong>{gameType === "multi" ? "En Ligne" : "Solo"}</strong></span>
                  {gameId && <span style={{ color: "var(--accent-orange)" }}>ID: {gameId}</span>}
                </div>
                <div className="turn-indicator" style={{ color: current === 1 ? "var(--accent-blue)" : "var(--accent-orange)" }}>
                  {isAnimating ? "..." : `Tour: ${current === 1 ? "Bleu" : "Orange"}`}
                  {gameType === "multi" && (current === myPlayerId ? " (VOUS)" : " (ATTENTE...)")}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
      {winner && (
        <div className="winner-modal">
          <div className="winner-card">
            <h1 className="title" style={{ fontSize: "4rem" }}>VICTOIRE !</h1>
            <p style={{ fontSize: "1.5rem", marginBottom: "0.5rem", color: winner === 1 ? "var(--accent-blue)" : "var(--accent-orange)" }}>Le joueur {winner === 1 ? "Bleu" : "Orange"} a gagné la partie.</p>
            <div style={{ fontSize: "2.5rem", fontWeight: "bold", color: "var(--text-bright)", marginBottom: "2rem", textShadow: "0 0 20px rgba(255,255,255,0.3)" }}>
              {score[winner]} pts
            </div>
            <div className="score-submission">
              <input type="text" placeholder="Votre nom pour le Hall of Fame..." value={playerName} onChange={(e) => setPlayerName(e.target.value)} maxLength={15} />
              <button className="btn-primary" onClick={handleSubmitScore} disabled={!playerName.trim()}>Enregistrer mon score</button>
            </div>
            <button className="btn-secondary" onClick={reset} style={{ marginTop: "1rem", width: "100%", maxWidth: "400px" }}>Ignorer et Rejouer</button>
          </div>
        </div>
      )}
      {view === "game" && (
        <button className="btn-secondary lobby-back" onClick={() => setView("lobby")} title="Menu Principal">🏠</button>
      )}
      {showRules && (
        <div className="info-modal" onClick={() => setShowRules(false)}>
          <div className="info-card rules-card" onClick={e => e.stopPropagation()}>
            <h2 className="title">Règles du Jeu</h2>
            <div className="rules-content">
              <p>🎯 <strong>But</strong> : Réduire l'adversaire à moins de 3 pions.</p>
              <ul>
                <li><strong>Phase 1 : Placement</strong> (6 pions chacun). Posez alternativement vos pions sur les cases vides.</li>
                <li><strong>Phase 2 : Mouvement</strong>. Défacez vos pions de 1 ou 2 cases vers une case vide.</li>
                <li><strong>Capture</strong> : Entourez un pion ennemi sur 3 côtés pour l'éliminer.</li>
              </ul>
            </div>
            <button className="btn-primary" onClick={() => setShowRules(false)}>C'est compris !</button>
          </div>
        </div>
      )}
      {showHall && (
        <div className="info-modal" onClick={() => setShowHall(false)}>
          <div className="info-card hall-card" onClick={e => e.stopPropagation()}>
            <h2 className="title">Hall of Fame</h2>
            <div className="leaderboard-container scrollable-hall">
              {leaderboard.length === 0 && <div style={{ color: "var(--text-dim)", fontStyle: "italic", textAlign: "center" }}>Le Hall of Fame est encore vide...</div>}
              {leaderboard.filter(e => Math.max(e.score_blue, e.score_orange) > 0).map((entry, idx) => (
                <div key={idx} className={`leaderboard-entry rank-${idx + 1}`}>
                  <div className="rank-badge">{idx + 1}</div>
                  <div className="rank-name">{entry.player_name}</div>
                  <div className="rank-score">{Math.max(entry.score_blue, entry.score_orange)} pts</div>
                  <div className="rank-date">{new Date(entry.date).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
            <button className="btn-secondary" onClick={() => setShowHall(false)} style={{ marginTop: "1.5rem", width: "100%" }}>Fermer</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
