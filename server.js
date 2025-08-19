// server.js
import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());

const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const BASE_URL = process.env.BASE_URL || "https://auth-server-492.onrender.com";

// Paso 1: Redirige a GitHub para login
app.get("/auth", (req, res) => {
  const redirectUri = `${BASE_URL}/callback`;
  const url = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=repo,user&redirect_uri=${redirectUri}`;
  res.redirect(url);
});

// Paso 2: GitHub devuelve "code", pedimos token y respondemos JSON
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
      return res.status(400).json({ error: "No se pudo obtener token de GitHub" });
    }

    // 👇 Decap CMS espera esta respuesta JSON
    res.json({
      token: accessToken,
      provider: "github"
    });
  } catch (err) {
    console.error("Error en callback:", err);
    res.status(500).json({ error: "Error en el servidor de autenticación" });
  }
});

// Ruta de prueba
app.get("/", (req, res) => {
  res.send("✅ Auth Server para Decap CMS funcionando.");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Auth server corriendo en puerto ${PORT}`));
