// src/App.jsx
import { useEffect, useState, useRef } from "react";
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

  // Clarity Features
  const [moveHistory, setMoveHistory] = useState([]); // { player, type, from, to, capturedCount }
  const [lastMove, setLastMove] = useState(null); // { fx, fy, tx, ty } for ghost trails

  const logEndRef = useRef(null);
  const API_HOST = window.location.hostname;
  const API_URL = `http://${API_HOST}:8000`;

  const fetchState = async () => {
    try {
      const r = await fetch(`${API_URL}/state`);
      const data = await r.json();
      setBoard(data.board || []);
      setCurrent(data.current ?? 1);
      if (data.score) setScore(data.score);
      if (data.phase) setPhase(data.phase);
      if (data.pieces_placed) setPiecesPlaced(data.pieces_placed);
      if (data.winner) setWinner(data.winner);
    } catch (e) {
      console.error("Fetch error", e);
    }
  };

  useEffect(() => {
    fetchState();
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
    setPiecesPlaced(prev => ({ ...prev, [current]: prev[current] + 1 }));
    setLastMove(null); // clear ghost during active interactive turn
    await sendMove({ type: "place", x, y });
  };

  const playMovement = async (x, y) => {
    const clickedCell = board[x][y];
    if (clickedCell === current) {
      setSelected({ x, y });
      return;
    }
    if (selected && clickedCell !== 0 && clickedCell !== current) {
      setSelected(null);
      return;
    }
    if (selected && clickedCell === 0) {
      setLastMove(null); // clear ghost
      await sendMove({ type: "move", fx: selected.x, fy: selected.y, tx: x, ty: y });
      setSelected(null);
    }
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const cloneBoard = (b) => b.map(row => [...row]);

  const addLogEntry = (player, type, fx, fy, tx, ty, capturedCount) => {
    setMoveHistory(prev => [...prev, { player, type, fx, fy, tx, ty, capturedCount }]);
  };

  const animateMove = async (baseBoard, move, captured, finalResult, isAI = false) => {
    if (isAI) {
      setAIHighlight({ x: move.fx, y: move.fy });
      await sleep(800);
      setAIHighlight(null);
    }

    setDestHighlight({ x: move.tx, y: move.ty });
    await sleep(400);

    const nextBoard = cloneBoard(baseBoard);
    const player = nextBoard[move.fx][move.fy];
    nextBoard[move.fx][move.fy] = 0;
    nextBoard[move.tx][move.ty] = player;
    setBoard(nextBoard);
    await sleep(300);

    if (captured && captured.length > 0) {
      const victims = captured.map(p => ({ x: p[0], y: p[1] }));
      setCapturedStatic(victims);
      await sleep(600);
      setCapturedStatic([]);
      setCapturedHighlight(victims);
      await sleep(2400);
      setCapturedHighlight([]);
    }

    setDestHighlight(null);
    updateState(finalResult);
    // After animation, set the ghost trail
    setLastMove({ fx: move.fx, fy: move.fy, tx: move.tx, ty: move.ty });
    return finalResult.board;
  };

  const sendMove = async (payload) => {
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
        alert(data.error || data.afterHuman.error || "Unknown error");
        fetchState();
        return;
      }

      let currentVisualBoard = board;

      // 1. Human Move
      if (mode === "hva") {
        const res = data.afterHuman.result;
        if (payload.type === "move") {
          const caps = res.captured?.length || 0;
          addLogEntry(1, "Saut", payload.fx, payload.fy, payload.tx, payload.ty, caps);
          currentVisualBoard = await animateMove(currentVisualBoard, payload, res.captured || [], res, false);
        } else {
          addLogEntry(1, "Posé", payload.x, payload.y, null, null, 0);
          updateState(res);
          currentVisualBoard = res.board;
        }
      } else {
        // Human vs Human
        if (payload.type === "move") {
          const caps = data.captured?.length || 0;
          addLogEntry(current, "Saut", payload.fx, payload.fy, payload.tx, payload.ty, caps);
          await animateMove(currentVisualBoard, payload, data.captured || [], data, false);
        } else {
          addLogEntry(current, "Posé", payload.x, payload.y, null, null, 0);
          handleFinalData(data);
        }
        return;
      }

      // 2. AI Move
      if (data.afterAI) {
        const aiRes = data.afterAI.result;
        if (data.afterAI.type === "move") {
          const from = data.afterAI.from;
          const to = data.afterAI.to;
          const caps = aiRes.captured?.length || 0;
          addLogEntry(2, "Saut", from[0], from[1], to[0], to[1], caps);
          const aiPayload = { fx: from[0], fy: from[1], tx: to[0], ty: to[1] };
          await animateMove(currentVisualBoard, aiPayload, aiRes.captured || [], aiRes, true);
        } else {
          // AI Placement or skipped?
          // If placement, add log
          if (aiRes.board) {
            // Find where it was placed? 
            // Simplification: just log "IA a posé"
            addLogEntry(2, "Posé", -1, -1, -1, -1, 0);
          }
          updateState(aiRes);
        }
      }
    } catch (e) {
      console.error("Move processing error:", e);
    } finally {
      setIsAnimating(false);
    }
  };

  const updateState = (result) => {
    if (!result) return;
    if (result.board) setBoard(result.board);
    if (result.score) setScore(result.score);
    if (result.pieces_placed) setPiecesPlaced(result.pieces_placed);
    if (result.phase) setPhase(result.phase);
    if (result.winner) setWinner(result.winner);
    setCurrent(result.nextPlayer ?? 1);
  };

  const handleFinalData = (data) => {
    if (!data) return;
    setBoard(data.board || []);
    setCurrent(data.current ?? 1);
    if (data.score) setScore(data.score);
    if (data.phase) setPhase(data.phase);
    if (data.pieces_placed) setPiecesPlaced(data.pieces_placed);
    if (data.winner) setWinner(data.winner);
  };

  const reset = async () => {
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
  };

  return (
    <div className="app-shell">
      <div className="dashboard">

        {/* Left Aspect: The Board and Stats */}
        <div className="panel" style={{ textAlign: "center" }}>
          <h1 className="title">MON BOARD</h1>

          <div className="hud">
            <div className={`stat-card ${current === 1 ? "active" : ""}`}>
              <div className="stat-label">Joueur Bleu</div>
              <div className="stat-value">{score[1]}</div>
            </div>
            <div className={`stat-card orange ${current === 2 ? "active" : ""}`}>
              <div className="stat-label">Joueur Orange</div>
              <div className="stat-value">{score[2]}</div>
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
          />

          <div style={{ marginTop: "2rem", display: "flex", gap: "1rem", justifyContent: "center" }}>
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="hvh">Humain vs Humain</option>
              <option value="hva">Humain vs Ordi</option>
            </select>
            <button className="btn-secondary" onClick={reset}>Reset</button>
          </div>
        </div>

        {/* Right Aspect: Move Log and Status */}
        <div className="panel move-log">
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
              <div key={idx} className="log-entry">
                <span className={`entry-player ${m.player === 1 ? "blue" : "orange"}`}>
                  {m.player === 1 ? "Bleu" : "Orange"}
                </span>
                <span>{m.type}</span>
                {m.type === "Saut" && (
                  <span style={{ color: "var(--text-dim)" }}> {`(${m.fx},${m.fy}) → (${m.tx},${m.ty})`}</span>
                )}
                {m.capturedCount > 0 && (
                  <span className="entry-meta">+{m.capturedCount} captures</span>
                )}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>

          <div style={{ marginTop: "2rem", paddingTop: "1rem", borderTop: "1px solid var(--glass-border)" }}>
            <div className="stat-label">Phase Actuelle</div>
            <div style={{ fontWeight: 600, fontSize: "1.1rem" }}>
              {phase === "PLACEMENT" ? "Phase de Placement" : "Phase de Mouvement"}
            </div>
            {phase === "PLACEMENT" && (
              <div style={{ fontSize: "0.85rem", color: "var(--text-dim)", marginTop: "0.5rem" }}>
                Pièces posées: {piecesPlaced[1]}/18 vs {piecesPlaced[2]}/18
              </div>
            )}
            <div style={{ marginTop: "1rem", fontSize: "0.9rem", color: current === 1 ? "var(--accent-blue)" : "var(--accent-orange)" }}>
              {isAnimating ? "Animation en cours..." : `C'est au tour du joueur ${current === 1 ? "Bleu" : "Orange"}`}
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
