import { Router, type IRouter } from "express";
import { spawn } from "child_process";
import { promises as fs } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import crypto from "crypto";

const router: IRouter = Router();

const TEMP_DIR = join(tmpdir(), "audio-downloads");
const downloadTokens = new Map<string, { filePath: string; filename: string; title: string; createdAt: number }>();

const CLEANUP_INTERVAL_MS = 30 * 60 * 1000;
const FILE_TTL_MS = 15 * 60 * 1000;

async function ensureTempDir() {
  await fs.mkdir(TEMP_DIR, { recursive: true });
}

function cleanupOldFiles() {
  const now = Date.now();
  for (const [token, info] of downloadTokens.entries()) {
    if (now - info.createdAt > FILE_TTL_MS) {
      fs.unlink(info.filePath).catch(() => {});
      downloadTokens.delete(token);
    }
  }
}

setInterval(cleanupOldFiles, CLEANUP_INTERVAL_MS);

function runYtDlp(args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn("yt-dlp", args, {
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
    proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });

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
  return name.replace(/[^\w\s\-().]/g, "").replace(/\s+/g, "_").slice(0, 100);
}

async function findOutputFile(fileId: string): Promise<string | null> {
  try {
    const files = await fs.readdir(TEMP_DIR);
    const match = files.find((f) => f.startsWith(fileId));
    if (match) {
      return join(TEMP_DIR, match);
    }
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
    const { stdout } = await runYtDlp([
      "--dump-json",
      "--no-playlist",
      url,
    ]);

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
    const clean = message.split("\n")[0].slice(0, 300);
    res.status(500).json({ error: clean });
  }
});

router.post("/download/audio", async (req, res) => {
  const { url } = req.body as { url?: string };

  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "A valid URL is required" });
    return;
  }

  try {
    await ensureTempDir();

    const fileId = crypto.randomBytes(16).toString("hex");
    const outputTemplate = join(TEMP_DIR, `${fileId}.%(ext)s`);

    const { stdout } = await runYtDlp([
      "--no-playlist",
      "--extract-audio",
      "--audio-format", "mp3",
      "--audio-quality", "0",
      "--output", outputTemplate,
      "--print", "after_move:%(title)s",
      url,
    ]);

    const title = stdout.trim().split("\n")[0] || "audio";

    const outputPath = await findOutputFile(fileId);
    if (!outputPath) {
      throw new Error("Audio file not found after download. The URL may not be supported.");
    }

    const token = crypto.randomBytes(24).toString("hex");
    const safeFilename = `${sanitizeFilename(title)}.mp3`;

    downloadTokens.set(token, {
      filePath: outputPath,
      filename: safeFilename,
      title,
      createdAt: Date.now(),
    });

    res.json({ token, title, filename: safeFilename });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Download failed";
    const clean = message.split("\n")[0].slice(0, 300);
    res.status(500).json({ error: clean });
  }
});

router.get("/download/file/:token", async (req, res) => {
  const { token } = req.params;
  const info = downloadTokens.get(token);

  if (!info) {
    res.status(404).json({ error: "File not found or expired. Please re-download." });
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
