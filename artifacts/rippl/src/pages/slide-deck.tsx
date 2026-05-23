/**
 * Waiting-room slide deck generator.
 * Produces a .pptx (16:9) that auto-converts to Google Slides on Drive upload.
 * Each office gets its own QR code URL: joinrippl.com/find?office=brentwood etc.
 */
import { useState } from "react";
import {
  Download, Monitor, QrCode, ChevronRight, Info, CheckCircle2, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Office {
  code:    string;
  label:   string;
  findUrl: string;
}

const OFFICES: Office[] = [
  { code: "brentwood",  label: "Brentwood",  findUrl: "joinrippl.com/find?office=brentwood"  },
  { code: "greenbrier", label: "Greenbrier", findUrl: "joinrippl.com/find?office=greenbrier" },
  { code: "lewisburg",  label: "Lewisburg",  findUrl: "joinrippl.com/find?office=lewisburg"  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fetchQrBase64(url: string): Promise<string> {
  const apiUrl =
    `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(url)}&margin=12&format=png&color=1a2e5a&bgcolor=ffffff`;
  const res  = await fetch(apiUrl);
  const blob = await res.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function generateDeck(office: Office, rewardAmount: number): Promise<void> {
  const { default: PptxGenJS } = await import("pptxgenjs");

  const qrBase64 = await fetchQrBase64(`https://${office.findUrl}`);

  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; // 13.33 × 7.5 inches, 16:9

  const NAVY   = "1a2e5a";
  const ORANGE = "E0622A";
  const WHITE  = "FFFFFF";
  const GOLD   = "c9a84c";
  const LIGHT  = "BBCAE0"; // muted blue-white for body text
  const PANEL  = "22396e"; // slightly lighter navy for panels

  // ── Shared helpers ─────────────────────────────────────────────────────────

  function addBadge(slide: ReturnType<typeof pptx.addSlide>, x = 8.8, y = 0.28) {
    slide.addShape(pptx.ShapeType.roundRect, {
      x, y, w: 3.8, h: 0.45,
      fill:    { color: "FFFFFF", transparency: 90 },
      line:    { color: "FFFFFF", transparency: 70, width: 1 },
      rectRadius: 0.15,
    });
    slide.addShape(pptx.ShapeType.ellipse, {
      x: x + 0.22, y: y + 0.15, w: 0.15, h: 0.15,
      fill: { color: ORANGE },
    });
    slide.addText("REFERRAL REWARDS", {
      x: x + 0.5, y: y + 0.04, w: 3.1, h: 0.38,
      fontSize: 8, bold: true, color: WHITE,
      charSpacing: 1.5, valign: "middle",
    });
  }

  function addPracticeTag(slide: ReturnType<typeof pptx.addSlide>, x = 0.5, y = 0.25) {
    slide.addText("HALLMARK", { x, y, w: 2.5, h: 0.22, fontSize: 9, bold: true, color: GOLD, charSpacing: 2 });
    slide.addText(`DENTAL  ·  ${office.label.toUpperCase()}`, {
      x, y: y + 0.22, w: 3.5, h: 0.22, fontSize: 9, bold: true, color: GOLD, charSpacing: 2,
    });
  }

  function addFooter(slide: ReturnType<typeof pptx.addSlide>) {
    slide.addText("Ask the front desk if you need help.", {
      x: 0.5, y: 6.9, w: 7, h: 0.35,
      fontSize: 9, color: LIGHT, italic: true,
    });
    slide.addText("POWERED BY RIPPL", {
      x: 10, y: 6.9, w: 3, h: 0.35,
      fontSize: 8, bold: true, color: LIGHT, align: "right", charSpacing: 1.5,
    });
  }

  // ── SLIDE 1 — Hero "Share a Smile" ────────────────────────────────────────

  const s1 = pptx.addSlide();
  s1.background = { color: NAVY };

  addPracticeTag(s1);
  addBadge(s1);

  // Top accent line
  s1.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 13.33, h: 0.07,
    fill: { color: ORANGE },
  });

  // Hero headline
  s1.addText("Share a", {
    x: 0.6, y: 1.1, w: 8, h: 1.3,
    fontSize: 88, bold: true, color: WHITE, fontFace: "Arial Black",
  });
  s1.addText("Smile.", {
    x: 0.6, y: 2.2, w: 8, h: 1.6,
    fontSize: 104, bold: true, italic: true, color: ORANGE, fontFace: "Georgia",
  });

  // Body
  s1.addText(
    "Love your smile? Help a friend get one too — and earn a ",
    { x: 0.6, y: 3.85, w: 9, h: 0.45, fontSize: 18, color: LIGHT }
  );
  s1.addText("gift card reward", {
    x: 0.6, y: 4.25, w: 3.6, h: 0.45,
    fontSize: 18, bold: true, color: ORANGE,
  });
  s1.addText(" when they become a patient.", {
    x: 4.1, y: 4.25, w: 5.5, h: 0.45,
    fontSize: 18, color: LIGHT,
  });

  // Divider
  s1.addShape(pptx.ShapeType.rect, {
    x: 0.6, y: 5.0, w: 9, h: 0.02,
    fill: { color: "FFFFFF", transparency: 80 },
  });

  // URL teaser
  s1.addText(`Scan any QR code in this office — or visit  ${office.findUrl}`, {
    x: 0.6, y: 5.2, w: 10, h: 0.45,
    fontSize: 13, color: LIGHT, italic: true,
  });

  addFooter(s1);

  // ── SLIDE 2 — How It Works + QR Code ─────────────────────────────────────

  const s2 = pptx.addSlide();
  s2.background = { color: NAVY };

  addPracticeTag(s2);
  addBadge(s2);

  s2.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 13.33, h: 0.07,
    fill: { color: ORANGE },
  });

  // Section label
  s2.addText("HOW IT WORKS", {
    x: 0.6, y: 1.1, w: 6, h: 0.3,
    fontSize: 10, bold: true, color: LIGHT, charSpacing: 2.5,
  });

  // Steps
  const STEPS = [
    "Scan the QR code",
    "Enter your mobile number",
    "Get your personal sharing link",
    "Earn a gift card when they become a patient",
  ];
  STEPS.forEach((text, i) => {
    const y = 1.55 + i * 1.05;
    // Numbered circle
    s2.addShape(pptx.ShapeType.ellipse, {
      x: 0.6, y, w: 0.5, h: 0.5,
      fill: { color: ORANGE },
    });
    s2.addText(String(i + 1), {
      x: 0.6, y, w: 0.5, h: 0.5,
      fontSize: 16, bold: true, color: WHITE, align: "center", valign: "middle",
    });
    s2.addText(text, {
      x: 1.3, y: y + 0.04, w: 5.5, h: 0.45,
      fontSize: 20, color: WHITE, bold: i === 3 ? false : false,
    });
  });

  // QR Code box
  s2.addShape(pptx.ShapeType.roundRect, {
    x: 7.8, y: 1.1, w: 5, h: 5,
    fill: { color: WHITE },
    line: { color: "E8ECF4", width: 1 },
    rectRadius: 0.2,
  });
  s2.addImage({
    data: `image/png;base64,${qrBase64}`,
    x: 8.15, y: 1.45, w: 4.3, h: 4.3,
  });

  // QR label
  s2.addText("Scan to get your link", {
    x: 7.8, y: 6.2, w: 5, h: 0.35,
    fontSize: 13, bold: true, color: WHITE, align: "center",
  });
  s2.addText(office.findUrl, {
    x: 7.8, y: 6.55, w: 5, h: 0.3,
    fontSize: 11, color: LIGHT, align: "center",
  });

  addFooter(s2);

  // ── SLIDE 3 — Reward ──────────────────────────────────────────────────────

  const s3 = pptx.addSlide();
  s3.background = { color: NAVY };

  addPracticeTag(s3);
  addBadge(s3);

  s3.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 13.33, h: 0.07,
    fill: { color: ORANGE },
  });

  // Headline
  s3.addText("Refer a friend,", {
    x: 0.6, y: 1.1, w: 9, h: 1.1,
    fontSize: 72, bold: true, color: WHITE, fontFace: "Arial Black",
  });
  s3.addText("earn a reward.", {
    x: 0.6, y: 2.1, w: 9, h: 1.1,
    fontSize: 72, bold: true, color: ORANGE, fontFace: "Arial Black",
  });

  // Reward panel
  s3.addShape(pptx.ShapeType.roundRect, {
    x: 0.6, y: 3.4, w: 12.1, h: 2.4,
    fill: { color: PANEL },
    line: { color: "FFFFFF", transparency: 85, width: 1 },
    rectRadius: 0.2,
  });

  s3.addText("YOUR REWARD", {
    x: 0.9, y: 3.6, w: 4, h: 0.3,
    fontSize: 10, bold: true, color: LIGHT, charSpacing: 2.5,
  });

  s3.addText(`$${rewardAmount}`, {
    x: 0.9, y: 3.95, w: 4, h: 1.1,
    fontSize: 96, bold: true, color: ORANGE, fontFace: "Arial Black",
  });

  s3.addText("gift card — per referral", {
    x: 0.9, y: 5.05, w: 5.5, h: 0.4,
    fontSize: 16, color: WHITE,
  });

  s3.addShape(pptx.ShapeType.rect, {
    x: 7.1, y: 3.55, w: 0.02, h: 2.1,
    fill: { color: "FFFFFF", transparency: 80 },
  });

  s3.addText("Choose from hundreds of brands —", {
    x: 7.4, y: 3.7, w: 5, h: 0.4,
    fontSize: 15, color: LIGHT,
  });
  s3.addText("Amazon · Visa · Restaurants · Spa", {
    x: 7.4, y: 4.1, w: 5, h: 0.4,
    fontSize: 15, color: WHITE,
  });
  s3.addText("Your gift card link arrives by text\nthe day your referral is confirmed.", {
    x: 7.4, y: 4.55, w: 5.2, h: 0.8,
    fontSize: 13, color: LIGHT, lineSpacingMultiple: 1.3,
  });

  addFooter(s3);

  // ── SLIDE 4 — CTA / Orange ────────────────────────────────────────────────

  const s4 = pptx.addSlide();
  s4.background = { color: ORANGE };

  // Left: headline + steps
  s4.addText("Refer a friend,\nearn a reward.", {
    x: 0.6, y: 0.7, w: 6.5, h: 2.8,
    fontSize: 56, bold: true, color: WHITE, fontFace: "Arial Black",
    lineSpacingMultiple: 1.1,
  });

  const CTA_STEPS = [
    "Scan the QR code",
    "Enter your mobile number",
    "Get your personal link to share",
    "Earn a gift card when they become a patient",
  ];
  CTA_STEPS.forEach((text, i) => {
    const y = 3.65 + i * 0.72;
    s4.addShape(pptx.ShapeType.ellipse, {
      x: 0.6, y, w: 0.46, h: 0.46,
      fill: { color: WHITE },
    });
    s4.addText(String(i + 1), {
      x: 0.6, y, w: 0.46, h: 0.46,
      fontSize: 14, bold: true, color: ORANGE, align: "center", valign: "middle",
    });
    s4.addText(text, {
      x: 1.25, y: y + 0.04, w: 5.4, h: 0.42,
      fontSize: 16, color: WHITE,
    });
  });

  // URL bottom-left
  s4.addText(office.findUrl, {
    x: 0.6, y: 6.7, w: 5, h: 0.4,
    fontSize: 13, bold: true, color: WHITE,
  });

  // Right: QR code on white card
  s4.addShape(pptx.ShapeType.roundRect, {
    x: 7.7, y: 0.8, w: 5.1, h: 5.6,
    fill: { color: WHITE },
    line: { color: WHITE, width: 0 },
    rectRadius: 0.25,
  });
  s4.addImage({
    data: `image/png;base64,${qrBase64}`,
    x: 8.05, y: 1.1, w: 4.4, h: 4.4,
  });

  // Scan label
  s4.addText("Scan to find your referral link", {
    x: 7.5, y: 6.5, w: 5.5, h: 0.4,
    fontSize: 12, bold: true, color: WHITE, align: "center",
  });

  // ── Save ──────────────────────────────────────────────────────────────────

  await pptx.writeFile({ fileName: `rippl-waiting-room-${office.code}.pptx` });
}

// ── UI ────────────────────────────────────────────────────────────────────────

export default function SlideDeck() {
  const [selectedOffice, setSelectedOffice] = useState<Office>(OFFICES[0]);
  const [rewardAmount, setRewardAmount]     = useState(100);
  const [loading, setLoading]               = useState(false);
  const [done, setDone]                     = useState(false);
  const [error, setError]                   = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setDone(false);
    setError(null);
    try {
      await generateDeck(selectedOffice, rewardAmount);
      setDone(true);
      setTimeout(() => setDone(false), 4000);
    } catch (e) {
      setError("Failed to generate. Check your connection and try again.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-12">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-xl bg-[#E0622A]/10 flex items-center justify-center">
            <Monitor className="w-4 h-4 text-[#E0622A]" />
          </div>
          <span className="text-xs font-bold text-[#E0622A] uppercase tracking-widest">Marketing</span>
        </div>
        <h1 className="text-2xl font-display font-bold text-slate-900 mb-2">
          Waiting Room Slide Deck
        </h1>
        <p className="text-slate-500 leading-relaxed">
          Generate a branded 4-slide PowerPoint for your waiting room TV.
          Upload it to Google Drive → it opens as Google Slides automatically.
          Each location gets a unique QR code pointing to their own referral lookup page.
        </p>
      </div>

      {/* Generator card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">

        {/* Office selector */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Which office?
          </label>
          <div className="grid grid-cols-3 gap-2">
            {OFFICES.map(o => (
              <button
                key={o.code}
                type="button"
                onClick={() => setSelectedOffice(o)}
                className={cn(
                  "py-3 px-2 rounded-xl border text-sm font-semibold text-center transition-all",
                  selectedOffice.code === o.code
                    ? "bg-[#1a2e5a] border-[#1a2e5a] text-white"
                    : "border-slate-200 text-slate-600 hover:border-slate-300 bg-white",
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400 flex items-center gap-1">
            <QrCode className="w-3 h-3 shrink-0" />
            QR code will link to:{" "}
            <code className="font-mono text-[#E0622A]">{selectedOffice.findUrl}</code>
          </p>
        </div>

        {/* Reward amount */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Reward Amount (shown on slides)
          </label>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-sm font-medium">$</span>
            <input
              type="number"
              value={rewardAmount}
              onChange={e => setRewardAmount(Math.max(1, parseInt(e.target.value) || 100))}
              min={1}
              max={9999}
              className="w-28 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#E0622A]/25 focus:border-[#E0622A]"
            />
            <span className="text-slate-400 text-sm">per referral</span>
          </div>
        </div>

        {/* Generate button */}
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>
        )}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-[#1a2e5a] hover:bg-[#162547] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-all text-sm"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Generating QR code &amp; slides…</>
          ) : done ? (
            <><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Downloaded — check your Downloads folder</>
          ) : (
            <><Download className="w-4 h-4" /> Download Slide Deck — {selectedOffice.label}</>
          )}
        </button>
      </div>

      {/* Google Slides upload instructions */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            How to get it into Google Slides
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          {[
            {
              n: "1",
              title: "Download the .pptx file",
              body: 'Click "Download Slide Deck" above. A file named rippl-waiting-room-[office].pptx will appear in your Downloads folder.',
            },
            {
              n: "2",
              title: "Upload to Google Drive",
              body: 'Open drive.google.com → click "+ New" → "File upload" → select the .pptx file.',
            },
            {
              n: "3",
              title: "Open as Google Slides",
              body: 'Right-click the uploaded file → "Open with" → "Google Slides". It converts automatically — no extra steps.',
            },
            {
              n: "4",
              title: "Set up on your waiting room TV",
              body: 'In Google Slides: Slideshow → Present on another screen. Or use Chromecast: click the Chromecast icon and select your TV. Set it to auto-advance every 10–15 seconds.',
            },
          ].map(({ n, title, body }) => (
            <div key={n} className="flex gap-4 px-5 py-4">
              <div className="w-6 h-6 rounded-full bg-[#E0622A] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                {n}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 mb-1">{title}</p>
                <p className="text-sm text-slate-500 leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* WR link explainer */}
      <div className="bg-[#1a2e5a]/5 border border-[#1a2e5a]/15 rounded-2xl p-5 space-y-3">
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 text-[#1a2e5a] shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-800">
              About the office-specific QR code URL
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
              Each office's slide deck contains a QR code that links to their own version of the
              referral lookup page. When a patient scans it, the page shows "Hallmark Dental · [Location]"
              so they know they're in the right place.
            </p>
            <div className="space-y-1.5 pt-1">
              {OFFICES.map(o => (
                <div key={o.code} className="flex items-center gap-2">
                  <ChevronRight className="w-3.5 h-3.5 text-[#E0622A] shrink-0" />
                  <span className="text-xs text-slate-500 w-20 shrink-0">{o.label}:</span>
                  <code className="text-xs font-mono text-[#1a2e5a] bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                    {o.findUrl}
                  </code>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 leading-relaxed pt-1">
              If you ever need to replace the QR code image in a slide, use any free QR generator
              and set the destination URL to the office-specific link above.
            </p>
          </div>
        </div>
      </div>

      {/* Slide preview */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Slide Preview</p>
        <div className="grid grid-cols-2 gap-4">
          {[
            { title: "Slide 1 — Hero",      desc: '"Share a Smile" — brand intro' },
            { title: "Slide 2 — How It Works", desc: "Steps + QR code" },
            { title: "Slide 3 — Reward",    desc: `$${rewardAmount} gift card breakdown` },
            { title: "Slide 4 — CTA",       desc: "Orange background, big QR code" },
          ].map(({ title, desc }) => (
            <div
              key={title}
              className="bg-[#1a2e5a] rounded-xl p-4 aspect-video flex flex-col justify-between"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[8px] font-bold text-[#c9a84c] tracking-widest uppercase">HALLMARK DENTAL · {selectedOffice.label.toUpperCase()}</p>
                </div>
                <div className="flex items-center gap-1 bg-white/10 rounded-full px-2 py-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#E0622A]" />
                  <span className="text-[7px] text-white font-semibold tracking-wide">REFERRAL REWARDS</span>
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-white">{title}</p>
                <p className="text-[10px] text-white/50 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
