"""
Lily AI Backend - Main FastAPI Server
Tech Stack: Python + FastAPI + Gemini + Supabase
"""

import os
import sys
import asyncio
import json
import subprocess
from pathlib import Path
from typing import Optional, Dict, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from config.settings import settings
from db import database
from agent.brain import agent, LLMResponse

import mss
import pyperclip


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Lily Backend Starting...")
    print(f"   - Gemini: {'OK' if settings.GEMINI_API_KEY else 'MISSING'}")
    print(f"   - Supabase: {'OK' if settings.SUPABASE_URL else 'MISSING'}")
    yield
    print("Lily Backend Shutting Down...")


app = FastAPI(title="Lily AI Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None


class ToolCallRequest(BaseModel):
    tool_name: str
    arguments: Dict[str, Any]


class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def send_message(self, message: dict, websocket: WebSocket):
        try:
            await websocket.send_json(message)
        except:
            pass

    async def broadcast(self, message: dict):
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except:
                self.disconnect(connection)


manager = ConnectionManager()


def execute_tool(tool_name: str, args: Dict[str, Any]) -> Dict[str, Any]:
    """Execute PC automation tools"""
    try:
        if tool_name == "open_app":
            app_name = args.get("app_name", "")
            subprocess.Popen(app_name, shell=True)
            return {"success": True, "message": f"Opened {app_name}"}
        
        elif tool_name == "close_app":
            app_name = args.get("app_name", "")
            subprocess.run(f"taskkill /IM {app_name}.exe /F", shell=True)
            return {"success": True, "message": f"Closed {app_name}"}
        
        elif tool_name == "create_file":
            file_path = args.get("file_path", "")
            content = args.get("content", "")
            Path(file_path).parent.mkdir(parents=True, exist_ok=True)
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(content)
            return {"success": True, "message": f"Created file: {file_path}"}
        
        elif tool_name == "read_file":
            file_path = args.get("file_path", "")
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
            return {"success": True, "content": content}
        
        elif tool_name == "create_folder":
            folder_path = args.get("folder_path", "")
            Path(folder_path).mkdir(parents=True, exist_ok=True)
            return {"success": True, "message": f"Created folder: {folder_path}"}
        
        elif tool_name == "search_web":
            query = args.get("query", "")
            import webbrowser
            webbrowser.open(f"https://www.google.com/search?q={query}")
            return {"success": True, "message": f"Searching Google for: {query}"}
        
        elif tool_name == "search_youtube":
            query = args.get("query", "")
            import webbrowser
            webbrowser.open(f"https://www.youtube.com/results?search_query={query}")
            return {"success": True, "message": f"Searching YouTube for: {query}"}
        
        elif tool_name == "open_url":
            url = args.get("url", "")
            import webbrowser
            webbrowser.open(url)
            return {"success": True, "message": f"Opened: {url}"}
        
        elif tool_name == "take_screenshot":
            with mss.mss() as sct:
                sct.shot(output=str(BASE_DIR / "screenshot.png"))
            return {"success": True, "path": str(BASE_DIR / "screenshot.png")}
        
        elif tool_name == "set_volume":
            level = args.get("level", 50)
            subprocess.run(f"nircmd.exe setvolume {level}", shell=True)
            return {"success": True, "message": f"Volume set to {level}%"}
        
        elif tool_name == "shutdown_pc":
            subprocess.run("shutdown /s /t 60", shell=True)
            return {"success": True, "message": "PC will shutdown in 60 seconds"}
        
        elif tool_name == "restart_pc":
            subprocess.run("shutdown /r /t 60", shell=True)
            return {"success": True, "message": "PC will restart in 60 seconds"}
        
        elif tool_name == "lock_pc":
            subprocess.run("rundll32.exe user32.dll,LockWorkStation", shell=True)
            return {"success": True, "message": "PC locked"}
        
        elif tool_name == "copy_to_clipboard":
            text = args.get("text", "")
            pyperclip.copy(text)
            return {"success": True, "message": "Copied to clipboard"}
        
        elif tool_name == "read_clipboard":
            text = pyperclip.paste()
            return {"success": True, "content": text}
        
        elif tool_name == "run_command":
            command = args.get("command", "")
            result = subprocess.run(command, shell=True, capture_output=True, text=True)
            return {"success": True, "output": result.stdout, "error": result.stderr}
        
        else:
            return {"success": False, "error": f"Unknown tool: {tool_name}"}
    
    except Exception as e:
        return {"success": False, "error": str(e)}


# ============ ROUTES ============

@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "Lily AI Backend",
        "version": "1.0.0",
        "ai": "Gemini" if settings.GEMINI_API_KEY else "Ollama" if settings.USE_OLLAMA else "None"
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.post("/chat")
async def chat(request: ChatRequest):
    conversation_history = database.get_conversation_history(limit=10)
    history = [{"role": "user" if c["role"] == "user" else "assistant", "content": c["content"]} for c in conversation_history]
    
    response = await agent.chat(request.message, history)
    
    database.add_conversation("user", request.message)
    database.add_conversation("assistant", response.content)
    
    return {
        "response": response.content,
        "tool_calls": response.tool_calls
    }


@app.post("/tool/call")
async def call_tool(request: ToolCallRequest):
    result = execute_tool(request.tool_name, request.arguments)
    database.log_action(f"tool:{request.tool_name}", str(request.arguments), result.get("success", False))
    return result


@app.get("/profile")
async def get_profile():
    profile = database.get_user_profile()
    return profile or {}


@app.post("/profile")
async def save_profile(data: Dict[str, Any]):
    database.save_user_profile(data)
    return {"success": True}


@app.get("/tasks")
async def get_tasks(status: Optional[str] = None):
    return database.get_tasks(status)


@app.post("/tasks")
async def create_task(title: str, description: str = "", due_date: Optional[str] = None, priority: str = "medium"):
    task_id = database.add_task(title, description, due_date, priority)
    return {"success": True, "task_id": task_id}


@app.get("/saved")
async def get_saved_items(item_type: Optional[str] = None):
    return database.get_saved_items(item_type)


@app.post("/saved")
async def save_item(item_type: str, title: str, content: str, source: str = ""):
    item_id = database.save_item(item_type, title, content, source)
    return {"success": True, "item_id": item_id}


@app.get("/screenshot")
async def get_screenshot():
    with mss.mss() as sct:
        sct.shot(output=str(BASE_DIR / "screenshot.png"))
    return {"path": str(BASE_DIR / "screenshot.png")}


@app.post("/analyze-screen")
async def analyze_screen(question: Optional[str] = None):
    with mss.mss() as sct:
        sct.shot(output=str(BASE_DIR / "analyze.png"))
    
    result = await agent.analyze_image(str(BASE_DIR / "analyze.png"), question)
    return {"analysis": result}


# ============ WEBSOCKET ============

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    print(f"Client connected: {websocket.client}")

    try:
        await websocket.send_json({
            "type": "connected",
            "message": "Connected to Lily Backend"
        })

        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                await handle_websocket_message(websocket, message)
            except json.JSONDecodeError:
                await websocket.send_json({
                    "type": "error",
                    "message": "Invalid JSON format"
                })

    except WebSocketDisconnect:
        manager.disconnect(websocket)
        print(f"Client disconnected: {websocket.client}")
    except Exception as e:
        manager.disconnect(websocket)
        print(f"WebSocket error: {e}")


async def handle_websocket_message(websocket: WebSocket, message: dict):
    msg_type = message.get("type")
    payload = message.get("payload", {})

    if msg_type == "chat":
        await handle_chat(websocket, payload)
    elif msg_type == "tool":
        await handle_tool(websocket, payload)
    elif msg_type == "ping":
        await websocket.send_json({"type": "pong", "timestamp": asyncio.get_event_loop().time()})
    else:
        await websocket.send_json({
            "type": "error",
            "message": f"Unknown message type: {msg_type}"
        })


async def handle_chat(websocket: WebSocket, payload: dict):
    user_message = payload.get("message", "")
    
    await websocket.send_json({
        "type": "message",
        "role": "assistant",
        "content": "Thinking..."
    })
    
    conversation_history = database.get_conversation_history(limit=10)
    history = [{"role": "user" if c["role"] == "user" else "assistant", "content": c["content"]} for c in conversation_history]
    
    response = await agent.chat(user_message, history)
    
    database.add_conversation("user", user_message)
    database.add_conversation("assistant", response.content)
    
    await websocket.send_json({
        "type": "message",
        "role": "assistant",
        "content": response.content,
        "tool_calls": response.tool_calls
    })
    
    for tool_call in response.tool_calls:
        tool_name = tool_call.get("name")
        args = tool_call.get("arguments", {})
        
        result = execute_tool(tool_name, args)
        
        await websocket.send_json({
            "type": "tool_result",
            "tool": tool_name,
            "result": result
        })


async def handle_tool(websocket: WebSocket, payload: dict):
    tool_name = payload.get("tool_name")
    arguments = payload.get("arguments", {})
    
    result = execute_tool(tool_name, arguments)
    
    await websocket.send_json({
        "type": "tool_result",
        "tool": tool_name,
        "result": result
    })


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=settings.WEB_PORT)