/**
 * Waiting-room slide deck generator.
 * Produces a .pptx (16:9) that auto-converts to Google Slides on Drive upload.
 * QR code is generated locally (no CORS) via the qrcode library.
 * URL: joinrippl.com/find — works for all offices universally.
 */
import PptxGenJS from "pptxgenjs";
import QRCode from "qrcode";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  Download, Monitor, Info, CheckCircle2, Loader2, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

// ── Constants ─────────────────────────────────────────────────────────────────

const FIND_URL  = "https://joinrippl.com/find";
const FIND_DISP = "joinrippl.com/find";

const NAVY   = "1a2e5a";
const ORANGE = "E0622A";
const WHITE  = "FFFFFF";
const GOLD   = "c9a84c";
const LIGHT  = "BBCAE0";
const PANEL  = "22396e";

// ── QR generation (local, no CORS) ───────────────────────────────────────────

async function makeQrDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    width: 400,
    margin: 2,
    color: { dark: "#1a2e5a", light: "#ffffff" },
    errorCorrectionLevel: "M",
  });
}

// ── Slide helpers ─────────────────────────────────────────────────────────────

function addTopBar(slide: ReturnType<typeof new PptxGenJS>["addSlide"]) {
  slide.addShape("rect" as any, {
    x: 0, y: 0, w: 13.33, h: 0.07,
    fill: { color: ORANGE },
  });
}

function addBadge(slide: ReturnType<typeof new PptxGenJS>["addSlide"], x = 8.8, y = 0.28) {
  slide.addShape("roundRect" as any, {
    x, y, w: 3.8, h: 0.45,
    fill: { color: "FFFFFF", transparency: 90 },
    line: { color: "FFFFFF", transparency: 70, width: 1 },
    rectRadius: 0.15,
  });
  slide.addShape("ellipse" as any, {
    x: x + 0.22, y: y + 0.15, w: 0.15, h: 0.15,
    fill: { color: ORANGE },
  });
  slide.addText("REFERRAL REWARDS", {
    x: x + 0.5, y: y + 0.04, w: 3.1, h: 0.38,
    fontSize: 8, bold: true, color: WHITE, charSpacing: 1.5, valign: "middle",
  });
}

function addPracticeTag(
  slide: ReturnType<typeof new PptxGenJS>["addSlide"],
  practiceName: string,
  x = 0.5, y = 0.25,
) {
  const upper = practiceName.toUpperCase();
  slide.addText(upper, {
    x, y, w: 5, h: 0.44,
    fontSize: 9, bold: true, color: GOLD, charSpacing: 2,
  });
}

function addFooter(slide: ReturnType<typeof new PptxGenJS>["addSlide"]) {
  slide.addText("Ask the front desk if you need help.", {
    x: 0.5, y: 6.9, w: 7, h: 0.35,
    fontSize: 9, color: LIGHT, italic: true,
  });
  slide.addText("POWERED BY RIPPL", {
    x: 10, y: 6.9, w: 3, h: 0.35,
    fontSize: 8, bold: true, color: LIGHT, align: "right", charSpacing: 1.5,
  });
}

// ── Deck generator ────────────────────────────────────────────────────────────

async function generateDeck(practiceName: string, rewardAmount: number): Promise<void> {
  const qrDataUrl = await makeQrDataUrl(FIND_URL);

  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; // 13.33 × 7.5 in, 16:9

  // ── Slide 1 — Hero ──────────────────────────────────────────────────────────
  const s1 = pptx.addSlide();
  s1.background = { color: NAVY };
  addTopBar(s1);
  addPracticeTag(s1, practiceName);
  addBadge(s1);

  s1.addText("Share a", {
    x: 0.6, y: 1.1, w: 8, h: 1.4,
    fontSize: 90, bold: true, color: WHITE, fontFace: "Arial Black",
  });
  s1.addText("Smile.", {
    x: 0.6, y: 2.3, w: 8, h: 1.6,
    fontSize: 108, bold: true, italic: true, color: ORANGE, fontFace: "Georgia",
  });
  s1.addText(
    `Love your smile? Help a friend get one too — and earn a gift card reward when they become a patient.`,
    {
      x: 0.6, y: 3.95, w: 10, h: 0.7,
      fontSize: 19, color: LIGHT,
    }
  );
  s1.addShape("rect" as any, {
    x: 0.6, y: 4.85, w: 9, h: 0.02,
    fill: { color: "FFFFFF", transparency: 80 },
  });
  s1.addText(`Scan any QR code in the office — or visit  ${FIND_DISP}`, {
    x: 0.6, y: 5.1, w: 10, h: 0.45,
    fontSize: 14, color: LIGHT, italic: true,
  });
  addFooter(s1);

  // ── Slide 2 — How It Works + QR ─────────────────────────────────────────────
  const s2 = pptx.addSlide();
  s2.background = { color: NAVY };
  addTopBar(s2);
  addPracticeTag(s2, practiceName);
  addBadge(s2);

  s2.addText("HOW IT WORKS", {
    x: 0.6, y: 1.1, w: 6, h: 0.3,
    fontSize: 10, bold: true, color: LIGHT, charSpacing: 2.5,
  });

  const STEPS = [
    "Scan the QR code",
    "Enter your mobile number",
    "Get your personal sharing link",
    "Earn a gift card when they become a patient",
  ];
  STEPS.forEach((text, i) => {
    const y = 1.55 + i * 1.05;
    s2.addShape("ellipse" as any, { x: 0.6, y, w: 0.5, h: 0.5, fill: { color: ORANGE } });
    s2.addText(String(i + 1), {
      x: 0.6, y, w: 0.5, h: 0.5,
      fontSize: 16, bold: true, color: WHITE, align: "center", valign: "middle",
    });
    s2.addText(text, {
      x: 1.3, y: y + 0.04, w: 5.5, h: 0.45,
      fontSize: 20, color: WHITE,
    });
  });

  s2.addShape("roundRect" as any, {
    x: 7.8, y: 1.1, w: 5, h: 5,
    fill: { color: WHITE },
    line: { color: "E8ECF4", width: 1 },
    rectRadius: 0.2,
  });
  s2.addImage({ data: qrDataUrl, x: 8.15, y: 1.45, w: 4.3, h: 4.3 });
  s2.addText("Scan to get your link", {
    x: 7.8, y: 6.2, w: 5, h: 0.35,
    fontSize: 13, bold: true, color: WHITE, align: "center",
  });
  s2.addText(FIND_DISP, {
    x: 7.8, y: 6.55, w: 5, h: 0.3,
    fontSize: 11, color: LIGHT, align: "center",
  });
  addFooter(s2);

  // ── Slide 3 — Reward ────────────────────────────────────────────────────────
  const s3 = pptx.addSlide();
  s3.background = { color: NAVY };
  addTopBar(s3);
  addPracticeTag(s3, practiceName);
  addBadge(s3);

  s3.addText("Refer a friend,", {
    x: 0.6, y: 1.1, w: 9, h: 1.1,
    fontSize: 72, bold: true, color: WHITE, fontFace: "Arial Black",
  });
  s3.addText("earn a reward.", {
    x: 0.6, y: 2.1, w: 9, h: 1.1,
    fontSize: 72, bold: true, color: ORANGE, fontFace: "Arial Black",
  });

  s3.addShape("roundRect" as any, {
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
    x: 0.9, y: 3.9, w: 4.5, h: 1.1,
    fontSize: 100, bold: true, color: ORANGE, fontFace: "Arial Black",
  });
  s3.addText("gift card — per referral", {
    x: 0.9, y: 4.95, w: 5.5, h: 0.45,
    fontSize: 17, color: WHITE,
  });
  s3.addShape("rect" as any, {
    x: 7.0, y: 3.55, w: 0.02, h: 2.1,
    fill: { color: "FFFFFF", transparency: 80 },
  });
  s3.addText(
    "Choose from hundreds of brands —\nAmazon · Visa · Restaurants · Spa\n\nYour gift card link arrives by text the day your referral is confirmed.",
    {
      x: 7.4, y: 3.65, w: 5.1, h: 2.0,
      fontSize: 15, color: LIGHT, lineSpacingMultiple: 1.4,
    }
  );
  addFooter(s3);

  // ── Slide 4 — CTA (orange) ──────────────────────────────────────────────────
  const s4 = pptx.addSlide();
  s4.background = { color: ORANGE };

  s4.addText("Refer a friend,\nearn a reward.", {
    x: 0.6, y: 0.7, w: 6.5, h: 2.8,
    fontSize: 56, bold: true, color: WHITE, fontFace: "Arial Black",
    lineSpacingMultiple: 1.1,
  });

  STEPS.forEach((text, i) => {
    const y = 3.65 + i * 0.72;
    s4.addShape("ellipse" as any, { x: 0.6, y, w: 0.46, h: 0.46, fill: { color: WHITE } });
    s4.addText(String(i + 1), {
      x: 0.6, y, w: 0.46, h: 0.46,
      fontSize: 14, bold: true, color: ORANGE, align: "center", valign: "middle",
    });
    s4.addText(text, {
      x: 1.25, y: y + 0.04, w: 5.4, h: 0.42,
      fontSize: 16, color: WHITE,
    });
  });

  s4.addText(FIND_DISP, {
    x: 0.6, y: 6.7, w: 5, h: 0.4,
    fontSize: 13, bold: true, color: WHITE,
  });

  s4.addShape("roundRect" as any, {
    x: 7.7, y: 0.8, w: 5.1, h: 5.6,
    fill: { color: WHITE },
    line: { color: WHITE, width: 0 },
    rectRadius: 0.25,
  });
  s4.addImage({ data: qrDataUrl, x: 8.05, y: 1.1, w: 4.4, h: 4.4 });
  s4.addText("Scan to find your referral link", {
    x: 7.5, y: 6.5, w: 5.5, h: 0.4,
    fontSize: 12, bold: true, color: WHITE, align: "center",
  });

  // ── Download ────────────────────────────────────────────────────────────────
  const slug = practiceName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  await pptx.writeFile({ fileName: `rippl-waiting-room-${slug}.pptx` });
}

// ── Mini slide previews ───────────────────────────────────────────────────────

function SlidePreview({
  slide, practiceName, rewardAmount,
}: {
  slide: 1 | 2 | 3 | 4;
  practiceName: string;
  rewardAmount: number;
}) {
  const upper = practiceName.toUpperCase();

  const Header = () => (
    <div className="flex items-start justify-between shrink-0" style={{ padding: "10px 14px 0" }}>
      <p style={{ fontSize: 5, fontWeight: 700, letterSpacing: "0.15em", color: "#c9a84c", lineHeight: 1.3 }}>
        {upper}
      </p>
      <div style={{
        display: "flex", alignItems: "center", gap: 3,
        background: "rgba(255,255,255,0.1)", borderRadius: 99, padding: "2px 6px",
      }}>
        <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#E0622A" }} />
        <span style={{ fontSize: 4, fontWeight: 700, color: "white", letterSpacing: "0.1em" }}>REFERRAL REWARDS</span>
      </div>
    </div>
  );

  const baseStyle: React.CSSProperties = {
    width: "100%", height: "100%", display: "flex", flexDirection: "column",
    fontFamily: "system-ui, -apple-system, sans-serif", overflow: "hidden",
  };

  if (slide === 1) return (
    <div style={{ ...baseStyle, background: "#1a2e5a" }}>
      <div style={{ height: 3, background: "#E0622A", flexShrink: 0 }} />
      <Header />
      <div style={{ padding: "4px 14px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: "white", lineHeight: 1, fontStyle: "normal" }}>Share a</div>
        <div style={{ fontSize: 24, fontWeight: 900, color: "#E0622A", lineHeight: 1, fontStyle: "italic", marginBottom: 4 }}>Smile.</div>
        <div style={{ fontSize: 5.5, color: "#BBCAE0", lineHeight: 1.5 }}>
          Love your smile? Help a friend get one too — and earn a <span style={{ color: "#E0622A", fontWeight: 700 }}>gift card reward</span> when they become a patient.
        </div>
      </div>
      <div style={{ padding: "0 14px 6px", fontSize: 4, color: "#BBCAE0", fontStyle: "italic" }}>
        Visit {FIND_DISP}
      </div>
    </div>
  );

  if (slide === 2) return (
    <div style={{ ...baseStyle, background: "#1a2e5a" }}>
      <div style={{ height: 3, background: "#E0622A", flexShrink: 0 }} />
      <Header />
      <div style={{ display: "flex", flex: 1, padding: "6px 14px 8px", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 4, fontWeight: 700, color: "#BBCAE0", letterSpacing: "0.2em", marginBottom: 5 }}>HOW IT WORKS</p>
          {["Scan the QR code", "Enter your mobile number", "Get your personal sharing link", "Earn a gift card"].map((t, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 4, marginBottom: 4 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#E0622A", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 5, fontWeight: 900, color: "white" }}>{i + 1}</span>
              </div>
              <span style={{ fontSize: 5.5, color: "white", lineHeight: 1.3, paddingTop: 1 }}>{t}</span>
            </div>
          ))}
        </div>
        <div style={{ width: 52, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <div style={{ width: 52, height: 52, background: "white", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ fontSize: 24, lineHeight: 1 }}>▦</div>
          </div>
          <p style={{ fontSize: 4, color: "white", fontWeight: 700, textAlign: "center" }}>Scan to get your link</p>
          <p style={{ fontSize: 3.5, color: "#BBCAE0", textAlign: "center" }}>{FIND_DISP}</p>
        </div>
      </div>
    </div>
  );

  if (slide === 3) return (
    <div style={{ ...baseStyle, background: "#1a2e5a" }}>
      <div style={{ height: 3, background: "#E0622A", flexShrink: 0 }} />
      <Header />
      <div style={{ padding: "4px 14px", flex: 1 }}>
        <div style={{ fontSize: 16, fontWeight: 900, color: "white", lineHeight: 1.1 }}>Refer a friend,</div>
        <div style={{ fontSize: 16, fontWeight: 900, color: "#E0622A", lineHeight: 1.1, marginBottom: 5 }}>earn a reward.</div>
        <div style={{ background: "#22396e", borderRadius: 5, padding: "5px 8px", display: "flex", alignItems: "center", gap: 8 }}>
          <div>
            <p style={{ fontSize: 3.5, color: "#BBCAE0", letterSpacing: "0.2em", fontWeight: 700 }}>YOUR REWARD</p>
            <p style={{ fontSize: 22, fontWeight: 900, color: "#E0622A", lineHeight: 1 }}>${rewardAmount}</p>
            <p style={{ fontSize: 5, color: "white" }}>gift card per referral</p>
          </div>
          <div style={{ borderLeft: "1px solid rgba(255,255,255,0.2)", paddingLeft: 8 }}>
            <p style={{ fontSize: 4.5, color: "#BBCAE0", lineHeight: 1.6 }}>Amazon · Visa<br />Restaurants · Spa<br /><span style={{ fontSize: 4 }}>Choose from hundreds of brands</span></p>
          </div>
        </div>
      </div>
    </div>
  );

  // slide 4 — orange
  return (
    <div style={{ ...baseStyle, background: "#E0622A" }}>
      <div style={{ display: "flex", flex: 1, padding: "8px 14px" }}>
        <div style={{ flex: 1, paddingRight: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: "white", lineHeight: 1.15, marginBottom: 8 }}>
            Refer a friend,<br />earn a reward.
          </div>
          {["Scan the QR code", "Enter your mobile number", "Get your personal link", "Earn a gift card"].map((t, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 4, marginBottom: 4 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 5, fontWeight: 900, color: "#E0622A" }}>{i + 1}</span>
              </div>
              <span style={{ fontSize: 5.5, color: "white", lineHeight: 1.3, paddingTop: 1 }}>{t}</span>
            </div>
          ))}
          <p style={{ fontSize: 4.5, color: "white", fontWeight: 700, marginTop: 6 }}>{FIND_DISP}</p>
        </div>
        <div style={{ width: 56, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 54, height: 54, background: "white", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ fontSize: 26, lineHeight: 1 }}>▦</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SlideDeck() {
  const { profile } = useAuth();
  const [practiceName, setPracticeName] = useState("Hallmark Dental");
  const [rewardAmount, setRewardAmount] = useState(100);
  const [loading, setLoading]           = useState(false);
  const [done, setDone]                 = useState(false);
  const [error, setError]               = useState<string | null>(null);

  // Load practice name from API if available
  useEffect(() => {
    if (!profile?.practice_id) return;
    fetch(`${BASE}/api/offices`)
      .then(r => r.json())
      .then((offices: { name: string }[]) => {
        if (offices?.[0]?.name) {
          // "Hallmark Dental – Brentwood" → "Hallmark Dental"
          const dash = offices[0].name.lastIndexOf("–");
          const base = dash !== -1 ? offices[0].name.slice(0, dash).trim() : offices[0].name;
          setPracticeName(base || "Hallmark Dental");
        }
      })
      .catch(() => {});
  }, [profile?.practice_id]);

  async function handleGenerate() {
    setLoading(true);
    setDone(false);
    setError(null);
    try {
      await generateDeck(practiceName, rewardAmount);
      setDone(true);
      setTimeout(() => setDone(false), 5000);
    } catch (e) {
      console.error("Slide deck generation failed:", e);
      setError("Failed to generate. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const SLIDE_LABELS = [
    { n: 1 as const, title: "Slide 1 — Hero",         desc: '"Share a Smile" — brand intro'    },
    { n: 2 as const, title: "Slide 2 — How It Works", desc: "4 steps + QR code"                },
    { n: 3 as const, title: "Slide 3 — Reward",       desc: `$${rewardAmount} gift card`        },
    { n: 4 as const, title: "Slide 4 — CTA",          desc: "Orange bg, big QR, call to action" },
  ];

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
          Generate a branded 4-slide PowerPoint for your waiting room TV. Download it,
          upload to Google Drive, and it opens as Google Slides automatically.
        </p>
      </div>

      {/* Generator card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">

        {/* Practice name override */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Practice Name (on slides)
          </label>
          <input
            type="text"
            value={practiceName}
            onChange={e => setPracticeName(e.target.value)}
            placeholder="Hallmark Dental"
            className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#E0622A]/25 focus:border-[#E0622A] transition-all"
          />
        </div>

        {/* Reward amount */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Reward Amount
          </label>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-sm font-medium">$</span>
            <input
              type="number"
              value={rewardAmount}
              onChange={e => setRewardAmount(Math.max(1, parseInt(e.target.value) || 100))}
              min={1} max={9999}
              className="w-28 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#E0622A]/25 focus:border-[#E0622A]"
            />
            <span className="text-slate-400 text-sm">per referral</span>
          </div>
        </div>

        {/* URL note */}
        <div className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-500 leading-relaxed">
            All QR codes link to{" "}
            <code className="font-mono text-[#1a2e5a] font-semibold">{FIND_DISP}</code>.
            Patients enter their mobile number to retrieve their personal referral link — this URL works for every office.
          </p>
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>
        )}

        {/* Generate */}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading || !practiceName.trim()}
          className="w-full flex items-center justify-center gap-2 bg-[#1a2e5a] hover:bg-[#162547] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-all text-sm"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Generating slides…</>
          ) : done ? (
            <><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Downloaded — check your Downloads folder</>
          ) : (
            <><Download className="w-4 h-4" /> Download Slide Deck (.pptx)</>
          )}
        </button>
      </div>

      {/* Slide previews */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Slide Preview</p>
        <div className="grid grid-cols-2 gap-4">
          {SLIDE_LABELS.map(({ n, title, desc }) => (
            <div key={n} className="space-y-2">
              <div
                className="rounded-xl overflow-hidden border border-slate-200 shadow-sm"
                style={{ aspectRatio: "16/9" }}
              >
                <SlidePreview slide={n} practiceName={practiceName || "Your Practice"} rewardAmount={rewardAmount} />
              </div>
              <div className="px-1">
                <p className="text-xs font-semibold text-slate-700">{title}</p>
                <p className="text-[11px] text-slate-400">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Google Slides instructions */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            How to set up in Google Slides
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          {[
            {
              n: "1", title: "Download the .pptx file",
              body: 'Click "Download Slide Deck" above. The file saves to your Downloads folder.',
            },
            {
              n: "2", title: "Upload to Google Drive",
              body: 'Open drive.google.com → "+ New" → "File upload" → select the .pptx file.',
            },
            {
              n: "3", title: "Open as Google Slides",
              body: 'Right-click the uploaded file → "Open with" → "Google Slides". It converts automatically.',
            },
            {
              n: "4", title: "Display on your waiting room TV",
              body: 'In Google Slides: Slideshow → "Present on another screen." Or cast via Chromecast. Set slides to auto-advance every 10–15 seconds.',
            },
          ].map(({ n, title, body }) => (
            <div key={n} className="flex gap-4 px-5 py-4">
              <div className="w-6 h-6 rounded-full bg-[#E0622A] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                {n}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 mb-0.5">{title}</p>
                <p className="text-sm text-slate-500 leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* QR URL reference */}
      <div className="bg-[#1a2e5a]/5 border border-[#1a2e5a]/15 rounded-2xl p-5 space-y-2">
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 text-[#1a2e5a] shrink-0 mt-0.5" />
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-slate-800">Replacing the QR code</p>
            <p className="text-sm text-slate-600 leading-relaxed">
              If you ever need to swap the QR code in a slide (e.g., to add a campaign tracking param),
              generate one at any free QR code site and point it to:
            </p>
            <div className="flex items-center gap-2">
              <ChevronRight className="w-3.5 h-3.5 text-[#E0622A] shrink-0" />
              <code className="text-sm font-mono text-[#1a2e5a] bg-white border border-slate-200 px-3 py-1 rounded-md">
                {FIND_URL}
              </code>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
