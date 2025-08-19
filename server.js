// server.js
import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Variables de entorno
const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const SITE_URL = process.env.SITE_URL; // ej: https://sitio-web-innovacion.netlify.app

if (!CLIENT_ID || !CLIENT_SECRET || !SITE_URL) {
  console.error("❌ ERROR: faltan variables de entorno");
  process.exit(1);
}

// Ruta de prueba
app.get("/", (req, res) => {
  res.send("✅ Auth server corriendo");
});

// 1) GET /auth → redirige a GitHub
app.get("/auth", (req, res) => {
  const redirectUri = `${req.protocol}://${req.get("host")}/callback`;
  const url = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${redirectUri}&scope=repo,user`;
  res.redirect(url);
});

// 2) GET /callback → GitHub devuelve el code
app.get("/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send("❌ Falta el código de autorización");
  }

  try {
    const response = await fetch(`https://github.com/login/oauth/access_token`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
      }),
    });

    const data = await response.json();

    if (data.error) {
      return res.status(400).json(data);
    }

    // Decap espera que redirijas al SITE_URL/admin con el token en el hash
    res.redirect(`${SITE_URL}/admin/#access_token=${data.access_token}`);
  } catch (err) {
    console.error("❌ Error en /callback:", err);
    res.status(500).send("Error interno en callback");
  }
});

// 3) POST /auth → usado por Decap directamente
app.post("/auth", async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: "Falta el código de autorización" });
  }

  try {
    const response = await fetch(`https://github.com/login/oauth/access_token`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
      }),
    });

    const data = await response.json();

    if (data.error) {
      return res.status(400).json(data);
    }

    res.json({
      token: data.access_token,
      provider: "github",
    });
  } catch (err) {
    console.error("❌ Error en POST /auth:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// Servidor
app.listen(PORT, () => {
  console.log(`🚀 Auth server escuchando en puerto ${PORT}`);
});
