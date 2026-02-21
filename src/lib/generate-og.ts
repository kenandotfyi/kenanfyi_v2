import satori from "satori";
import sharp from "sharp";
import { writeFileSync, existsSync, mkdirSync, readFileSync } from "fs";
import { join } from "path";

const W = 1200;
const H = 630;
const PAD = 80;

const BG_MAP: Record<string, string> = {
  thoughts: "hero-thoughts.png",
  bits: "hero-bits.png",
};

// load fonts once — satori accepts WOFF2 directly
const gentiumData = readFileSync(
  join(
    process.cwd(),
    "node_modules/@fontsource/gentium-book-plus/files/gentium-book-plus-latin-700-normal.woff",
  ),
);
const jetbrainsData = readFileSync(
  join(
    process.cwd(),
    "node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff",
  ),
);

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

  const bgFile = BG_MAP[collection] ?? "hero-bits.png";
  const bgPath = join(process.cwd(), "public/heros", bgFile);

  // resize background and convert to base64 data URI for satori
  const bgBuffer = await sharp(bgPath)
    .resize(W, H, { fit: "cover", position: "center" })
    .toBuffer();
  const bgDataUri = `data:image/png;base64,${bgBuffer.toString("base64")}`;

  const svg = await satori(
    {
      type: "div",
      props: {
        style: {
          display: "flex",
          width: `${W}px`,
          height: `${H}px`,
          backgroundImage: `url(${bgDataUri})`,
          backgroundSize: `${W}px ${H}px`,
        },
        children: [
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "rgba(8,8,8,0.65)",
              },
            },
          },
          // text block anchored bottom-left
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                flexDirection: "column",
                position: "absolute",
                bottom: `${PAD}px`,
                left: `${PAD}px`,
                right: `${PAD}px`,
                gap: "16px",
              },
              children: [
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      fontFamily: "JetBrains Mono",
                      fontSize: "24px",
                      color: "rgba(255,255,255,0.75)",
                      letterSpacing: "6px",
                    },
                    children: collection.toUpperCase(),
                  },
                },
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      fontFamily: "Gentium Book Plus",
                      fontSize: "58px",
                      fontWeight: 700,
                      color: "white",
                      lineHeight: 1.2,
                    },
                    children: title,
                  },
                },
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      fontFamily: "JetBrains Mono",
                      fontSize: "24px",
                      color: "rgba(255,255,255,0.75)",
                      letterSpacing: "3px",
                    },
                    children: "kenan.fyi",
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      width: W,
      height: H,
      fonts: [
        {
          name: "Gentium Book Plus",
          data: gentiumData,
          weight: 700,
          style: "normal",
        },
        {
          name: "JetBrains Mono",
          data: jetbrainsData,
          weight: 400,
          style: "normal",
        },
      ],
    },
  );

  await sharp(Buffer.from(svg))
    .png({ compressionLevel: 8 })
    .toFile(filepath);

  return `/og/${filename}`;
}
