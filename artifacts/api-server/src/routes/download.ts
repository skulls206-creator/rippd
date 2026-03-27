import { Router, type IRouter } from "express";
import { spawn } from "child_process";
import { promises as fs } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import crypto from "crypto";

const router: IRouter = Router();

const TEMP_DIR = join(tmpdir(), "audio-downloads");
const FILE_TTL_MS = 15 * 60 * 1000;

interface DownloadEntry {
  filePath: string;
  filename: string;
  title: string;
  createdAt: number;
}

const downloadTokens = new Map<string, DownloadEntry>();

setInterval(() => {
  const now = Date.now();
  for (const [token, info] of downloadTokens.entries()) {
    if (now - info.createdAt > FILE_TTL_MS) {
      fs.unlink(info.filePath).catch(() => {});
      downloadTokens.delete(token);
    }
  }
}, FILE_TTL_MS);

const ALLOWED_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "music.youtube.com",
  "soundcloud.com",
  "on.soundcloud.com",
  "m.soundcloud.com",
  "bandcamp.com",
  "vimeo.com",
  "twitch.tv",
  "www.twitch.tv",
  "clips.twitch.tv",
  "dailymotion.com",
  "www.dailymotion.com",
]);

function validateUrl(raw: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("Invalid URL format.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http and https URLs are supported.");
  }

  const hostname = parsed.hostname.toLowerCase();

  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("10.") ||
    hostname.startsWith("172.")
  ) {
    throw new Error("Private or local addresses are not allowed.");
  }

  if (!ALLOWED_HOSTS.has(hostname)) {
    throw new Error(
      "Unsupported site. Paste a link from YouTube, SoundCloud, Spotify, or another supported platform.",
    );
  }

  return parsed;
}

async function ensureTempDir() {
  await fs.mkdir(TEMP_DIR, { recursive: true });
}

function runYtDlp(args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn("yt-dlp", args, {
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (d: Buffer) => {
      stdout += d.toString();
    });
    proc.stderr.on("data", (d: Buffer) => {
      stderr += d.toString();
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(stderr || stdout || `yt-dlp exited with code ${code}`));
      }
    });

    proc.on("error", (err) => {
      reject(new Error(`Failed to spawn yt-dlp: ${err.message}`));
    });
  });
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^\w\s\-().]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 100);
}

function parseTitle(raw: string): string {
  const first = raw.trim().split("\n")[0].trim();
  return first.replace(/^after_move:/i, "").trim() || "audio";
}

async function findOutputFile(fileId: string): Promise<string | null> {
  try {
    const files = await fs.readdir(TEMP_DIR);
    const match = files.find((f) => f.startsWith(fileId));
    if (match) return join(TEMP_DIR, match);
  } catch {
  }
  return null;
}

router.post("/download/info", async (req, res) => {
  const { url } = req.body as { url?: string };

  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "A valid URL is required" });
    return;
  }

  try {
    validateUrl(url);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Invalid URL" });
    return;
  }

  try {
    const { stdout } = await runYtDlp(["--dump-json", "--no-playlist", url]);
    const info = JSON.parse(stdout.trim().split("\n")[0]);
    res.json({
      title: info.title || "Unknown Title",
      uploader: info.uploader || info.channel || "Unknown",
      duration: info.duration ?? null,
      thumbnail: info.thumbnail ?? null,
      platform: info.extractor_key || info.extractor || "Unknown",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get track info";
    res.status(500).json({ error: message.split("\n")[0].slice(0, 300) });
  }
});

router.post("/download/audio", async (req, res) => {
  const { url } = req.body as { url?: string };

  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "A valid URL is required" });
    return;
  }

  try {
    validateUrl(url);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Invalid URL" });
    return;
  }

  try {
    await ensureTempDir();

    const fileId = crypto.randomBytes(16).toString("hex");
    const outputTemplate = join(TEMP_DIR, `${fileId}.%(ext)s`);

    const { stdout } = await runYtDlp([
      "--no-playlist",
      "--extract-audio",
      "--audio-format",
      "mp3",
      "--audio-quality",
      "0",
      "--output",
      outputTemplate,
      "--print",
      "after_move:%(title)s",
      url,
    ]);

    const title = parseTitle(stdout);
    const outputPath = await findOutputFile(fileId);

    if (!outputPath) {
      throw new Error("Audio file not found after download. The URL may not be supported.");
    }

    const token = crypto.randomBytes(24).toString("hex");
    const filename = `${sanitizeFilename(title)}.mp3`;

    downloadTokens.set(token, {
      filePath: outputPath,
      filename,
      title,
      createdAt: Date.now(),
    });

    res.json({ token, title, filename });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Download failed";
    res.status(500).json({ error: message.split("\n")[0].slice(0, 300) });
  }
});

router.post("/download/playlist-info", async (req, res) => {
  const { url } = req.body as { url?: string };

  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "A valid URL is required" });
    return;
  }

  try {
    validateUrl(url);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Invalid URL" });
    return;
  }

  try {
    const { stdout } = await runYtDlp([
      "--flat-playlist",
      "--dump-json",
      "--no-warnings",
      url,
    ]);

    const lines = stdout.trim().split("\n").filter(Boolean);
    if (lines.length === 0) throw new Error("No tracks found in playlist.");

    const tracks = lines.map((line, i) => {
      const item = JSON.parse(line);
      const trackUrl =
        item.url ||
        item.webpage_url ||
        (item.id && item.ie_key === "Youtube"
          ? `https://www.youtube.com/watch?v=${item.id}`
          : item.id
            ? `https://www.youtube.com/watch?v=${item.id}`
            : null);
      return {
        index: i + 1,
        id: item.id || String(i),
        url: trackUrl || url,
        title: item.title || `Track ${i + 1}`,
        duration: item.duration ?? null,
        thumbnail: item.thumbnails?.[0]?.url ?? item.thumbnail ?? null,
      };
    });

    const firstItem = JSON.parse(lines[0]);
    const playlistTitle =
      firstItem.playlist_title || firstItem.playlist || "Playlist";

    res.json({ title: playlistTitle, trackCount: tracks.length, tracks });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load playlist";
    res.status(500).json({ error: message.split("\n")[0].slice(0, 300) });
  }
});

router.get("/download/file/:token", async (req, res) => {
  const { token } = req.params;
  const info = downloadTokens.get(token);

  if (!info) {
    res.status(404).json({ error: "File not found or expired. Please re-download." });
    return;
  }

  if (Date.now() - info.createdAt > FILE_TTL_MS) {
    downloadTokens.delete(token);
    fs.unlink(info.filePath).catch(() => {});
    res.status(404).json({ error: "Download link expired. Please re-download." });
    return;
  }

  try {
    await fs.access(info.filePath);
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Disposition", `attachment; filename="${info.filename}"`);
    res.sendFile(info.filePath, (err) => {
      if (!err) {
        fs.unlink(info.filePath).catch(() => {});
        downloadTokens.delete(token);
      }
    });
  } catch {
    downloadTokens.delete(token);
    res.status(404).json({ error: "File no longer available. Please re-download." });
  }
});

export default router;
