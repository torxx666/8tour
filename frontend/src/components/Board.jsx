import React from "react";

export default function Board({ board, onCellClick, selected, aiHighlight, destHighlight, capturedHighlight, capturedStatic, lastMove, isTouchDevice, validMoves, phase, triggerVibration }) {
  if (!board || !Array.isArray(board)) return null;

  const handleTouchStart = (i, j) => {
    if (triggerVibration) triggerVibration("light");
  };

  return (
    <div className="board-grid">
      {board.map((row, i) =>
        row.map((cell, j) => {
          const isWhiteTile = (i + j) % 2 === 0;
          let cellClass = `cell ${isWhiteTile ? "white" : "black"}`;

          const isSelected = selected && selected.x === i && selected.y === j;
          if (isSelected) cellClass += " selected";

          if (aiHighlight && aiHighlight.x === i && aiHighlight.y === j) {
            cellClass += " ai-highlight";
          }

          if (destHighlight && destHighlight.x === i && destHighlight.y === j) {
            cellClass += " dest-highlight";
          }

          if (capturedStatic && capturedStatic.find(p => p.x === i && p.y === j)) {
            cellClass += " captured-static";
          }

          if (capturedHighlight && capturedHighlight.find(p => p.x === i && p.y === j)) {
            cellClass += " captured";
          }

          // Ghost Highlights (Last Move)
          const isLastFrom = lastMove && lastMove.fx === i && lastMove.fy === j;
          const isLastTo = lastMove && lastMove.tx === i && lastMove.ty === j;

          if (isLastFrom) cellClass += " last-from";
          if (isLastTo) cellClass += " last-to";

          // Valid target halo
          const isValidTarget = (phase === "PLACEMENT" && cell === 0) ||
            (validMoves && validMoves.some(m => m.x === i && m.y === j));
          if (isValidTarget) cellClass += " can-drop";

          return (
            <div
              key={`${i}-${j}`}
              onClick={() => onCellClick(i, j)}
              onTouchStart={() => handleTouchStart(i, j)}
              className={cellClass}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onCellClick(i, j);
              }}
            >
              <div className="click-capture" />
              {cell !== 0 && (
                <div className={`piece player${cell}`} />
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
