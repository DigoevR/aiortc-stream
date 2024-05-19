from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles


app = FastAPI()


class RoomManager:
    def __init__(self):
        self.active_rooms = {}

    def connect(self, room_id: str, websocket: WebSocket):
        if room_id not in self.active_rooms:
            self.active_rooms[room_id] = set()
        self.active_rooms[room_id].add(websocket)

    def disconnect(self, room_id: str, websocket: WebSocket):
        self.active_rooms[room_id].remove(websocket)
        if not self.active_rooms[room_id]:
            del self.active_rooms[room_id]


room_manager = RoomManager()


@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    await websocket.accept()
    room_manager.connect(room_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            for ws in room_manager.active_rooms[room_id]:
                if ws != websocket:
                    await ws.send_text(data)
    except WebSocketDisconnect:
        room_manager.disconnect(room_id, websocket)


app.mount("/", StaticFiles(directory="client", html=True), name="static")
