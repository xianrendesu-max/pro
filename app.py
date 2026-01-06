from fastapi import FastAPI, Request
from fastapi.responses import Response, HTMLResponse
import httpx
import os
import re
from urllib.parse import urljoin, urlparse

app = FastAPI(title="Sennin Proxy")

# ===============================
# index.html を返すだけ（端末通信ゼロ）
# ===============================
@app.get("/", response_class=HTMLResponse)
async def index():
    with open("index.html", encoding="utf-8") as f:
        return f.read()

# ===============================
# HTML 内のリンクをすべて proxy 経由に書き換え
# ===============================
def rewrite_html(html: str, base_url: str) -> str:
    def repl(match):
        url = match.group(2)
        if url.startswith(("http://", "https://")):
            full = url
        elif url.startswith("//"):
            full = "https:" + url
        else:
            full = urljoin(base_url, url)
        return f'{match.group(1)}="/proxy?url={full}"'

    # src / href をすべて書き換え
    html = re.sub(
        r'(src|href)=["\'](.*?)["\']',
        repl,
        html,
        flags=re.IGNORECASE
    )
    return html

# ===============================
# Proxy 本体（通信はここだけ）
# ===============================
@app.api_route("/proxy", methods=["GET", "POST"])
async def proxy(request: Request, url: str):
    # 安全対策
    if not url.startswith(("http://", "https://")):
        return Response("Invalid URL", status_code=400)

    # ヘッダー整理（圧縮・文字化け対策）
    headers = dict(request.headers)
    headers.pop("host", None)
    headers.pop("accept-encoding", None)  # ← 最重要

    async with httpx.AsyncClient(
        follow_redirects=True,
        timeout=25
    ) as client:
        if request.method == "GET":
            resp = await client.get(url, headers=headers)
        else:
            body = await request.body()
            resp = await client.post(url, headers=headers, content=body)

    content_type = resp.headers.get("content-type", "")

    # ===============================
    # HTML（端末が直接外部にアクセスしない）
    # ===============================
    if "text/html" in content_type:
        html = resp.text
        html = rewrite_html(html, url)

        return Response(
            content=html,
            status_code=resp.status_code,
            media_type="text/html; charset=utf-8"
        )

    # ===============================
    # CSS / JS / 画像など（全て中継）
    # ===============================
    return Response(
        content=resp.content,
        status_code=resp.status_code,
        headers={
            "content-type": content_type
        }
    )

# ===============================
# Render / ローカル 起動
# ===============================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 10000))
        )
