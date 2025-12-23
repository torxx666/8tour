import uuid
import time
from game import Game

class GameManager:
    def __init__(self):
        self.games = {} # game_id -> { "game": GameInstance, "last_active": timestamp, "type": "solo"|"multi" }
        self.cleanup_threshold = 3600 # 1 heure d'inactivité

    def create_game(self, game_type="solo", is_fast=False, ai_difficulty="initie"):
        game_id = str(uuid.uuid4())[:8]
        game = Game()
        game.ai_difficulty = ai_difficulty
        if is_fast:
            game.setup_fast_mode()
        self.games[game_id] = {
            "game": game,
            "last_active": time.time(),
            "type": game_type,
            "players": 1 if game_type == "solo" else 0
        }
        return game_id

    def get_game(self, game_id):
        if game_id in self.games:
            self.games[game_id]["last_active"] = time.time()
            return self.games[game_id]["game"]
        return None

    def join_game(self, game_id):
        if game_id in self.games and self.games[game_id]["type"] == "multi":
            if self.games[game_id]["players"] < 2:
                self.games[game_id]["players"] += 1
                self.games[game_id]["last_active"] = time.time()
                return True
        return False

    def list_waiting_games(self):
        # Liste les parties multi qui attendent un 2ème joueur
        return [gid for gid, data in self.games.items() 
                if data["type"] == "multi" and data["players"] < 2]

    def cleanup(self):
        now = time.time()
        to_delete = [gid for gid, data in self.games.items() 
                     if now - data["last_active"] > self.cleanup_threshold]
        for gid in to_delete:
            del self.games[gid]
        return len(to_delete)

manager = GameManager()
