import React from "react";

export default function Board({ board, onCellClick, selected, aiHighlight, destHighlight, capturedHighlight, capturedStatic, lastMove }) {
  if (!board || !Array.isArray(board)) return null;

  return (
    <div className="board-grid">
      {board.map((row, i) =>
        row.map((cell, j) => {
          let cellClass = "cell empty";
          if (cell === 1) cellClass = "cell white";
          if (cell === 2) cellClass = "cell black";

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
          if (lastMove && lastMove.fx === i && lastMove.fy === j) {
            cellClass += " ghost-source";
          }
          if (lastMove && lastMove.tx === i && lastMove.ty === j) {
            cellClass += " ghost-dest";
          }

          return (
            <div
              key={`${i}-${j}`}
              onClick={() => onCellClick(i, j)}
              onTouchStart={(e) => {
                e.preventDefault();
                onCellClick(i, j);
              }}
              className={cellClass}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onCellClick(i, j);
              }}
            />
          );
        })
      )}
    </div>
  );
}
