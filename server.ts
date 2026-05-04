import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Spotify Auth Cache
  let spotifyToken = "";
  let tokenExpiry = 0;

  async function getSpotifyToken() {
    if (spotifyToken && Date.now() < tokenExpiry) {
      return spotifyToken;
    }

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error("SPOTIFY_CREDENTIALS_MISSING");
    }

    const auth = Buffer.from(`${clientId.trim()}:${clientSecret.trim()}`).toString("base64");
    
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');

    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      params,
      {
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    spotifyToken = response.data.access_token;
    tokenExpiry = Date.now() + response.data.expires_in * 1000 - 60000; // 1 min buffer
    return spotifyToken;
  }

  app.use(express.json());

  // Spotify Search API
  app.get("/api/spotify/search", async (req, res) => {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: "Query required" });

    try {
      const token = await getSpotifyToken();
      const response = await axios.get("https://api.spotify.com/v1/search", {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          q,
          type: "track",
          limit: 10,
        },
      });

      const tracks = response.data.tracks.items.map((item: any) => ({
        id: item.id,
        title: item.name,
        artist: item.artists[0].name,
        url: item.preview_url || "",
        albumArt: item.album.images[0]?.url || "",
      }));

      res.json(tracks);
    } catch (error: any) {
      const errorData = error.response?.data;
      console.error("Spotify search error:", errorData || error.message);
      
      if (error.message === "SPOTIFY_CREDENTIALS_MISSING" || errorData?.error === 'invalid_client') {
        return res.status(401).json({ 
          error: "CONFIGURATION_REQUIRED",
          message: "Spotify credentials missing or invalid. Please check your AI Studio environment variables." 
        });
      }
      
      res.status(500).json({ error: "Spotify system offline" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Neural Server optimized at http://localhost:${PORT}`);
  });
}

startServer();
