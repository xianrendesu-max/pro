from fastapi import FastAPI, Request
from fastapi.responses import Response, HTMLResponse
import httpx, os

app = FastAPI(title="Sennin Proxy API-Only")

@app.get("/", response_class=HTMLResponse)
async def index():
    with open("index.html", encoding="utf-8") as f:
        return f.read()

@app.get("/sw.js")
async def sw():
    with open("sw.js", encoding="utf-8") as f:
        return Response(f.read(), media_type="application/javascript")

@app.api_route("/api/proxy", methods=["GET", "POST"])
async def api_proxy(request: Request, url: str):
    if not url.startswith(("http://", "https://")):
        return Response("Invalid URL", status_code=400)

    headers = dict(request.headers)
    headers.pop("host", None)
    headers.pop("accept-encoding", None)  # 圧縮解除

    async with httpx.AsyncClient(follow_redirects=True, timeout=30) as client:
        if request.method == "GET":
            r = await client.get(url, headers=headers)
        else:
            body = await request.body()
            r = await client.post(url, headers=headers, content=body)

    ct = r.headers.get("content-type", "application/octet-stream")
    return Response(
        content=r.content,
        status_code=r.status_code,
        headers={"content-type": ct}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 10000))
    )
