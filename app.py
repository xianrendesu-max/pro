from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, Response
import httpx
import os

app = FastAPI()

# index.html を直接返す
@app.get("/", response_class=HTMLResponse)
async def index():
    with open("index.html", encoding="utf-8") as f:
        return f.read()

# Proxy 本体
@app.api_route("/proxy", methods=["GET", "POST"])
async def proxy(request: Request, url: str):
    if not url.startswith(("http://", "https://")):
        return Response("Invalid URL", status_code=400)

    headers = dict(request.headers)
    headers.pop("host", None)

    async with httpx.AsyncClient(
        follow_redirects=True,
        timeout=20
    ) as client:
        if request.method == "GET":
            r = await client.get(url, headers=headers)
        else:
            body = await request.body()
            r = await client.post(url, headers=headers, content=body)

    return Response(
        content=r.content,
        status_code=r.status_code,
        headers={
            k: v for k, v in r.headers.items()
            if k.lower() not in [
                "content-encoding",
                "transfer-encoding",
                "connection"
            ]
        }
    )

# Render用
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 10000))
    )
