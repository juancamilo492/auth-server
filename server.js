// server.js
import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());

const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const BASE_URL = process.env.BASE_URL || "https://auth-server-492.onrender.com";
// 👇 tu sitio donde vive /admin (Decap)
const SITE_URL = process.env.SITE_URL || "https://sitio-web-innovacion.netlify.app";

// Inicia el flujo OAuth en GitHub
app.get("/auth", (req, res) => {
  const redirectUri = `${BASE_URL}/callback`;
  const url =
    `https://github.com/login/oauth/authorize` +
    `?client_id=${CLIENT_ID}&scope=repo,user&redirect_uri=${encodeURIComponent(redirectUri)}`;
  res.redirect(url);
});

// GitHub redirige aquí con ?code=...
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

    if (!accessToken) {
      const err = (data && (data.error_description || data.error)) || "No token";
      return res
        .status(400)
        .send(`<script>
          window.opener && window.opener.postMessage('authorization:github:error:${err}', '${SITE_URL}');
          window.close();
        </script>`);
    }

    // ✨ Esta es la clave: mandar el token a la ventana que abrió el popup
    res.send(`<script>
      (function() {
        // Enviar el token al opener (la página /admin)
        if (window.opener) {
          window.opener.postMessage('authorization:github:success:${accessToken}', '${SITE_URL}');
          window.close();
        } else {
          // Fallback: mostrar el token si no hay opener
          document.write('Login ok. Puedes cerrar esta ventana.');
        }
      })();
    </script>`);
  } catch (e) {
    console.error("OAuth callback error:", e);
    res
      .status(500)
      .send(`<script>
        window.opener && window.opener.postMessage('authorization:github:error:server', '${SITE_URL}');
        window.close();
      </script>`);
  }
});

// Salud
app.get("/", (_req, res) => res.send("✅ Auth Server Decap listo."));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Auth server en puerto ${PORT}`));
