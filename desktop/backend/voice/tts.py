import pyttsx3
import threading
import queue

class TTSEngine:
    def __init__(self):
        self.engine = None
        self.queue = queue.Queue()
        self.rate = 150
        self.volume = 1.0
        self._init_engine()
        
    def _init_engine(self):
        try:
            self.engine = pyttsx3.init()
            self.engine.setProperty('rate', self.rate)
            self.engine.setProperty('volume', self.volume)
            
            voices = self.engine.getProperty('voices')
            for voice in voices:
                if 'english' in voice.name.lower() or 'default' in voice.name.lower():
                    self.engine.setProperty('voice', voice.id)
                    break
        except Exception as e:
            print(f"TTS init error: {e}")
            
    def speak(self, text: str):
        if not self.engine:
            return
            
        def _speak():
            try:
                self.engine.say(text)
                self.engine.runAndWait()
            except Exception as e:
                print(f"TTS speak error: {e}")
                
        thread = threading.Thread(target=_speak, daemon=True)
        thread.start()
        
    def speak_sync(self, text: str):
        if not self.engine:
            return
        try:
            self.engine.say(text)
            self.engine.runAndWait()
        except Exception as e:
            print(f"TTS error: {e}")
            
    def stop(self):
        if self.engine:
            try:
                self.engine.stop()
            except:
                pass
                
    def set_rate(self, rate: int):
        self.rate = rate
        if self.engine:
            self.engine.setProperty('rate', rate)
            
    def set_volume(self, volume: float):
        self.volume = volume
        if self.engine:
            self.engine.setProperty('volume', volume)


tts = TTSEngine()