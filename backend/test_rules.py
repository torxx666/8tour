
import http.client
import json
import time

HOST = "127.0.0.1"
PORT = 8000

def request(method, path, params=None):
    conn = http.client.HTTPConnection(HOST, PORT)
    url = path
    if params:
        query = "&".join([f"{k}={v}" for k, v in params.items()])
        url += "?" + query
    
    conn.request(method, url)
    resp = conn.getresponse()
    data = resp.read().decode()
    conn.close()
    return json.loads(data)

def reset():
    request("POST", "/reset")

def get_state():
    return request("GET", "/state")

def play(x, y):
    return request("POST", "/play", {"x": x, "y": y})

def move(fx, fy, tx, ty):
    return request("POST", "/move", {"fx": fx, "fy": fy, "tx": tx, "ty": ty})

def test_game_flow():
    print("Testing Game Flow...")
    reset()
    
    state = get_state()
    assert state.get("phase") == "PLACEMENT"
    print("Phase is correct: PLACEMENT")
    
    print("Simulating Placement...")
    for r in [0, 1]:
        for c in range(9):
            # White turns
            res = play(r, c) # White
            if res.get("error"): print(f"Error White {r},{c}: {res}")
            
            # Black turns (mocking opponent)
            # Find empty spot for black (rows 7,8)
            br = 7 + r
            bc = c
            res = play(br, bc)
            if res.get("error"): print(f"Error Black {br},{bc}: {res}")

    state = get_state()
    print(f"Placed: {state.get('pieces_placed')}")
    pieces = state.get('pieces_placed')
    assert str(pieces.get('1')) == '18' or pieces.get('1') == 18
    assert str(pieces.get('2')) == '18' or pieces.get('2') == 18
    assert state.get("phase") == "MOVEMENT"
    print("Phase switched to MOVEMENT")
    
    # Test valid move: White moves from (1,0) to (2,0) (1 step)
    print("Testing Valid Move (1 step)...")
    res = move(1, 0, 2, 0)
    if res.get("error"): print(f"Move Error: {res}")
    else: print("Move successful")
    
    s = get_state()
    board = s["board"]
    assert board[1][0] == 0
    assert board[2][0] == 1
    
    # Test Black Move (2 step jump over hole)
    # Black at (7,0). Move to (5,0). Mid (6,0) must be empty.
    print("Testing Valid Move (2 step jump)...")
    res = move(7, 0, 5, 0) # Black
    if res.get("error"): print(f"Move Error: {res}")
    else: print("Move successful")
    
    s = get_state()
    board = s["board"]
    assert board[7][0] == 0
    assert board[5][0] == 2
    
    # Test Invalid Move (Occupied dest)
    print("Testing Invalid Move (Occupied)...")
    res = move(2, 0, 5, 0) # White try to land on Black
    assert "error" in res
    print("Blocked correctly")
    
    print("All tests passed!")

if __name__ == "__main__":
    test_game_flow()
