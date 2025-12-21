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
    return game.get_state()

@app.post("/play")
def play(x: int, y: int):
    result = game.play(x, y)
    logger.info("/play called x=%s y=%s result=%s", x, y, result)
    return result

@app.post("/move")
def move_piece(fx: int, fy: int, tx: int, ty: int):
    result = game.move_piece(fx, fy, tx, ty)
    logger.info("/move called fx=%s fy=%s tx=%s ty=%s result=%s", fx, fy, tx, ty, result)
    return result

@app.post("/play_ai")
def play_ai(x: int = -1, y: int = -1, fx: int = -1, fy: int = -1, tx: int = -1, ty: int = -1, ai_player: int = 2):
    """
    Unified endpoint for Human vs AI.
    If Phase is PLACEMENT, Human uses x,y (fx,fy,tx,ty ignored).
    If Phase is MOVEMENT, Human uses fx,fy,tx,ty (x,y ignored).
    Then AI plays immediately if it's AI's turn.
    """
    human_res = {}
    h_type = "place" if game.phase == "PLACEMENT" else "move"
    if game.phase == "PLACEMENT":
        if x == -1 or y == -1:
             return {"error": "Missing coordinates for placement"}
        human_res = game.play(x, y)
    elif game.phase == "MOVEMENT":
        if fx == -1: # check if movement coords provided
             return {"error": "Missing coordinates for movement"}
        human_res = game.move_piece(fx, fy, tx, ty)
    
    human = {"type": h_type, "result": human_res, "error": human_res.get("error")}
    
    logger.info("/play_ai human action result=%s", human)

    ai_result = None
    # if it's AI's turn, compute and play
    if game.current == ai_player and not human.get("error"):
        mv = game.ai_move(ai_player)
        if mv:
            if game.phase == "PLACEMENT":
                # mv is (x, y)
                ax, ay = mv
                ai_res = game.play(ax, ay)
                ai_result = {"type": "place", "x": ax, "y": ay, "result": ai_res}
            elif game.phase == "MOVEMENT":
                # mv is {"from": (r,c), "to": (nx,ny)}
                f, t = mv["from"], mv["to"]
                ai_res = game.move_piece(f[0], f[1], t[0], t[1])
                ai_result = {"type": "move", "from": f, "to": t, "result": ai_res}
            
            logger.info("/play_ai AI played result=%s", ai_result)

    state = game.get_state()
    return {
        "afterHuman": human,
        "afterAI": ai_result,
        "board": state["board"],
        "nextPlayer": state["current"],
        "score": state["score"],
        "phase": state["phase"],
        "pieces_placed": state["pieces_placed"]
    }

@app.post("/reset")
def reset():
    global game
    game = Game()
    return {"status": "reset"}
