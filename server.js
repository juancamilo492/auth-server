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
  console.error("❌ ERROR: faltan variables de entorno en Render.");
  process.exit(1);
}

// Ruta raíz para probar que corre
app.get("/", (req, res) => {
  res.send("✅ Auth server corriendo correctamente");
});

// Endpoint de autenticación con GitHub
app.post("/auth", async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: "Falta el código de autorización" });
  }

  try {
    // Intercambiar el código por un access token en GitHub
    const response = await fetch(
      `https://github.com/login/oauth/access_token`,
      {
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
      }
    );

    const data = await response.json();

    if (data.error) {
      console.error("❌ Error al obtener token:", data.error);
      return res.status(400).json(data);
    }

    const token = data.access_token;

    // Responder al frontend (Decap CMS)
    res.json({
      token,
      provider: "github",
    });
  } catch (err) {
    console.error("❌ Error en /auth:", err);
    res.status(500).json({ error: "Error interno en el servidor" });
  }
});

// Servidor escuchando
app.listen(PORT, () => {
  console.log(`🚀 Auth server corriendo en puerto ${PORT}`);
});
