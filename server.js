// server.js
import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());

// ENV en Render (sin slash final):
// GITHUB_CLIENT_ID
// GITHUB_CLIENT_SECRET
// BASE_URL  = https://auth-server-492.onrender.com
// SITE_URL  = https://sitio-web-innovacion.netlify.app

const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const BASE_URL = (process.env.BASE_URL || "").replace(/\/$/, "");
const SITE_URL = (process.env.SITE_URL || "").replace(/\/$/, "");
const ORIGIN = SITE_URL ? new URL(SITE_URL).origin : "*";

// 1) Iniciar login con GitHub
app.get("/auth", (_req, res) => {
  if (!CLIENT_ID || !CLIENT_SECRET || !BASE_URL || !SITE_URL) {
    return res.status(500).send(
      "Missing env vars: GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, BASE_URL, SITE_URL"
    );
  }
  const redirectUri = `${BASE_URL}/callback`;
  const url =
    `https://github.com/login/oauth/authorize` +
    `?client_id=${encodeURIComponent(CLIENT_ID)}` +
    `&scope=${encodeURIComponent("repo,user")}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}`;
  res.redirect(url);
});

// 2) GitHub -> /callback?code=...
app.get("/callback", async (req, res) => {
  const code = req.query.code;
  try {
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
      }),
    });
    const data = await tokenRes.json();
    const accessToken = data.access_token;

    const send = (payloadJS) => `<!doctype html><html><body><script>
      (function(){
        try {
          if (window.opener) {
            ${payloadJS}
            // Enviar dos veces por si la primera llega antes de que el listener esté listo
            setTimeout(function(){ ${payloadJS} }, 150);
            // y una tercera por si acaso
            setTimeout(function(){ ${payloadJS} }, 400);
            // cerrar con un pequeño delay
            setTimeout(function(){ window.close(); }, 700);
          } else {
            document.write('Login completado. Puedes cerrar esta ventana y volver al CMS.');
          }
        } catch(e) {
          document.write('No se pudo entregar el token al CMS: ' + e);
        }
      })();
    </script></body></html>`;

    if (!accessToken) {
      const err = (data && (data.error_description || data.error)) || "No token";
      const js = `
        window.opener.postMessage('authorization:github:error:${err}', '${ORIGIN}');
        window.opener.postMessage('authorization:github:error:${err}', '*');
      `;
      return res.status(400).send(send(js));
    }

    // Mensaje en el formato que Decap escucha:
    // "authorization:github:success:<TOKEN>"
    const js = `
      window.opener.postMessage('authorization:github:success:${accessToken}', '${ORIGIN}');
      window.opener.postMessage('authorization:github:success:${accessToken}', '*');
    `;
    return res.send(send(js));
  } catch (e) {
    const js = `
      window.opener.postMessage('authorization:github:error:server', '${ORIGIN}');
      window.opener.postMessage('authorization:github:error:server', '*');
    `;
    return res.status(500).send(send(js));
  }
});

// Salud
app.get("/", (_req, res) => res.send("✅ Auth Server Decap listo"));
app.get("/health", (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Auth server en puerto " + PORT));
