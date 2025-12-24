import random
import time

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
        self.ai_difficulty = "initie" 
        self.phase = PHASE_PLACEMENT
        self.pieces_placed = {WHITE: 0, BLACK: 0}
        self.is_fast = False
        self.MAX_PIECES = 18
        self.last_event = None
        self.event_id = 0
        self.last_board_snapshot = None # For loop prevention
        self.start_time = time.time()
        self.move_count = 0

    def can_place(self, x, y):
        return self.board[x][y] == EMPTY

    def play(self, x, y):
        """Handle placement phase moves."""
        if self.phase != PHASE_PLACEMENT:
            return {"error": "Not in placement phase"}
        
        if not self.can_place(x, y):
             return {"error": "Invalid move: Cell not empty"}

        player = self.current
        self.move_count += 1
        
        if self.pieces_placed[player] >= self.MAX_PIECES:
             return {"error": "All pieces placed"}

        self.board[x][y] = player
        self.pieces_placed[player] += 1
        self.event_id += 1
        self.last_event = {"type": "place", "player": player, "x": x, "y": y, "id": self.event_id}

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

        self.last_board_snapshot = [row[:] for row in self.board]
        return self.get_state()

    def setup_fast_mode(self):
        """Pre-place all pieces randomly and skip to MOVEMENT phase."""
        self.is_fast = True
        empties = [(i, j) for i in range(9) for j in range(9)]
        random.shuffle(empties)
        
        # Place 6 White and 6 Black pieces
        for _ in range(self.MAX_PIECES):
            wx, wy = empties.pop()
            self.board[wx][wy] = WHITE
            self.pieces_placed[WHITE] += 1
            
            bx, by = empties.pop()
            self.board[bx][by] = BLACK
            self.pieces_placed[BLACK] += 1
            
        self.phase = PHASE_MOVEMENT
        self.current = WHITE
        self.event_id += 1
        self.last_event = {"type": "fast_setup", "id": self.event_id}

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
        
        # If less than 3 pieces, cannot capture anymore
        if w < 3 and b >= 3:
            winner = BLACK
        elif b < 3 and w >= 3:
            winner = WHITE
        else:
            return None

        # PERFORMANCE SCORING FORMULA
        # Base: Delta * 1000
        delta = abs(w - b)
        base_score = delta * 1000
        
        # Efficiency Bonus: Fewer moves = more points
        # Assuming a standard game might take 30-60 moves
        eff_bonus = max(0, 5000 - self.move_count * 50)
        
        # Speed Bonus: Faster play = more points
        duration = time.time() - self.start_time
        speed_bonus = max(0, 10000 - int(duration) * 10)
        
        final_score = base_score + eff_bonus + speed_bonus
        
        self.score = {winner: final_score, (WHITE if winner == BLACK else BLACK): 0}
        return winner

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

        # Validate path (BFS depth 2 - allows any cell reachable in 1-2 steps through empty cells)
        valid_destinations = set()
        neigh = [(-1,-1),(-1,0),(-1,1),(0,-1),(0,1),(1,-1),(1,0),(1,1)]
        
        # 1-step moves
        for dx1, dy1 in neigh:
            nx1, ny1 = fx + dx1, fy + dy1
            if 0 <= nx1 < 9 and 0 <= ny1 < 9 and self.board[nx1][ny1] == EMPTY:
                valid_destinations.add((nx1, ny1))
                # 2-step moves from the first empty cell
                for dx2, dy2 in neigh:
                    nx2, ny2 = nx1 + dx2, ny1 + dy2
                    if 0 <= nx2 < 9 and 0 <= ny2 < 9 and self.board[nx2][ny2] == EMPTY:
                        valid_destinations.add((nx2, ny2))
        
        if (tx, ty) not in valid_destinations:
             return {"error": "Invalid path: destination not reachable in 1-2 steps through empty cells"}

        # Execute move
        self.board[fx][fy] = EMPTY
        self.board[tx][ty] = player
        self.move_count += 1
        
        # Check captures
        captured = self.check_capture(tx, ty, player)
        for (cx, cy) in captured:
            self.board[cx][cy] = EMPTY

        winner = self.check_winner()

        # Switch player
        self.current = BLACK if player == WHITE else WHITE
        
        self.event_id += 1
        self.last_event = {
            "type": "move", 
            "player": player, 
            "fx": fx, "fy": fy, "tx": tx, "ty": ty, 
            "captured": captured,
            "id": self.event_id
        }
        
        # Save current board for loop prevention
        self.last_board_snapshot = [row[:] for row in self.board]

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
            "winner": self.check_winner(),
            "last_event": self.last_event,
            "event_id": self.event_id,
            "ai_difficulty": self.ai_difficulty,
            "max_pieces": self.MAX_PIECES,
            "move_count": self.move_count,
            "start_time": self.start_time
        }

    def _get_all_moves(self, player):
        """Helper to get all valid moves for minimax. Returns list of ((fx,fy), (tx,ty))."""
        my_pieces = [(i, j) for i in range(9) for j in range(9) if self.board[i][j] == player]
        all_moves = []
        neigh = [(-1,-1),(-1,0),(-1,1),(0,-1),(0,1),(1,-1),(1,0),(1,1)]
        for r, c in my_pieces:
            # First neighbors
            for dx, dy in neigh:
                nx1, ny1 = r + dx, c + dy
                if 0 <= nx1 < 9 and 0 <= ny1 < 9 and self.board[nx1][ny1] == EMPTY:
                    all_moves.append(((r, c), (nx1, ny1)))
                    # Second neighbors from the first empty cell
                    for dx2, dy2 in neigh:
                        nx2, ny2 = nx1 + dx2, ny1 + dy2
                        if 0 <= nx2 < 9 and 0 <= ny2 < 9 and self.board[nx2][ny2] == EMPTY:
                            if (nx2, ny2) != (r, c):
                                all_moves.append(((r, c), (nx2, ny2)))
        # Unique moves
        seen = set()
        unique = []
        for m in all_moves:
            if m not in seen:
                unique.append({"from": m[0], "to": m[1]})
                seen.add(m)
        return unique

    def evaluate(self, player):
        opponent = WHITE if player == BLACK else BLACK
        p_count = 0
        o_count = 0
        for row in self.board:
            for cell in row:
                if cell == player: p_count += 1
                elif cell == opponent: o_count += 1
        
        if o_count < 3: return 100000
        if p_count < 3: return -100000
        
        # Tactical evaluation
        threat_score = 0
        neigh = [(-1,-1),(-1,0),(-1,1),(0,-1),(0,1),(1,-1),(1,0),(1,1)]
        
        for r in range(9):
            for c in range(9):
                cell = self.board[r][c]
                if cell == EMPTY: continue
                
                # Count enemies around
                opp = WHITE if cell == BLACK else BLACK
                enemies = 0
                for dr, dc in neigh:
                    nr, nc = r+dr, c+dc
                    if 0 <= nr < 9 and 0 <= nc < 9 and self.board[nr][nc] == opp:
                        enemies += 1
                
                # If a piece is surrounded by 2 enemies, it's in danger (need 3 to capture)
                # If it's surrounded by 3+, it's toast or capturing
                val = 0
                if enemies == 2: val = -50
                if enemies >= 3: val = -200
                
                if cell == player: threat_score += val
                else: threat_score -= val # Enemy danger is good
        
        # Center bonus (subtle) to encourage occupation
        center_bonus = 0
        for r in range(9):
            for c in range(9):
                if self.board[r][c] == player:
                    dist_to_center = abs(r-4) + abs(c-4)
                    center_bonus += (8 - dist_to_center)

        return (p_count - o_count) * 1000 + threat_score + center_bonus

    def minimax(self, depth, is_maximizing, player, alpha, beta):
        winner = self.check_winner()
        if depth == 0 or winner:
            opp_val = WHITE if player == BLACK else BLACK
            return self.evaluate(player if is_maximizing else opp_val)

        moves = self._get_all_moves(player if is_maximizing else (WHITE if player == BLACK else BLACK))
        if not moves: return self.evaluate(player)

        if is_maximizing:
            max_eval = -float('inf')
            for m in moves:
                f, t = m["from"], m["to"]
                # Save & Apply
                caps = self.check_capture(t[0], t[1], player)
                self.board[f[0]][f[1]] = EMPTY
                self.board[t[0]][t[1]] = player
                for cx, cy in caps: self.board[cx][cy] = EMPTY
                
                eval = self.minimax(depth - 1, False, player, alpha, beta)
                
                # Undo
                opp = WHITE if player == BLACK else BLACK
                for cx, cy in caps: self.board[cx][cy] = opp
                self.board[t[0]][t[1]] = EMPTY
                self.board[f[0]][f[1]] = player
                
                max_eval = max(max_eval, eval)
                alpha = max(alpha, eval)
                if beta <= alpha: break
            return max_eval
        else:
            min_eval = float('inf')
            opp = WHITE if player == BLACK else BLACK
            for m in moves:
                f, t = m["from"], m["to"]
                # Save & Apply
                caps = self.check_capture(t[0], t[1], opp)
                self.board[f[0]][f[1]] = EMPTY
                self.board[t[0]][t[1]] = opp
                for cx, cy in caps: self.board[cx][cy] = EMPTY
                
                eval = self.minimax(depth - 1, True, player, alpha, beta)
                
                # Undo
                for cx, cy in caps: self.board[cx][cy] = player
                self.board[t[0]][t[1]] = EMPTY
                self.board[f[0]][f[1]] = opp
                
                min_eval = min(min_eval, eval)
                beta = min(beta, eval)
                if beta <= alpha: break
            return min_eval

    def ai_move(self, player):
        if self.phase == PHASE_PLACEMENT:
            empties = [(i, j) for i in range(9) for j in range(9) if self.board[i][j] == EMPTY]
            return random.choice(empties) if empties else None
        
        if self.ai_difficulty == "novice":
            moves = self._get_all_moves(player)
            return random.choice(moves) if moves else None

        if self.ai_difficulty == "expert":
            best_val = -float('inf')
            best_move = None
            moves = self._get_all_moves(player)
            if not moves: return None
            
            # Use Alpha-Beta at top level too
            alpha = -float('inf')
            beta = float('inf')
            
            for m in moves:
                f, t = m["from"], m["to"]
                # Save & Apply
                caps = self.check_capture(t[0], t[1], player)
                self.board[f[0]][f[1]] = EMPTY
                self.board[t[0]][t[1]] = player
                for cx, cy in caps: self.board[cx][cy] = EMPTY
                
                val = self.minimax(4, False, player, alpha, beta)
                
                # Undo
                opp = WHITE if player == BLACK else BLACK
                for cx, cy in caps: self.board[cx][cy] = opp
                self.board[t[0]][t[1]] = EMPTY
                self.board[f[0]][f[1]] = player
                
                # Small penalty for repeating the immediate previous state
                if self.last_board_snapshot:
                    if self.board == self.last_board_snapshot:
                        val -= 500 # Strong deterrent

                if val > best_val:
                    best_val = val
                    best_move = m
                    alpha = max(alpha, val)
            return best_move

        # Default: Initié (Greedy capture)
        valid_moves = self._get_all_moves(player)
        if not valid_moves: return None
        best_move = None
        max_capture = -1
        for mv in valid_moves:
            f, t = mv["from"], mv["to"]
            caps = len(self.check_capture(t[0], t[1], player))
            if caps > max_capture:
                max_capture = caps
                best_move = mv
            elif caps == max_capture and random.random() < 0.3:
                best_move = mv
        return best_move or random.choice(valid_moves)

    def reset(self):
        saved_fast = self.is_fast
        saved_diff = self.ai_difficulty
        self.__init__()
        self.is_fast = saved_fast
        self.ai_difficulty = saved_diff
        self.last_board_snapshot = None
        if saved_fast:
            self.setup_fast_mode()

