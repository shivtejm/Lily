import json
import asyncio
import base64
from typing import Optional, Dict, Any, List
import httpx

from config.settings import settings
from db import database


class LLMResponse:
    def __init__(self, content: str, tool_calls: Optional[List[Dict]] = None):
        self.content = content
        self.tool_calls = tool_calls or []


class AIAgent:
    def __init__(self):
        self.tools = []
        self.system_prompt = self._build_system_prompt()

    def _build_system_prompt(self) -> str:
        return """You are Lily, a helpful AI assistant that can control the user's computer.

Available capabilities:
- Open and close applications
- Create, read, and delete files and folders
- Take screenshots and analyze what's on screen
- Control system (volume, shutdown, restart, lock)
- Search the web, YouTube, and Google
- Copy/paste from clipboard
- Execute terminal commands
- Control browser (open URL, search, play YouTube)

When you need to perform an action, respond in this JSON format for tool calls:
{"tool": "tool_name", "args": {"arg1": "value1"}}

If no tool is needed, just respond normally to the user in plain text.

Be concise, helpful, and friendly. Use Hindi/English mixed when appropriate."""

    def get_tool_schemas(self) -> List[Dict]:
        return [
            {
                "type": "function",
                "function": {
                    "name": "open_app",
                    "description": "Open an application by name",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "app_name": {"type": "string", "description": "Name of the app to open (e.g., chrome, notepad, vscode)"}
                        },
                        "required": ["app_name"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "close_app",
                    "description": "Close a running application",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "app_name": {"type": "string", "description": "Name of the app to close"}
                        },
                        "required": ["app_name"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "create_file",
                    "description": "Create a new file with content",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "file_path": {"type": "string", "description": "Full path to the file"},
                            "content": {"type": "string", "description": "Content to write"}
                        },
                        "required": ["file_path", "content"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "read_file",
                    "description": "Read content from a file",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "file_path": {"type": "string", "description": "Full path to the file"}
                        },
                        "required": ["file_path"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "create_folder",
                    "description": "Create a new folder",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "folder_path": {"type": "string", "description": "Full path for the new folder"}
                        },
                        "required": ["folder_path"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "search_web",
                    "description": "Search the web for information",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "query": {"type": "string", "description": "Search query"}
                        },
                        "required": ["query"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "search_youtube",
                    "description": "Search YouTube for videos",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "query": {"type": "string", "description": "Video search query"}
                        },
                        "required": ["query"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "take_screenshot",
                    "description": "Take a screenshot of the screen",
                    "parameters": {
                        "type": "object",
                        "properties": {}
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "set_volume",
                    "description": "Set system volume level",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "level": {"type": "integer", "description": "Volume level 0-100"}
                        },
                        "required": ["level"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "shutdown_pc",
                    "description": "Shut down the computer",
                    "parameters": {
                        "type": "object",
                        "properties": {}
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "restart_pc",
                    "description": "Restart the computer",
                    "parameters": {
                        "type": "object",
                        "properties": {}
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "lock_pc",
                    "description": "Lock the computer screen",
                    "parameters": {
                        "type": "object",
                        "properties": {}
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "copy_to_clipboard",
                    "description": "Copy text to clipboard",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "text": {"type": "string", "description": "Text to copy"}
                        },
                        "required": ["text"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "read_clipboard",
                    "description": "Read text from clipboard",
                    "parameters": {
                        "type": "object",
                        "properties": {}
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "open_url",
                    "description": "Open a URL in the browser",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "url": {"type": "string", "description": "URL to open"}
                        },
                        "required": ["url"]
                    }
                }
            }
        ]

    async def chat(self, message: str, conversation_history: List[Dict] = None) -> LLMResponse:
        if conversation_history is None:
            conversation_history = []

        if settings.GEMINI_API_KEY:
            return await self._chat_gemini(message, conversation_history)
        elif settings.USE_OLLAMA:
            return await self._chat_ollama(message, conversation_history)
        else:
            return LLMResponse("Please configure either GEMINI_API_KEY or USE_OLLAMA=true in .env")

    async def _chat_gemini(self, message: str, conversation_history: List[Dict]) -> LLMResponse:
        try:
            headers = {"Content-Type": "application/json"}
            
            messages = []
            messages.append({"role": "user", "parts": [{"text": self.system_prompt}]})
            
            for msg in conversation_history[-10:]:
                role = "model" if msg.get("role") == "assistant" else "user"
                messages.append({"role": role, "parts": [{"text": msg.get("content", "")}]})
            
            messages.append({"role": "user", "parts": [{"text": message}]})

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent",
                    headers=headers,
                    params={"key": settings.GEMINI_API_KEY},
                    json={
                        "contents": messages,
                        "tools": [{"functionDeclarations": self.get_tool_schemas()}]
                    },
                    timeout=60.0
                )

            if response.status_code == 200:
                data = response.json()
                
                if "candidates" in data and data["candidates"]:
                    candidate = data["candidates"][0]
                    
                    if "content" in candidate and "parts" in candidate["content"]:
                        parts = candidate["content"]["parts"]
                        
                        text_content = ""
                        tool_calls = []
                        
                        for part in parts:
                            if "text" in part:
                                text_content += part["text"]
                            if "functionCall" in part:
                                fc = part["functionCall"]
                                tool_calls.append({
                                    "name": fc["name"],
                                    "arguments": dict(fc["args"])
                                })
                        
                        return LLMResponse(content=text_content, tool_calls=tool_calls)
                
                return LLMResponse("No response from Gemini")
            else:
                return LLMResponse(f"Gemini API error: {response.status_code} - {response.text}")
                
        except Exception as e:
            return LLMResponse(f"Error: {str(e)}")

    async def _chat_ollama(self, message: str, conversation_history: List[Dict]) -> LLMResponse:
        try:
            messages = [{"role": "system", "content": self.system_prompt}]
            
            for msg in conversation_history[-10:]:
                messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})
            
            messages.append({"role": "user", "content": message})

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{settings.OLLAMA_BASE_URL}/api/chat",
                    json={
                        "model": settings.LLM_MODEL,
                        "messages": messages,
                        "stream": False
                    },
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return LLMResponse(content=data.get("message", {}).get("content", ""))
                else:
                    return LLMResponse(f"Ollama error: {response.status_code}")
        except Exception as e:
            return LLMResponse(f"Ollama connection error: {str(e)}")

    async def analyze_image(self, image_path: str, question: str = None) -> str:
        if not settings.GEMINI_API_KEY:
            return "Vision analysis requires GEMINI_API_KEY."

        try:
            with open(image_path, "rb") as f:
                image_data = base64.b64encode(f.read()).decode()

            headers = {"Content-Type": "application/json"}
            
            prompt = question or "Describe what's on this screen in detail."

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent",
                    headers=headers,
                    params={"key": settings.GEMINI_API_KEY},
                    json={
                        "contents": [{
                            "parts": [
                                {"text": prompt},
                                {"inlineData": {"mimeType": "image/png", "data": image_data}}
                            ]
                        }]
                    },
                    timeout=60.0
                )

            if response.status_code == 200:
                data = response.json()
                if "candidates" in data and data["candidates"]:
                    return data["candidates"][0]["content"]["parts"][0]["text"]
            else:
                return f"Error analyzing image: {response.status_code}"

        except Exception as e:
            return f"Error: {str(e)}"


agent = AIAgent()