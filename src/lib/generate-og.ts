import sharp from "sharp";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const W = 1200;
const H = 630;
const PAD = 80;

const BG_MAP: Record<string, string> = {
  thoughts: "banner-bg-15.png",
  bits: "banner-bg-13.png",
};

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// naive word-wrap — good enough for titles at this font size
function wrapLines(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export async function generateOgImage({
  title,
  collection,
  id,
}: {
  title: string;
  collection: string;
  id: string;
}): Promise<string> {
  const dir = join(process.cwd(), "public/og");
  const filename = `${id}.png`;
  const filepath = join(dir, filename);

  if (existsSync(filepath)) return `/og/${filename}`;
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const bgFile = BG_MAP[collection];
  const bgPath = join(process.cwd(), "public/banner-bg", bgFile);

  const titleFont = 58;
  const collFont = 24;
  const siteFont = 20;
  const lineHeight = titleFont * 1.28;
  const lines = wrapLines(title, 30);

  // anchor from the bottom-left, building upward
  const siteY = H - PAD;                                       // kenan.fyi baseline
  const titleLastY = siteY - siteFont - 36;                    // last title line baseline
  const titleFirstY = titleLastY - (lines.length - 1) * lineHeight;
  const collectionY = titleFirstY - collFont - 36;             // collection label baseline

  const titleElements = lines
    .map(
      (line, i) =>
        `<text
            x="${PAD}"
            y="${titleFirstY + i * lineHeight}"
            font-family="serif"
            font-size="${titleFont}"
            font-weight="bold"
            fill="white"
        >${escapeXml(line)}</text>`,
    )
    .join("\n");

  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="rgba(8,8,8,0.60)" />

  <text
    x="${PAD}"
    y="${collectionY}"
    font-family="monospace"
    font-size="${collFont}"
    letter-spacing="9"
    fill="rgba(255,255,255,0.60)"
  >${escapeXml(collection.toUpperCase())}</text>

  ${titleElements}

  <text
    x="${PAD}"
    y="${siteY}"
    font-family="monospace"
    font-size="${siteFont}"
    letter-spacing="3"
    fill="rgba(255,255,255,0.60)"
  >kenan.fyi</text>
</svg>`;

  await sharp(bgPath)
    .resize(W, H, { fit: "cover", position: "center" })
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png({ compressionLevel: 8 })
    .toFile(filepath);

  return `/og/${filename}`;
}
