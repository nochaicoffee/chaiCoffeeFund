// Builds the app's icon files from design/app-icon/kulhad/f-teal-mono.svg (the picked one).
// Run from the repo root: node design/app-icon/build.mjs
import sharp from "sharp";
import fs from "node:fs";

const src = fs.readFileSync("design/app-icon/kulhad/f-teal-mono.svg", "utf8");

// Browser tab icon: rounded corners baked in. The PNGs stay full-bleed, the phone rounds them itself.
const rounded = src
  .replace("</defs>", '<clipPath id="round"><rect width="1024" height="1024" rx="224"/></clipPath></defs>')
  .replace(/(<\/defs>)([\s\S]*)<\/svg>/, '$1<g clip-path="url(#round)">$2</g></svg>');
fs.writeFileSync("src/app/icon.svg", rounded);

const png = (size) => sharp(Buffer.from(src), { density: 384 }).resize(size, size).png().toBuffer();
fs.writeFileSync("src/app/apple-icon.png", await png(180));
fs.writeFileSync("public/icon-192.png", await png(192));
fs.writeFileSync("public/icon-512.png", await png(512));

// Android's "maskable" icon: the art shrunk into the middle 70% over the background, so a circle or squircle crop never cuts the steam or the kulhad.
const bgRect = '<rect width="1024" height="1024" fill="url(#bg)"/>';
const maskable = src
  .replace(bgRect, "")
  .replace(/(<\/defs>)([\s\S]*)<\/svg>/, `$1${bgRect}<g transform="translate(154 154) scale(0.7)">$2</g></svg>`);
fs.writeFileSync("public/icon-maskable-512.png", await sharp(Buffer.from(maskable), { density: 384 }).resize(512, 512).png().toBuffer());

// favicon.ico: one 48px PNG inside an ICO container.
const p48 = await sharp(Buffer.from(rounded), { density: 384 }).resize(48, 48).png().toBuffer();
const head = Buffer.alloc(22);
head.writeUInt16LE(1, 2); head.writeUInt16LE(1, 4);
head[6] = 48; head[7] = 48; head.writeUInt16LE(1, 10); head.writeUInt16LE(32, 12);
head.writeUInt32LE(p48.length, 14); head.writeUInt32LE(22, 18);
fs.writeFileSync("src/app/favicon.ico", Buffer.concat([head, p48]));
