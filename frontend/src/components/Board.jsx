import React from "react";

export default function Board({ board, onCellClick, selected }) {
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

          return (
            <div
              key={`${i}-${j}`}
              onClick={() => onCellClick(i, j)}
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
