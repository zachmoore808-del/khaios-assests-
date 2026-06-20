import os
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")

def get_keys():
    keys = []
    for name in ["GROQ_KEY_1", "GROQ_KEY_2", "GROQ_KEY_3", "GROQ_API_KEY"]:
        v = (os.environ.get(name) or "").strip()
        if v and v not in keys:
            keys.append(v)
    return keys

@app.route("/")
def health():
    return jsonify({"status": "ok", "service": "khaios-backend", "keys_loaded": len(get_keys())})

@app.route("/api/chat", methods=["POST", "OPTIONS"])
def chat():
    if request.method == "OPTIONS":
        return ("", 204)
    body = request.get_json(silent=True) or {}
    messages = body.get("messages", [])
    if not messages:
        return jsonify({"content": "No messages received, Commander.", "provider": "none"}), 400
    keys = get_keys()
    if not keys:
        return jsonify({"content": "No API keys are configured on the server, Commander.", "provider": "none"}), 500
    last_err = ""
    for i, key in enumerate(keys):
        try:
            r = requests.post(
                GROQ_URL,
                headers={"Authorization": "Bearer " + key, "Content-Type": "application/json"},
                json={"model": MODEL, "messages": messages, "temperature": 0.7, "max_tokens": 1024},
                timeout=60,
            )
            if r.status_code in (429, 401, 403):
                last_err = "key %d -> HTTP %d" % (i + 1, r.status_code)
                continue
            r.raise_for_status()
            data = r.json()
            content = data["choices"][0]["message"]["content"]
            return jsonify({"content": content, "provider": "groq"})
        except Exception as e:
            last_err = "key %d -> %s" % (i + 1, str(e))
            continue
    return jsonify({"content": "All keys are busy or rate-limited right now, Commander. Give it a moment.", "provider": "error", "detail": last_err}), 503

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)
