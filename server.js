import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());

const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

app.get("/auth", (req, res) => {
  const redirectUri = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=repo,user&redirect_uri=${process.env.BASE_URL}/callback`;
  res.redirect(redirectUri);
});

app.get("/callback", async (req, res) => {
  const code = req.query.code;
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
  res.redirect(`/success#token=${accessToken}`);
});

app.get("/success", (req, res) => {
  res.send("✅ Login correcto, vuelve al CMS.");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Auth server corriendo en puerto ${PORT}`));
