import express from "express";
import path from "path";
import { fileURLToPath } from "url";

/* ===============================
   __dirname for ESModules
================================ */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ===============================
   App
================================ */
const app = express();
const PORT = process.env.PORT || 3000;
const PREFIX = "/service/";

/* ===============================
   Helpers
================================ */

// HTML rewrite
function rewriteHTML(html, baseUrl) {
  return html
    // href / src / action
    .replace(
      /(href|src|action)=["']([^"']+)["']/gi,
      (match, attr, url) => {
        if (
          url.startsWith("data:") ||
          url.startsWith("javascript:") ||
          url.startsWith(PREFIX)
        ) {
          return match;
        }
        try {
          const abs = new URL(url, baseUrl).href;
          return `${attr}="${PREFIX}${abs}"`;
        } catch {
          return match;
        }
      }
    )
    // srcset
    .replace(/srcset=["']([^"']+)["']/gi, (match, value) => {
      const rewritten = value
        .split(",")
        .map(part => {
          const [u, size] = part.trim().split(" ");
          try {
            const abs = new URL(u, baseUrl).href;
            return `${PREFIX}${abs}${size ? " " + size : ""}`;
          } catch {
            return part;
          }
        })
        .join(", ");
      return `srcset="${rewritten}"`;
    });
}

// JS rewrite（最低限）
function rewriteJS(js) {
  return js.replace(
    /(fetch|import)\s*\(\s*["'](https?:\/\/[^"']+)["']/g,
    (m, fn, url) => `${fn}("${PREFIX}${url}"`
  );
}

/* ===============================
   Static files
================================ */
app.use(express.static(path.join(__dirname, "public")));

/* ===============================
   Proxy + Rewrite
================================ */
app.use(PREFIX, async (req, res) => {
  try {
    const targetUrl = decodeURIComponent(
      req.originalUrl.slice(PREFIX.length)
    );

    if (!/^https?:\/\//i.test(targetUrl)) {
      res.status(400).send("Invalid target URL");
      return;
    }

    /* ----- request headers ----- */
    const headers = { ...req.headers };
    delete headers.host;
    delete headers.origin;
    delete headers.referer;
    delete headers["accept-encoding"]; // 圧縮防止（rewrite用）

    /* ----- fetch (Node18 built-in) ----- */
    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      redirect: "manual"
    });

    const contentType = response.headers.get("content-type") || "";
    let body = Buffer.from(await response.arrayBuffer());

    /* ----- HTML rewrite ----- */
    if (contentType.includes("text/html")) {
      const text = body.toString("utf8");
      body = Buffer.from(rewriteHTML(text, targetUrl), "utf8");
    }

    /* ----- JS rewrite ----- */
    if (
      contentType.includes("javascript") ||
      contentType.includes("ecmascript")
    ) {
      const text = body.toString("utf8");
      body = Buffer.from(rewriteJS(text), "utf8");
    }

    /* ----- response headers ----- */
    res.status(response.status);
    response.headers.forEach((value, key) => {
      const k = key.toLowerCase();
      if (
        k === "content-security-policy" ||
        k === "x-frame-options" ||
        k === "frame-options" ||
        k === "content-length"
      ) {
        return;
      }
      res.setHeader(key, value);
    });

    res.send(body);
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).send("Proxy error");
  }
});

/* ===============================
   SPA fallback
================================ */
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* ===============================
   Start server
================================ */
app.listen(PORT, () => {
  console.log("Proxy with HTML/JS rewrite running on port", PORT);
});
