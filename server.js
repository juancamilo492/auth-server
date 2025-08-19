// server.js
import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());

// ============ ENV VARS (en Render > Environment) ============
// GITHUB_CLIENT_ID        -> de tu OAuth App en GitHub
// GITHUB_CLIENT_SECRET    -> de tu OAuth App en GitHub
// BASE_URL                -> https://auth-server-492.onrender.com   (SIN slash final)
// SITE_URL                -> https://sitio-web-innovacion.netlify.app (SIN slash final)

const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const BASE_URL = (process.env.BASE_URL || "").replace(/\/$/, "");
const SITE_URL = (process.env.SITE_URL || "").replace(/\/$/, "");

// ----------- 1) Iniciar login con GitHub -----------
app.get("/auth", (req, res) => {
  if (!CLIENT_ID || !CLIENT_SECRET || !BASE_URL || !SITE_URL) {
    return res
      .status(500)
      .send("Missing env vars: GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, BASE_URL, SITE_URL");
  }

  const redirectUri = `${BASE_URL}/callback`;
  const url =
    `https://github.com/login/oauth/authorize` +
    `?client_id=${encodeURIComponent(CLIENT_ID)}` +
    `&scope=${encodeURIComponent("repo,user")}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}`;

  res.redirect(url);
});

// ----------- 2) GitHub vuelve con ?code=... -----------
app.get("/callback", async (req, res) => {
  const code = req.query.code;
  const origin = SITE_URL ? new URL(SITE_URL).origin : "*";

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

    if (!accessToken) {
      const err = (data && (data.error_description || data.error)) || "No token";
      return res
        .status(400)
        .send(`<script>
          if (window.opener) {
            window.opener.postMessage('authorization:github:error:${err}', '${origin}');
            window.opener.postMessage('authorization:github:error:${err}', '*'); // fallback
            window.close();
          } else {
            document.write('❌ Error de login: ${err}');
          }
        </script>`);
    }

    // 📣 Enviamos el token a la ventana que abrió el popup y cerramos
    res.send(`<script>
      (function() {
        try {
          if (window.opener) {
            window.opener.postMessage('authorization:github:success:${accessToken}', '${origin}');
            window.opener.postMessage('authorization:github:success:${accessToken}', '*'); // fallback
            window.close();
          } else {
            document.write('✅ Login ok. Cierra esta ventana y vuelve al CMS.');
          }
        } catch (e) {
          document.write('⚠️ No se pudo entregar el token al CMS. ' + e);
        }
      })();
    </script>`);
  } catch (e) {
    console.error("OAuth callback error:", e);
    return res
      .status(500)
      .send(`<script>
        if (window.opener) {
          window.opener.postMessage('authorization:github:error:server', '${origin}');
          window.opener.postMessage('authorization:github:error:server', '*');
          window.close();
        } else {
          document.write('❌ Error en el servidor de autenticación.');
        }
      </script>`);
  }
});

// ----------- 3) Salud / Ping -----------
app.get("/", (_req, res) => res.send("✅ Auth Server Decap listo."));
app.get("/health", (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Auth server en puerto ${PORT}`));
