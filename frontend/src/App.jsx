// src/App.jsx
import { useEffect, useState } from "react";
import Board from "./components/Board";

function App() {
  const [board, setBoard] = useState([]);
  const [current, setCurrent] = useState(1);
  const [score, setScore] = useState({ 1: 0, 2: 0 });
  const [selected, setSelected] = useState(null); // ✅ nouvel état
  const [mode, setMode] = useState("hvh"); // 'hvh' or 'hva'

  const fetchState = async () => {
    const r = await fetch("http://127.0.0.1:8000/state");
    const data = await r.json();
    setBoard(data.board || []);
    setCurrent(data.current ?? 1);
    if (data.score) setScore(data.score);
  };

  useEffect(() => {
    const interval = setInterval(fetchState, 1000);
    return () => clearInterval(interval);
  }, []);

  const play = async (x, y) => {
    // highlight 300ms avant d’envoyer le coup
    setSelected({ x, y });
    setTimeout(async () => {
      let data = null;
      if (mode === "hva") {
        const r = await fetch(`http://127.0.0.1:8000/play_ai?x=${x}&y=${y}`, { method: "POST" });
        data = await r.json();
        setBoard(data.board || []);
        setCurrent(data.nextPlayer ?? 1);
        if (data.score) setScore(data.score);
      } else {
        const r = await fetch(`http://127.0.0.1:8000/play?x=${x}&y=${y}`, { method: "POST" });
        data = await r.json();
        setBoard(data.board || []);
        setCurrent(data.nextPlayer ?? 1);
        if (data.score) setScore(data.score);
      }
      setSelected(null);
    }, 300);
  };

  const reset = async () => {
    await fetch("http://127.0.0.1:8000/reset", { method: "POST" });
    fetchState();
  };

  return (
    <div className="app-shell">
      <div className="panel" style={{ textAlign: "center" }}>
        <h2 className="title">MON BOARD — Joueur: {current === 1 ? "Bleu" : "Orange"}</h2>

        <div className="hud">
          <div className="panel" style={{ padding: "0.6rem 1rem" }}>
            <strong>Bleu</strong>
            <div style={{ color: "#fff" }}>{score[1]}</div>
          </div>
          <div className="panel" style={{ padding: "0.6rem 1rem" }}>
            <strong>Orange</strong>
            <div style={{ color: "#fff" }}>{score[2]}</div>
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <Board board={board} onCellClick={play} selected={selected} />
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={{ marginRight: 8 }}>Mode:</label>
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="hvh">Humain vs Humain</option>
            <option value="hva">Humain vs Ordi</option>
          </select>
        </div>

        <div style={{ marginTop: 18 }}>
          <button onClick={reset}>Reset Game</button>
        </div>
      </div>
    </div>
  );
}

export default App;
