EMPTY = 0
WHITE = 1
BLACK = 2

class Game:
    def __init__(self):
        self.board = [[EMPTY for _ in range(9)] for _ in range(9)]
        self.current = WHITE
        self.players = {WHITE: "White", BLACK: "Black"}
        self.score = {WHITE: 0, BLACK: 0}


    def can_place(self, x, y):
        return self.board[x][y] == EMPTY

    def check_capture(self, x, y, player):
        """
        New capture rule: after placing at (x,y) by `player`, any opponent piece that
        has at least 3 neighbouring `player` pieces (in 8-neighbourhood) is captured.
        This handles center (8 neighbours), edge (5 neighbours) and corner (3 neighbours).
        Returns list of captured opponent positions.
        """
        opponent = WHITE if player == BLACK else BLACK
        captured = []

        # offsets for 8 neighbours
        neigh = [(-1,-1),(-1,0),(-1,1),(0,-1),(0,1),(1,-1),(1,0),(1,1)]

        # examine opponent pieces in the neighbourhood of the placed cell
        for dx, dy in neigh:
            i = x + dx
            j = y + dy
            if 0 <= i < 9 and 0 <= j < 9 and self.board[i][j] == opponent:
                # count how many neighbours around (i,j) are player's pieces
                count = 0
                for ddx, ddy in neigh:
                    ni = i + ddx
                    nj = j + ddy
                    if 0 <= ni < 9 and 0 <= nj < 9:
                        if self.board[ni][nj] == player:
                            count += 1
                # if count >= 3, capture this opponent piece
                if count >= 3:
                    captured.append((i, j))

        return captured

    def ai_move(self, player):
        """Choose an AI move for `player`.
        Strategy:
        1) if any empty cell produces captures, return that move immediately
        2) otherwise, choose the empty cell with highest number of neighbouring allied pieces
        3) if tie or none, pick a random empty cell
        """
        import random

        # try capture moves first
        for i in range(9):
            for j in range(9):
                if self.board[i][j] != EMPTY:
                    continue
                # simulate placement
                self.board[i][j] = player
                caps = self.check_capture(i, j, player)
                self.board[i][j] = EMPTY
                if caps:
                    return (i, j)

        # score empty cells by neighbouring allied pieces
        neigh = [(-1,-1),(-1,0),(-1,1),(0,-1),(0,1),(1,-1),(1,0),(1,1)]
        best_score = -1
        best = None
        for i in range(9):
            for j in range(9):
                if self.board[i][j] != EMPTY:
                    continue
                score = 0
                for dx, dy in neigh:
                    ni = i + dx
                    nj = j + dy
                    if 0 <= ni < 9 and 0 <= nj < 9:
                        if self.board[ni][nj] == player:
                            score += 1
                if score > best_score:
                    best_score = score
                    best = (i, j)
                elif score == best_score and random.random() < 0.3:
                    best = (i, j)

        if best:
            return best

        # fallback: random empty
        empties = [(i, j) for i in range(9) for j in range(9) if self.board[i][j] == EMPTY]
        if empties:
            return random.choice(empties)
        return None

    def play(self, x, y):
        if not self.can_place(x, y):
            import logging
            logging.getLogger("mon_board").info("play invalid move at %s,%s", x, y)
            return {"error": "Invalid move"}

        player = self.current
        self.board[x][y] = player

        eaten = self.check_capture(x, y, player)
        for (i, j) in eaten:
            self.board[i][j] = EMPTY
            self.score[player] += 1

        import logging
        logging.getLogger("mon_board").info("play placed %s at %s,%s captured=%s", player, x, y, eaten)

        # switch player
        self.current = WHITE if player == BLACK else BLACK



        return {
            "board": self.board,
            "captured": eaten,
            "nextPlayer": self.current,
            "score": self.score
        }

    def debug_play(self, x, y):
        """Like play(), but returns detailed debug info about the 4 checked 2x2 squares.
        Each checked square includes the coords and values of its 4 cells, the counts
        and whether that square resulted in a capture.
        """
        if not self.can_place(x, y):
            return {"error": "Invalid move"}

        player = self.current
        # place the piece (so checks are done on the board after placement)
        self.board[x][y] = player

        opponent = WHITE if player == BLACK else BLACK

        # use 8-neighbour rule for debug: check opponent neighbours of the placed cell
        neigh = [(-1,-1),(-1,0),(-1,1),(0,-1),(0,1),(1,-1),(1,0),(1,1)]

        debug_checks = []
        captured = []

        for dx, dy in neigh:
            i = x + dx
            j = y + dy
            if 0 <= i < 9 and 0 <= j < 9 and self.board[i][j] == opponent:
                cell_infos = []
                allyCount = 0
                for ddx, ddy in neigh:
                    ni = i + ddx
                    nj = j + ddy
                    if 0 <= ni < 9 and 0 <= nj < 9:
                        val = self.board[ni][nj]
                        cell_infos.append({"pos": (ni, nj), "val": val})
                        if val == player:
                            allyCount += 1
                    else:
                        cell_infos.append({"pos": (ni, nj), "val": None})

                did_capture = False
                if allyCount >= 3:
                    captured.append((i, j))
                    did_capture = True

                debug_checks.append({
                    "opponent_pos": (i, j),
                    "neighbours": cell_infos,
                    "allyCount": allyCount,
                    "captured": did_capture,
                })

        # apply captures found by neighbour rule
        for (i, j) in captured:
            if 0 <= i < 9 and 0 <= j < 9 and self.board[i][j] == opponent:
                self.board[i][j] = EMPTY
                self.score[player] += 1

        import logging
        logging.getLogger("mon_board").info("debug_play placed %s at %s,%s captured=%s", player, x, y, captured)

        # switch player
        self.current = WHITE if player == BLACK else BLACK

        return {
            "board": self.board,
            "captured": captured,
            "nextPlayer": self.current,
            "score": self.score,
            "debug": debug_checks
        }
