#!/usr/bin/env python3
"""
Lightweight GitHub webhook receiver.
Listens on :9000/deploy, verifies HMAC signature, fires deploy.sh on push to main.
"""
import hashlib
import hmac
import http.server
import json
import os
import subprocess
import threading

SECRET = os.environ["WEBHOOK_SECRET"].encode()


class WebhookHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):  # noqa: N802
        print(fmt % args, flush=True)

    def do_POST(self):  # noqa: N802
        if self.path != "/deploy":
            self.send_response(404)
            self.end_headers()
            return

        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)

        sig = self.headers.get("X-Hub-Signature-256", "")
        expected = "sha256=" + hmac.new(SECRET, body, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected):
            print("Invalid signature — ignoring", flush=True)
            self.send_response(403)
            self.end_headers()
            return

        try:
            ref = json.loads(body).get("ref", "")
        except Exception:
            ref = ""

        if ref != "refs/heads/main":
            self.send_response(200)
            self.end_headers()
            self.wfile.write(f"Skipped (ref={ref})".encode())
            return

        print(f"Push to main received — launching deploy.sh", flush=True)
        threading.Thread(
            target=subprocess.run,
            args=(["/scripts/deploy.sh"],),
            kwargs={"capture_output": False},
            daemon=True,
        ).start()

        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"Deploy started")


if __name__ == "__main__":
    print("Webhook server listening on :9000", flush=True)
    http.server.HTTPServer(("", 9000), WebhookHandler).serve_forever()
