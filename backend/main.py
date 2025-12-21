from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from game import Game
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("mon_board")

app = FastAPI()
game = Game()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/state")
def get_state():
    return {
        "board": game.board,
        "current": game.current,
        "score": game.score 
    }

@app.post("/play")
def play(x: int, y: int):
    result = game.play(x, y)
    logger.info("/play called x=%s y=%s result=%s", x, y, {k: result.get(k) for k in ("captured","error","nextPlayer")})
    return result


@app.post("/play_debug")
def play_debug(x: int, y: int):
    result = game.debug_play(x, y)
    # Log summary of debug info (which squares captured and counts)
    try:
        dbg = result.get("debug", [])
        summary = []
        for idx, s in enumerate(dbg):
            summary.append({"idx": idx, "myCount": s.get("myCount"), "opponentPos": s.get("opponentPos"), "captured": s.get("captured")})
        logger.info("/play_debug x=%s y=%s summary=%s", x, y, summary)
    except Exception:
        logger.exception("Error while logging play_debug result")
    return result


@app.post("/play_ai")
def play_ai(x: int, y: int, ai_player: int = 2):
    """Play a human move at x,y then (if configured) let AI (ai_player) play immediately.
    Returns both outcomes and final board state.
    """
    human = game.play(x, y)
    logger.info("/play_ai human played x=%s y=%s result=%s", x, y, {k: human.get(k) for k in ("captured","error","nextPlayer")})

    ai_result = None
    ai_move = None
    # if it's AI's turn, compute and play
    if game.current == ai_player:
        mv = game.ai_move(ai_player)
        if mv:
            ax, ay = mv
            ai_res = game.play(ax, ay)
            ai_result = {"x": ax, "y": ay, "result": ai_res}
            logger.info("/play_ai AI played x=%s y=%s result=%s", ax, ay, {k: ai_res.get(k) for k in ("captured","nextPlayer")})

    return {
        "afterHuman": human,
        "afterAI": ai_result,
        "board": game.board,
        "nextPlayer": game.current,
        "score": game.score,
    }

@app.post("/reset")
def reset():
    global game
    game = Game()
    return {"status": "reset"}
