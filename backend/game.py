EMPTY = 0
WHITE = 1
BLACK = 2

PHASE_PLACEMENT = "PLACEMENT"
PHASE_MOVEMENT = "MOVEMENT"

class Game:
    def __init__(self):
        self.board = [[EMPTY for _ in range(9)] for _ in range(9)]
        self.current = WHITE
        self.players = {WHITE: "White", BLACK: "Black"}
        self.score = {WHITE: 0, BLACK: 0}
        self.phase = PHASE_PLACEMENT
        self.pieces_placed = {WHITE: 0, BLACK: 0}
        self.MAX_PIECES = 6

    def can_place(self, x, y):
        return self.board[x][y] == EMPTY

    def play(self, x, y):
        """Handle placement phase moves."""
        if self.phase != PHASE_PLACEMENT:
            return {"error": "Not in placement phase"}
        
        if not self.can_place(x, y):
             return {"error": "Invalid move: Cell not empty"}

        player = self.current
        
        if self.pieces_placed[player] >= self.MAX_PIECES:
             return {"error": "All pieces placed"}

        self.board[x][y] = player
        self.pieces_placed[player] += 1

        # Check for phase switch
        if self.pieces_placed[WHITE] >= self.MAX_PIECES and self.pieces_placed[BLACK] >= self.MAX_PIECES:
            self.phase = PHASE_MOVEMENT
            # Reset current to WHITE to start movement phase fairly? Or keep order?
            # Usually placement ends with BLACK, so WHITE starts moving.
            self.current = WHITE
        else:
            # Switch player only if the other hasn't finished placing?
            # Or always switch, and if one is done, skip?
            # Standard: Alternating turns until both done.
            # If one is done, the other continues placing.
            next_player = BLACK if player == WHITE else WHITE
            if self.pieces_placed[next_player] < self.MAX_PIECES:
                self.current = next_player
            else:
                 # Current player continues if opponent is done
                 pass

        return self.get_state()

    def check_capture(self, x, y, player):
        """
        Capture rule: after moving to (x,y) by `player`, any opponent piece that
        has at least 3 neighbouring `player` pieces (in 8-neighbourhood) is captured.
        Returns list of captured opponent positions.
        """
        opponent = WHITE if player == BLACK else BLACK
        captured = []

        # offsets for 8 neighbours
        neigh = [(-1,-1),(-1,0),(-1,1),(0,-1),(0,1),(1,-1),(1,0),(1,1)]

        # examine opponent pieces in the neighbourhood of the moved-to cell
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

    def check_winner(self):
        if self.phase == PHASE_PLACEMENT:
            return None
            
        # Count pieces
        w = sum(row.count(WHITE) for row in self.board)
        b = sum(row.count(BLACK) for row in self.board)
        
        # If less than 3 pieces, cannot capture anymore (need 3 to surround)
        # So if one has < 3, the other wins.
        if w < 3 and b >= 3:
            return BLACK
        if b < 3 and w >= 3:
            return WHITE
        return None

    def move_piece(self, fx, fy, tx, ty):
        """Handle movement phase moves."""
        if self.phase != PHASE_MOVEMENT:
            return {"error": "Not in movement phase"}

        player = self.current
        
        # Validation
        if not (0 <= fx < 9 and 0 <= fy < 9 and 0 <= tx < 9 and 0 <= ty < 9):
             return {"error": "Out of bounds"}
        
        if self.board[fx][fy] != player:
            return {"error": "Not your piece"}
        
        if self.board[tx][ty] != EMPTY:
            return {"error": "Destination not empty"}

        # Validate path (BFS depth 2)
        valid_destinations = set()
        neigh = [(-1,-1),(-1,0),(-1,1),(0,-1),(0,1),(1,-1),(1,0),(1,1)]
        
        # 1-step moves
        for dx1, dy1 in neigh:
            nx, ny = fx + dx1, fy + dy1
            if 0 <= nx < 9 and 0 <= ny < 9 and self.board[nx][ny] == EMPTY:
                valid_destinations.add((nx, ny))
                # 2-step moves from this empty cell
                for dx2, dy2 in neigh:
                    nnx, nny = nx + dx2, ny + dy2
                    if 0 <= nnx < 9 and 0 <= nny < 9 and self.board[nnx][nny] == EMPTY:
                        valid_destinations.add((nnx, nny))
        
        if (tx, ty) not in valid_destinations:
             return {"error": "Invalid path: destination not reachable in 1-2 steps through empty cells"}

        # Execute move
        self.board[fx][fy] = EMPTY
        self.board[tx][ty] = player
        
        # Check captures
        captured = self.check_capture(tx, ty, player)
        for (cx, cy) in captured:
            self.board[cx][cy] = EMPTY
            self.score[player] += 1

        winner = self.check_winner()

        # Switch player
        self.current = BLACK if player == WHITE else WHITE
        
        return {
            "board": [row[:] for row in self.board],
            "captured": captured,
            "winner": winner,
            "nextPlayer": self.current,
            "score": self.score
        }

    def get_state(self):
        return {
            "board": [row[:] for row in self.board],
            "current": self.current,
            "phase": self.phase,
            "pieces_placed": self.pieces_placed,
            "score": self.score,
            "winner": self.check_winner()
        }

    def ai_move(self, player):
        import random
        
        if self.phase == PHASE_PLACEMENT:
            # Random empty spot
            empties = [(i, j) for i in range(9) for j in range(9) if self.board[i][j] == EMPTY]
            if empties:
                return random.choice(empties)
            return None
        
        elif self.phase == PHASE_MOVEMENT:
            # Find all valid moves
            my_pieces = [(i, j) for i in range(9) for j in range(9) if self.board[i][j] == player]
            valid_moves = []
            
            for (r, c) in my_pieces:
                # Check 8 directions, dist 1 and 2
                for dx in [-1, 0, 1]:
                    for dy in [-1, 0, 1]:
                        if dx == 0 and dy == 0: continue
                        
                        # dist 1
                        nx, ny = r + dx, c + dy
                        if 0 <= nx < 9 and 0 <= ny < 9 and self.board[nx][ny] == EMPTY:
                            valid_moves.append( {"from": (r,c), "to": (nx,ny)} )
                        
                        # dist 2
                        nx2, ny2 = r + 2*dx, c + 2*dy
                        if 0 <= nx2 < 9 and 0 <= ny2 < 9 and self.board[nx2][ny2] == EMPTY:
                             # check mid
                            mx, my = r + dx, c + dy
                            if self.board[mx][my] == EMPTY:
                                valid_moves.append( {"from": (r,c), "to": (nx2,ny2)} )
            
            if not valid_moves:
                return None
                
            # Heuristic: Prioritize captures
            best_move = None
            max_capture = -1
            
            for mv in valid_moves:
                f, t = mv["from"], mv["to"]
                # Simulate move
                self.board[f[0]][f[1]] = EMPTY
                self.board[t[0]][t[1]] = player
                
                caps = len(self.check_capture(t[0], t[1], player))
                
                # Undo move
                self.board[t[0]][t[1]] = EMPTY
                self.board[f[0]][f[1]] = player
                
                if caps > max_capture:
                    max_capture = caps
                    best_move = mv
                elif caps == max_capture and random.random() < 0.3:
                    best_move = mv
            
            if best_move:
                return best_move
            
            if valid_moves:
                return random.choice(valid_moves)
            
            return None

    def reset(self):
        self.__init__()

