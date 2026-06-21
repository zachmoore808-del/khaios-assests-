import os
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL = os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b")
MODEL_FAST = os.environ.get("GROQ_MODEL_FAST", "openai/gpt-oss-20b")

def get_keys():
    keys = []
    for name in ["GROQ_KEY_1", "GROQ_KEY_2", "GROQ_KEY_3", "GROQ_KEY1", "GROQ_KEY2", "GROQ_KEY3", "GROQ_API_KEY"]:
        v = (os.environ.get(name) or "").strip()
        if v.startswith("gsk_") and v not in keys:
            keys.append(v)
    for k, val in os.environ.items():
        for cand in (k, val):
            cand = (cand or "").strip()
            if cand.startswith("gsk_") and cand not in keys:
                keys.append(cand)
    return keys

@app.route("/")
def health():
    return jsonify({"status": "ok", "service": "khaios-backend", "keys_loaded": len(get_keys()), "model": MODEL, "model_fast": MODEL_FAST})

@app.route("/api/chat", methods=["POST", "OPTIONS"])
def chat():
    if request.method == "OPTIONS":
        return ("", 204)
    body = request.get_json(silent=True) or {}
    messages = body.get("messages", [])
    if not messages:
        return jsonify({"content": "No messages received, Commander.", "provider": "none"}), 400
    want_fast = (body.get("model") or "").strip().lower() == "fast"
    use_model = MODEL_FAST if want_fast else MODEL
    max_out = 220 if want_fast else 600
    keys = get_keys()
    if not keys:
        return jsonify({"content": "No API keys are configured on the server, Commander.", "provider": "none"}), 500
    last_err = ""
    retry_after = 0
    for i, key in enumerate(keys):
        try:
            r = requests.post(
                GROQ_URL,
                headers={"Authorization": "Bearer " + key, "Content-Type": "application/json"},
                json={"model": use_model, "messages": messages, "temperature": 0.7, "max_tokens": max_out},
                timeout=60,
            )
            if r.status_code in (429, 401, 403):
                last_err = "key %d -> HTTP %d" % (i + 1, r.status_code)
                if r.status_code == 429:
                    ra = r.headers.get("retry-after") or r.headers.get("Retry-After")
                    try:
                        v = int(float(ra)) if ra else 30
                    except Exception:
                        v = 30
                    if v > retry_after:
                        retry_after = v
                continue
            r.raise_for_status()
            data = r.json()
            content = data["choices"][0]["message"]["content"]
            return jsonify({"content": content, "provider": "groq", "model": use_model})
        except Exception as e:
            last_err = "key %d -> %s" % (i + 1, str(e))
            continue
    if retry_after:
        return jsonify({"content": "All keys are rate-limited, Commander. Standing by " + str(retry_after) + "s until it clears.", "provider": "rate_limited", "retry_after": retry_after, "detail": last_err}), 503
    return jsonify({"content": "All keys are busy or unreachable right now, Commander. Give it a moment.", "provider": "error", "detail": last_err}), 503

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)
