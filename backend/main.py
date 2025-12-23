from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from game import Game
import logging
from database import init_db, add_score, get_leaderboard
from manager import manager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("mon_board")

app = FastAPI()
init_db() # Ensure DB is ready

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/state")
def get_state(game_id: str):
    game = manager.get_game(game_id)
    if not game: return {"error": "Game not found"}
    return game.get_state()

@app.post("/play")
def play(game_id: str, x: int, y: int):
    game = manager.get_game(game_id)
    if not game: return {"error": "Game not found"}
    result = game.play(x, y)
    logger.info("/play called [%s] x=%s y=%s result=%s", game_id, x, y, result)
    state = game.get_state()
    state["action_result"] = result
    return state

@app.post("/move")
def move_piece(game_id: str, fx: int, fy: int, tx: int, ty: int):
    game = manager.get_game(game_id)
    if not game: return {"error": "Game not found"}
    result = game.move_piece(fx, fy, tx, ty)
    logger.info("/move called [%s] fx=%s fy=%s tx=%s ty=%s result=%s", game_id, fx, fy, tx, ty, result)
    state = game.get_state()
    state["action_result"] = result
    return state

@app.post("/play_ai")
def play_ai(game_id: str, x: int = -1, y: int = -1, fx: int = -1, fy: int = -1, tx: int = -1, ty: int = -1, ai_player: int = 2):
    game = manager.get_game(game_id)
    if not game: return {"error": "Game not found"}
    
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
    
    logger.info("/play_ai [%s] human action result=%s", game_id, human)

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
            
            logger.info("/play_ai [%s] AI played result=%s", game_id, ai_result)

    state = game.get_state()
    state.update({
        "afterHuman": human,
        "afterAI": ai_result
    })
    return state

@app.post("/reset")
def reset(game_id: str):
    game = manager.get_game(game_id)
    if game: game.reset()
    return game.get_state() if game else {"status": "not_found"}

@app.post("/games/create")
def create_game(type: str = "solo", is_fast: bool = False, ai_difficulty: str = "initie"):
    game_id = manager.create_game(type, is_fast, ai_difficulty)
    return {"game_id": game_id}

@app.post("/games/join/{game_id}")
def join_game(game_id: str):
    success = manager.join_game(game_id)
    return {"success": success}

@app.get("/valid_moves")
def valid_moves(game_id: str, x: int, y: int):
    game = manager.get_game(game_id)
    if not game: return {"error": "Game not found"}
    # Filter moves for this specific piece
    all_m = game._get_all_moves(game.board[x][y])
    piece_moves = [m["to"] for m in all_m if m["from"] == (x, y)]
    return {"moves": [{"x": m[0], "y": m[1]} for m in piece_moves]}

@app.get("/games/list")
def list_games():
    manager.cleanup() # aprovechamos para limpiar
    return {"games": manager.list_waiting_games()}

@app.post("/submit_score")
def submit_score(name: str, score_blue: int, score_orange: int, winner: int):
    add_score(name, score_blue, score_orange, winner)
    return {"status": "success"}

@app.get("/leaderboard")
def leaderboard(limit: int = 10):
    return get_leaderboard(limit)
