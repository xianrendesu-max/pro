import express from "express";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

/* ===============================
   Helpers
================================ */

function rewriteHTML(html, prefix, baseUrl) {
  return html
    // href / src / action
    .replace(
      /(href|src|action)=["']([^"']+)["']/gi,
      (m, attr, url) => {
        if (
          url.startsWith("data:") ||
          url.startsWith("javascript:") ||
          url.startsWith(prefix)
        ) {
          return m;
        }
        try {
          const abs = new URL(url, baseUrl).href;
          return `${attr}="${prefix}${abs}"`;
        } catch {
          return m;
        }
      }
    )
    // srcset
    .replace(/srcset=["']([^"']+)["']/gi, (m, val) => {
      const rewritten = val
        .split(",")
        .map(part => {
          const [u, size] = part.trim().split(" ");
          try {
            const abs = new URL(u, baseUrl).href;
            return `${prefix}${abs}${size ? " " + size : ""}`;
          } catch {
            return part;
          }
        })
        .join(", ");
      return `srcset="${rewritten}"`;
    });
}

function rewriteJS(js, prefix) {
  // 最低限：fetch / xhr / import
  return js.replace(
    /(fetch|open|import)\s*\(\s*["'](https?:\/\/[^"']+)["']/g,
    (m, fn, url) => `${fn}("${prefix}${url}"`
  );
}

/* ===============================
   Static files
================================ */
app.use(express.static(path.join(__dirname, "public")));

/* ===============================
   Proxy + Rewrite
================================ */
app.use("/service/", async (req, res) => {
  try {
    const targetUrl = decodeURIComponent(
      req.originalUrl.replace(/^\/service\//, "")
    );

    if (!/^https?:\/\//i.test(targetUrl)) {
      return res.status(400).send("Invalid URL");
    }

    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        ...req.headers,
        host: undefined,
        origin: undefined,
        referer: undefined
      },
      redirect: "manual"
    });

    const contentType = response.headers.get("content-type") || "";
    let body = Buffer.from(await response.arrayBuffer());

    /* ===== HTML ===== */
    if (contentType.includes("text/html")) {
      const text = body.toString("utf8");
      body = Buffer.from(
        rewriteHTML(text, "/service/", targetUrl),
        "utf8"
      );
    }

    /* ===== JS ===== */
    if (contentType.includes("javascript")) {
      const text = body.toString("utf8");
      body = Buffer.from(rewriteJS(text, "/service/"), "utf8");
    }

    /* ===== headers ===== */
    res.status(response.status);
    response.headers.forEach((v, k) => {
      if (
        ![
          "content-security-policy",
          "x-frame-options",
          "content-length"
        ].includes(k.toLowerCase())
      ) {
        res.setHeader(k, v);
      }
    });

    res.send(body);
  } catch (e) {
    console.error(e);
    res.status(500).send("Proxy error");
  }
});

/* ===============================
   Fallback
================================ */
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log("Proxy with rewrite running on", PORT);
});
