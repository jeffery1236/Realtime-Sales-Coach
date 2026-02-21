import asyncio
import aiohttp
import json
import re
import os
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


if __name__ == "__main__":
    # Simulate a run with your test audio
    asyncio.run(run_demo("test-rec.mp3"))