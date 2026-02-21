import asyncio
import aiohttp
import json
import re
import os
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from dotenv import load_dotenv

load_dotenv()

# --- CONFIGURATION ---
MODULATE_URL = "https://modulate-prototype-apis.com/api/velma-2-stt-batch"
# MODULATE_API_KEY = "f5744eae-7a3e-d208-a1bb-4e5b38eb3f08"
# AIRIA_API_KEY = "ak-MjgxMTQ2ODI0MHwxNzcxNjk2NDE4MjQ5fHRpLVRsbFZMVTl3Wlc0Z1VtVm5hWE4wY21GMGFXOXVMVUZwY21saElFWnlaV1ZmTldSaVl6UmtNRFF0TlRjMU1pMDBNelUzTFRsaFpUUXROemhqWXpVMFlUaGlabVJqfDF8Mjg1NDkzNDQwNyAg"

MODULATE_API_KEY = os.getenv("MODULATE_API_KEY")
AIRIA_API_KEY = os.getenv("AIRIA_API_KEY")
AIRIA_INGRESS_COOKIE = os.getenv("AIRIA_INGRESS_COOKIE")


def parse_airia_response(api_response: dict) -> dict:
    """
    Extracts and parses the nested JSON string from the Airia 'result' field.
    """
    raw_result = api_response.get("result", "")
    match = re.search(r"```(?:json)?\s*(.*?)\s*```", raw_result, re.DOTALL)
    
    if match:
        json_content = match.group(1)
    else:
        json_content = raw_result.strip()

    try:
        return json.loads(json_content)
    except json.JSONDecodeError as e:
        print(f"Error parsing inner JSON: {e}")
        return {}
    
async def get_modulate_stt(audio_path: str):
    """Calls the Modulate API to get text + emotions"""
    headers = {"X-API-Key": MODULATE_API_KEY}
    data = aiohttp.FormData()

    data = aiohttp.FormData()
    data.add_field(
        "upload_file",
        open(audio_path, "rb"),
        filename=audio_path.rsplit("/", 1)[-1],
        content_type="application/octet-stream",
    )
    data.add_field("speaker_diarization", "true")
    data.add_field("emotion_signal", "true")

    async with aiohttp.ClientSession() as session:
        async with session.post(MODULATE_URL, headers=headers, data=data) as resp:
            if resp.status != 200:
                return None
            return await resp.json()
    return None

async def call_airia(data: dict):
    url = "https://api.airia.ai/v2/PipelineExecution/15ac2e38-ae77-4e5d-b47c-6562d1249e59"


    payload = {
        "userInput": json.dumps(data),
        "asyncOutput": False
    }

    headers = {
        "X-API-KEY": AIRIA_API_KEY,
        "Content-Type": "application/json",
        "Cookie": f"INGRESSCOOKIE={AIRIA_INGRESS_COOKIE}"
    }

    async with aiohttp.ClientSession() as session:
        try:
            async with session.post(url, headers=headers, json=payload) as response:
                response.raise_for_status()
                print("here2", await response.text())
                return await response.json()
                
        except aiohttp.ClientError as e:
            print(f"Connection error: {e}")
            return None
        except Exception as e:
            print(f"An unexpected error occurred: {e}")
            return None

async def call_airia_for_postsales_analysis():
    url = "https://api.airia.ai/v2/PipelineExecution/8489232c-7a5b-4950-a2fd-46819a90f9a8"
    
    # Hardcoded data from the curl request
    user_input_content = """call_record = {
    "call_id": "call_20250219_001",
    "rep_id": "rep_001",
    "prospect_id": "prospect_acme_001",
    "call_outcome": "failure",
    "call_metadata": {
        "duration_seconds": 420,
        "phase_progression": ["intro", "pitch", "objection"]
    },
    "modulate_transcript": [
        {"utterance_uuid": "u001", "speaker": 0, "text": "Hi Sarah, great to connect. Let me walk you through what Acme FieldOps can do for a fleet your size.", "start_ms": 0, "duration_ms": 4200, "emotion": "Calm"},
        {"utterance_uuid": "u002", "speaker": 1, "text": "Sure.", "start_ms": 4500, "duration_ms": 800, "emotion": "Calm"},
        {"utterance_uuid": "u003", "speaker": 0, "text": "We offer real-time fleet tracking, AI route optimization, and FMCSA compliance reporting. Implementation is 2 weeks, zero IT required. Pricing starts at $32,000 annually for unlimited vehicles.", "start_ms": 5500, "duration_ms": 12000, "emotion": "Calm"},
        {"utterance_uuid": "u004", "speaker": 1, "text": "That's way too expensive. We're already talking to another vendor.", "start_ms": 18000, "duration_ms": 4000, "emotion": "Frustrated"},
        {"utterance_uuid": "u005", "speaker": 0, "text": "I understand. I can probably bring it down to $27,000.", "start_ms": 22500, "duration_ms": 3500, "emotion": "Calm"},
        {"utterance_uuid": "u006", "speaker": 1, "text": "I don't know, maybe not right now.", "start_ms": 27000, "duration_ms": 2500, "emotion": "Calm"},
        {"utterance_uuid": "u007", "speaker": 0, "text": "No problem, reach out whenever you're ready.", "start_ms": 30000, "duration_ms": 3000, "emotion": "Calm"}
    ],
    "agent_log": [
        {"nudge_id": "nudge_001", "phase": "pitch", "trigger": "REP_TALKING_TOO_MUCH", "nudge": "Pause and ask Sarah about her current setup before continuing.", "acted_on": False},
        {"nudge_id": "nudge_002", "phase": "objection", "trigger": "PROSPECT_FRUSTRATED", "nudge": "Slow down and reflect back what she said before responding.", "acted_on": False},
        {"nudge_id": "nudge_003", "phase": "objection", "trigger": "PRICE_OBJECTION", "nudge": "Anchor to ROI first. Ask: 'What does a 1% improvement in on-time delivery mean for your contracts?'", "acted_on": False},
        {"nudge_id": "nudge_004", "phase": "objection", "trigger": "VAGUE_OBJECTION_UNCLARIFIED", "nudge": "Dig deeper. Ask: 'What would need to be true for Q2 to work?'", "acted_on": False}
    ]
}"""

    payload = {
        "userInput": user_input_content,
        "asyncOutput": False
    }

    # Headers from the curl request
    headers = {
        "X-API-KEY": "ak-MjgxMTQ2ODI0MHwxNzcxNjk2NDE4MjQ5fHRpLVRsbFZMVTl3Wlc0Z1VtVm5hWE4wY21GMGFXOXVMVUZwY21saElFWnlaV1ZmTldSaVl6UmtNRFF0TlRjMU1pMDBNelUzTFRsaFpUUXROemhqWXpVMFlUaGlabVJqfDF8Mjg1NDkzNDQwNyAg",
        "Content-Type": "application/json",
        "Cookie": "INGRESSCOOKIE=ac34efc393e5a0009318bfa5aeb7977e|a6a56e3c110e6605ddc0eaa4aaecbbb7"
    }

    async with aiohttp.ClientSession() as session:
        try:
            async with session.post(url, headers=headers, json=payload) as response:
                response.raise_for_status()
                print("here2", await response.text())
                return await response.json()
        except aiohttp.ClientError as e:
            print(f"Connection error: {e}")
            return None
        except Exception as e:
            print(f"An unexpected error occurred: {e}")
            return None

# --- MAIN EXECUTION LOOP ---
async def run_demo(audio_file: str):
    
    print(f"--- Processing Audio: {audio_file} ---")
    stt_result = await get_modulate_stt(audio_file)
    
    if not stt_result:
        print("Failed to get STT from Modulate.")
        return

    utterances = stt_result.get("utterances", [])
    # print("here0", utterances)
    # utterances = [{'utterance_uuid': '276a81c5-11a1-4130-ab2e-50587c6ec508', 'text': "We're actually already in talks with Salesforce on this. And even setting that aside, the number you quoted is just... too much. We're a 200-person company, not an enterprise.", 'start_ms': 1860, 'duration_ms': 10020, 'speaker': 1, 'language': 'en', 'emotion': 'Calm', 'accent': None}]

    utterance_data = {
        "conversation_history": [{"speaker": "Rep", "text": "Our platform starts at $18,000 annually."}, {"speaker": "Prospect", "text": "That is just too much. We are a 200-person company, not an enterprise."}], "latest_utterance": utterances
    }

    agent_resp = await call_airia(utterance_data)

    print("Agent Response:", agent_resp)

    parsed_resp = parse_airia_response(agent_resp)

    print("Parsed Response:", parsed_resp)


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/analyze")
async def analyze_audio(file: UploadFile = File(...)):
    file_path = f"temp_{file.filename}"
    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())
    
    stt_result = await get_modulate_stt(file_path)
    
    utterances = stt_result.get("utterances", [])

    utterance_data = {
        "conversation_history": [{"speaker": "Rep", "text": "Our platform starts at $18,000 annually."}, {"speaker": "Prospect", "text": "That is just too much. We are a 200-person company, not an enterprise."}], "latest_utterance": utterances
    }

    agent_resp = await call_airia(utterance_data)

    parsed_resp = parse_airia_response(agent_resp)
    
    return parsed_resp



@app.get("/api/demo")
async def demo_analyze():
    """Demo endpoint: processes pre-saved test-rec.mp3 through Modulate STT + Airia coaching pipeline."""
    audio_file = "test-rec.mp3"

    if not os.path.exists(audio_file):
        return {"error": f"{audio_file} not found in backend working directory"}

    stt_result = await get_modulate_stt(audio_file)
    if not stt_result:
        return {"error": "Failed to get transcription from Modulate"}

    utterances = stt_result.get("utterances", [])

    utterance_data = {
        "conversation_history": [
            {"speaker": "Rep", "text": "Our platform starts at $18,000 annually."},
            {"speaker": "Prospect", "text": "That is just too much. We are a 200-person company, not an enterprise."}
        ],
        "latest_utterance": utterances
    }

    agent_resp = await call_airia(utterance_data)
    parsed_resp = parse_airia_response(agent_resp) if agent_resp else None

    return {
        "transcripts": utterances,
        "coaching": parsed_resp
    }

@app.get("/api/postsales_analysis")
async def postsales_analysis():
    """
    Sends the hardcoded request to Airia and returns the parsed response.
    """
    agent_resp = await call_airia_for_postsales_analysis()
    
    if not agent_resp:
        return {"error": "Failed to get response from Airia"}
        
    parsed_resp = parse_airia_response(agent_resp)
    return parsed_resp


if __name__ == "__main__":
    # Simulate a run with your test audio
    # asyncio.run(run_demo("test-rec.mp3"))

    uvicorn.run(app, host="0.0.0.0", port=8001)