/**
 * Marketing Materials hub — waiting-room slide deck + downloadable marketing assets.
 */
import PptxGenJS from "pptxgenjs";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  Download, Monitor, Info, CheckCircle2, Loader2, ImageIcon,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

// ── Design tokens ──────────────────────────────────────────────────────────────
const BG     = "0d1117";
const CARD_BG = "0f1e2e";
const TEAL   = "2dd4bf";
const ORANGE = "f59e0b";
const PURPLE = "7c3aed";
const WHITE  = "ffffff";
const MUTED  = "94a3b8";
const BORDER = "1e3a5f";

function splitName(name: string): [string, string] {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return [words[0].toUpperCase(), ""];
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(" ").toUpperCase(), words.slice(mid).join(" ").toUpperCase()];
}

// ── Slide shell ────────────────────────────────────────────────────────────────
function addShell(s: ReturnType<PptxGenJS["addSlide"]>, practiceName: string) {
  s.background = { color: BG };

  s.addShape(pptx.ShapeType.roundRect, {
    x: 0.12, y: 0.12, w: 13.09, h: 7.26,
    fill: { type: "none" } as any,
    line: { color: TEAL, width: 2.5 },
    rectRadius: 0.25,
  });

  s.addShape(pptx.ShapeType.rect, {
    x: 0.32, y: 0.28, w: 1.75, h: 0.72,
    fill: { color: "111827" },
    line: { color: TEAL, width: 0.75 },
  });
  const [line1, line2] = splitName(practiceName);
  s.addText(line1 + (line2 ? "\n" + line2 : ""), {
    x: 0.38, y: 0.3, w: 1.63, h: 0.68,
    fontSize: 7.5, bold: true, color: WHITE, fontFace: "Arial",
    valign: "middle", lineSpacingMultiple: 1.2,
  });

  s.addShape(pptx.ShapeType.ellipse, {
    x: 11.55, y: 7.05, w: 0.22, h: 0.22,
    fill: { color: TEAL },
  });
  s.addText("Powered by Rippl", {
    x: 11.8, y: 7.02, w: 1.4, h: 0.28,
    fontSize: 8.5, color: WHITE, bold: true, valign: "middle",
  });
}

let pptx: PptxGenJS;

// ── Deck generator ─────────────────────────────────────────────────────────────
async function generateDeck(practiceName: string): Promise<void> {
  pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";

  const name = practiceName || "Your Practice";

  // Slide 1 — Refer a friend. Earn rewards.
  {
    const s = pptx.addSlide();
    addShell(s, name);

    s.addText("Refer a friend.", {
      x: 0.5, y: 1.1, w: 12.33, h: 1.3,
      fontSize: 78, bold: true, color: WHITE, fontFace: "Arial Black", align: "center",
    });
    s.addText("Earn rewards.", {
      x: 0.5, y: 2.2, w: 12.33, h: 1.3,
      fontSize: 78, bold: true, color: TEAL, fontFace: "Arial Black", align: "center",
    });
    s.addText(
      "Share your personal link — when they visit, you earn. No forms. No waiting. Automatic.",
      { x: 1.0, y: 3.45, w: 11.33, h: 0.55, fontSize: 17, color: MUTED, align: "center" },
    );

    const TIERS = [
      { label: "INFLUENCER", amt: "$35",  sub: "1st referral", border: TEAL   },
      { label: "AMPLIFIER",  amt: "$50",  sub: "3 referrals",  border: TEAL   },
      { label: "AMBASSADOR", amt: "$75",  sub: "6 referrals",  border: TEAL   },
      { label: "LEGEND",     amt: "$100", sub: "10 referrals", border: PURPLE },
    ];
    const badgeW = 2.6, badgeGap = 0.25;
    const totalW = TIERS.length * badgeW + (TIERS.length - 1) * badgeGap;
    const startX = (13.33 - totalW) / 2;

    TIERS.forEach((tier, i) => {
      const x = startX + i * (badgeW + badgeGap);
      const y = 4.05;
      s.addShape(pptx.ShapeType.roundRect, {
        x, y, w: badgeW, h: 1.15,
        fill: { color: CARD_BG },
        line: { color: tier.border, width: 1.5 },
        rectRadius: 0.55,
      });
      s.addText(tier.label, {
        x, y: y + 0.08, w: badgeW, h: 0.22,
        fontSize: 7.5, bold: true, color: TEAL, align: "center", charSpacing: 1.5,
      });
      s.addText(tier.amt, {
        x, y: y + 0.27, w: badgeW, h: 0.55,
        fontSize: 36, bold: true, color: WHITE, fontFace: "Arial Black", align: "center",
      });
      s.addText(tier.sub, {
        x, y: y + 0.82, w: badgeW, h: 0.24,
        fontSize: 9.5, color: MUTED, align: "center",
      });
    });

    s.addText("Ask the front desk for your personal referral link today", {
      x: 0.5, y: 5.5, w: 12.33, h: 0.35,
      fontSize: 14, color: MUTED, align: "center",
    });
  }

  // Slide 2 — How it works
  {
    const s = pptx.addSlide();
    addShell(s, name);

    s.addText("How it works", {
      x: 0.5, y: 0.85, w: 12.33, h: 1.0,
      fontSize: 64, bold: true, color: WHITE, fontFace: "Arial Black", align: "center",
    });

    const STEPS = [
      { num: "01", title: "Get your link",      body: "Ask the front desk for your personal referral link" },
      { num: "02", title: "Share with friends", body: "Text or email your link to anyone who needs a great dentist" },
      { num: "03", title: "Earn rewards",        body: "When they visit you automatically earn up to $100" },
    ];
    const cardW = 3.6, cardH = 4.5, gap = 0.5;
    const totalW = STEPS.length * cardW + (STEPS.length - 1) * gap;
    const sx = (13.33 - totalW) / 2;
    const sy = 1.95;

    STEPS.forEach((step, i) => {
      const x = sx + i * (cardW + gap);
      s.addShape(pptx.ShapeType.roundRect, {
        x, y: sy, w: cardW, h: cardH,
        fill: { color: CARD_BG },
        line: { color: BORDER, width: 1 },
        rectRadius: 0.15,
      });
      s.addText(step.num, {
        x, y: sy + 0.35, w: cardW, h: 0.65,
        fontSize: 40, bold: true, color: TEAL, fontFace: "Arial Black", align: "center",
      });
      s.addText(step.title, {
        x: x + 0.15, y: sy + 1.1, w: cardW - 0.3, h: 0.5,
        fontSize: 20, bold: true, color: WHITE, align: "center",
      });
      s.addText(step.body, {
        x: x + 0.2, y: sy + 1.7, w: cardW - 0.4, h: 1.2,
        fontSize: 14, color: MUTED, align: "center", lineSpacingMultiple: 1.4,
      });
      if (i < STEPS.length - 1) {
        const ax = x + cardW + 0.06;
        const ay = sy + cardH / 2 - 0.15;
        s.addShape(pptx.ShapeType.rect, {
          x: ax, y: ay + 0.12, w: gap - 0.12, h: 0.03,
          fill: { color: TEAL },
        });
        s.addText("→", {
          x: ax + gap - 0.48, y: ay - 0.03, w: 0.4, h: 0.35,
          fontSize: 18, color: TEAL, align: "center", valign: "middle",
        });
      }
    });

    s.addText("Gift card  ·  $100 Dental credit  ·  Local partner  ·  Charity donation", {
      x: 0.5, y: 6.65, w: 12.33, h: 0.3,
      fontSize: 12, color: TEAL, align: "center",
    });
  }

  // Slide 3 — Choose your reward
  {
    const s = pptx.addSlide();
    addShell(s, name);

    s.addText("Choose your reward", {
      x: 0.5, y: 0.75, w: 12.33, h: 0.95,
      fontSize: 60, bold: true, color: WHITE, fontFace: "Arial Black", align: "center",
    });
    s.addText("Your choice — automatically delivered when your friend visits", {
      x: 0.5, y: 1.65, w: 12.33, h: 0.4,
      fontSize: 15, color: MUTED, align: "center",
    });

    const REWARDS = [
      { badge: "MOST POPULAR",  badgeColor: TEAL,   title: "$35 Gift Card",      body: "Amazon, Visa, Target,\nStarbucks & more",  cta: "→ Instant delivery",  ctaColor: TEAL,   border: TEAL   },
      { badge: "MOST VALUABLE", badgeColor: ORANGE, title: "$100 Dental Credit", body: "Applied to your account\nwithin 24 hours",  cta: "→ Highest value",     ctaColor: ORANGE, border: ORANGE },
      { badge: "",              badgeColor: "",      title: "$35 Local Reward",   body: "Redeem at local partner\nbusinesses",       cta: "→ Show PIN in store", ctaColor: PURPLE, border: PURPLE },
      { badge: "",              badgeColor: "",      title: "Donate $35",         body: "Charitable donation\nin your name",         cta: "→ Give back",         ctaColor: MUTED,  border: BORDER },
    ];
    const rcW = 2.8, rcH = 4.6, rcG = 0.28;
    const totalW = REWARDS.length * rcW + (REWARDS.length - 1) * rcG;
    const rx = (13.33 - totalW) / 2;
    const ry = 2.1;

    REWARDS.forEach((r, i) => {
      const x = rx + i * (rcW + rcG);
      if (r.badge) {
        s.addShape(pptx.ShapeType.roundRect, {
          x: x + 0.15, y: ry - 0.42, w: rcW - 0.3, h: 0.38,
          fill: { color: r.badgeColor },
          line: { color: r.badgeColor, width: 0 },
          rectRadius: 0.15,
        });
        s.addText(r.badge, {
          x: x + 0.15, y: ry - 0.42, w: rcW - 0.3, h: 0.38,
          fontSize: 8, bold: true, color: BG, align: "center", valign: "middle", charSpacing: 1,
        });
      }
      s.addShape(pptx.ShapeType.roundRect, {
        x, y: ry, w: rcW, h: rcH,
        fill: { color: CARD_BG },
        line: { color: r.border, width: 1.5 },
        rectRadius: 0.12,
      });
      s.addText(r.title, {
        x: x + 0.12, y: ry + 0.3, w: rcW - 0.24, h: 0.6,
        fontSize: 17, bold: true, color: WHITE, align: "center",
      });
      s.addText(r.body, {
        x: x + 0.12, y: ry + 1.0, w: rcW - 0.24, h: 0.9,
        fontSize: 12, color: MUTED, align: "center", lineSpacingMultiple: 1.5,
      });
      s.addText(r.cta, {
        x: x + 0.12, y: ry + rcH - 0.45, w: rcW - 0.24, h: 0.35,
        fontSize: 11, bold: true, color: r.ctaColor, align: "center",
      });
    });

    s.addText(
      "Ask the front desk for your personal referral link today  ·  Rewards grow with every referral — up to $100",
      { x: 0.5, y: 6.93, w: 11.0, h: 0.28, fontSize: 10.5, color: MUTED, align: "center" },
    );
  }

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  await pptx.writeFile({ fileName: `rippl-waiting-room-${slug}.pptx` });
}

// ── Slide previews ─────────────────────────────────────────────────────────────

function PreviewShell({ practiceName, children }: { practiceName: string; children: React.ReactNode }) {
  const [l1, l2] = splitName(practiceName || "Your Practice");
  return (
    <div className="w-full h-full relative flex flex-col" style={{ background: "#0d1117", fontFamily: "system-ui, sans-serif" }}>
      <div className="absolute inset-[3px] rounded-[6px] pointer-events-none" style={{ border: "1.5px solid #2dd4bf" }} />
      <div className="absolute" style={{ top: 5, left: 6, background: "#111827", border: "0.75px solid #2dd4bf", padding: "2px 4px", minWidth: 34 }}>
        <div style={{ fontSize: 4, fontWeight: 700, color: "white", letterSpacing: "0.05em", lineHeight: 1.35 }}>
          {l1}{l2 ? <><br />{l2}</> : null}
        </div>
      </div>
      <div className="absolute flex items-center gap-1" style={{ bottom: 5, right: 8 }}>
        <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#2dd4bf" }} />
        <span style={{ fontSize: 4, color: "white", fontWeight: 700 }}>Powered by Rippl</span>
      </div>
      {children}
    </div>
  );
}

function Slide1Preview({ name }: { name: string }) {
  const TIERS = [
    { label: "INFLUENCER", amt: "$35",  sub: "1st referral", border: "#2dd4bf" },
    { label: "AMPLIFIER",  amt: "$50",  sub: "3 referrals",  border: "#2dd4bf" },
    { label: "AMBASSADOR", amt: "$75",  sub: "6 referrals",  border: "#2dd4bf" },
    { label: "LEGEND",     amt: "$100", sub: "10 referrals", border: "#7c3aed" },
  ];
  return (
    <PreviewShell practiceName={name}>
      <div className="flex-1 flex flex-col justify-center items-center px-4" style={{ gap: 2 }}>
        <div style={{ fontSize: 16, fontWeight: 900, color: "white", lineHeight: 1 }}>Refer a friend.</div>
        <div style={{ fontSize: 16, fontWeight: 900, color: "#2dd4bf", lineHeight: 1, marginBottom: 3 }}>Earn rewards.</div>
        <div style={{ fontSize: 4, color: "#94a3b8", textAlign: "center", marginBottom: 5 }}>
          Share your personal link — when they visit, you earn.
        </div>
        <div style={{ display: "flex", gap: 3 }}>
          {TIERS.map(t => (
            <div key={t.label} style={{ border: `1px solid ${t.border}`, borderRadius: 8, background: "#0f1e2e", padding: "3px 5px", textAlign: "center", minWidth: 34 }}>
              <div style={{ fontSize: 3, color: "#2dd4bf", fontWeight: 700, letterSpacing: "0.1em" }}>{t.label}</div>
              <div style={{ fontSize: 10, fontWeight: 900, color: "white", lineHeight: 1 }}>{t.amt}</div>
              <div style={{ fontSize: 3, color: "#94a3b8" }}>{t.sub}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 3.5, color: "#94a3b8", marginTop: 4, textAlign: "center" }}>
          Ask the front desk for your personal referral link today
        </div>
      </div>
    </PreviewShell>
  );
}

function Slide2Preview({ name }: { name: string }) {
  const steps = [
    { n: "01", t: "Get your link",      b: "Ask the front desk for your personal referral link" },
    { n: "02", t: "Share with friends", b: "Text or email your link to anyone who needs a great dentist" },
    { n: "03", t: "Earn rewards",       b: "When they visit you automatically earn up to $100" },
  ];
  return (
    <PreviewShell practiceName={name}>
      <div className="flex-1 flex flex-col items-center px-3 pb-3" style={{ paddingTop: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 900, color: "white", marginBottom: 5 }}>How it works</div>
        <div style={{ display: "flex", gap: 4, width: "100%" }}>
          {steps.map((s, i) => (
            <div key={i} style={{ flex: 1, background: "#0f1e2e", border: "0.75px solid #1e3a5f", borderRadius: 3, padding: "4px 4px", textAlign: "center" }}>
              <div style={{ fontSize: 12, fontWeight: 900, color: "#2dd4bf", lineHeight: 1 }}>{s.n}</div>
              <div style={{ fontSize: 5, fontWeight: 700, color: "white", margin: "2px 0 1px" }}>{s.t}</div>
              <div style={{ fontSize: 3.5, color: "#94a3b8", lineHeight: 1.4 }}>{s.b}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 3.5, color: "#2dd4bf", marginTop: 4, textAlign: "center" }}>
          Gift card · $100 Dental credit · Local partner · Charity donation
        </div>
      </div>
    </PreviewShell>
  );
}

function Slide3Preview({ name }: { name: string }) {
  const rewards = [
    { badge: "MOST POPULAR",  bc: "#2dd4bf", title: "$35 Gift Card",      body: "Amazon, Visa & more",     cta: "→ Instant delivery",  cc: "#2dd4bf", border: "#2dd4bf" },
    { badge: "MOST VALUABLE", bc: "#f59e0b", title: "$100 Dental Credit", body: "Applied in 24h",           cta: "→ Highest value",      cc: "#f59e0b", border: "#f59e0b" },
    { badge: "",              bc: "",        title: "$35 Local Reward",    body: "Local partners",           cta: "→ Show PIN in store",  cc: "#7c3aed", border: "#7c3aed" },
    { badge: "",              bc: "",        title: "Donate $35",          body: "Charitable donation",      cta: "→ Give back",          cc: "#94a3b8", border: "#1e3a5f" },
  ];
  return (
    <PreviewShell practiceName={name}>
      <div className="flex-1 flex flex-col items-center px-2 pb-3" style={{ paddingTop: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 900, color: "white", marginBottom: 2 }}>Choose your reward</div>
        <div style={{ fontSize: 3.5, color: "#94a3b8", marginBottom: 5, textAlign: "center" }}>
          Automatically delivered when your friend visits
        </div>
        <div style={{ display: "flex", gap: 3, width: "100%" }}>
          {rewards.map((r, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              {r.badge && (
                <div style={{ background: r.bc, borderRadius: 3, textAlign: "center", fontSize: 3, fontWeight: 700, color: "#0d1117", padding: "1.5px 0", marginBottom: 2 }}>
                  {r.badge}
                </div>
              )}
              <div style={{ flex: 1, background: "#0f1e2e", border: `0.75px solid ${r.border}`, borderRadius: 3, padding: "3px 3px", display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: 5.5, fontWeight: 700, color: "white", textAlign: "center", marginBottom: 2 }}>{r.title}</div>
                <div style={{ fontSize: 3.5, color: "#94a3b8", textAlign: "center", flex: 1, lineHeight: 1.4 }}>{r.body}</div>
                <div style={{ fontSize: 4, color: r.cc, fontWeight: 700, textAlign: "center", marginTop: 2 }}>{r.cta}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PreviewShell>
  );
}

// ── Static marketing assets ────────────────────────────────────────────────────

const MARKETING_ASSETS = [
  {
    label:    "Referral Card — Back",
    file:     "ripplcardback.png",
    download: "rippl-referral-card-back.png",
    aspect:   "4/3",
  },
  {
    label:    "Referral Card — Front",
    file:     "ripplcardfront.png",
    download: "rippl-referral-card-front.png",
    aspect:   "4/3",
  },
  {
    label:    "Flyer — 5 in",
    file:     "rippl-flyer-5in.png",
    download: "rippl-flyer-5in.png",
    aspect:   "4/3",
  },
  {
    label:    "Flyer — 8.5 in",
    file:     "rippl-flyer-8.5in.png",
    download: "rippl-flyer-8.5in.png",
    aspect:   "4/3",
  },
];

// ── Main page ──────────────────────────────────────────────────────────────────

export default function SlideDeck() {
  const { profile } = useAuth();
  const [practiceName, setPracticeName] = useState("Hallmark Dental");
  const [loading, setLoading]           = useState(false);
  const [done, setDone]                 = useState(false);
  const [error, setError]               = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    fetch(`${BASE}/api/offices`)
      .then(r => r.json())
      .then((offices: { name: string }[]) => {
        if (Array.isArray(offices) && offices[0]?.name) {
          const dash = offices[0].name.lastIndexOf("–");
          const base = dash !== -1 ? offices[0].name.slice(0, dash).trim() : offices[0].name;
          if (base) setPracticeName(base);
        }
      })
      .catch(() => {});
  }, [profile]);

  async function handleGenerate() {
    setLoading(true);
    setDone(false);
    setError(null);
    try {
      await generateDeck(practiceName || "Your Practice");
      setDone(true);
      setTimeout(() => setDone(false), 5000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("Slide deck error:", e);
      setError(`Generation failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-10 pb-12">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-xl bg-[#E0622A]/10 flex items-center justify-center">
            <Monitor className="w-4 h-4 text-[#E0622A]" />
          </div>
          <span className="text-xs font-bold text-[#E0622A] uppercase tracking-widest">Marketing</span>
        </div>
        <h1 className="text-2xl font-display font-bold text-slate-900 mb-2">
          Marketing Materials
        </h1>
        <p className="text-slate-500 leading-relaxed">
          Download ready-made assets for your practice — slide deck for Google Slides and printable referral materials.
        </p>
      </div>

      {/* ── Section 1: Waiting Room Slide Deck ── */}
      <div className="space-y-5">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <Monitor className="w-4 h-4 text-slate-400" />
          Waiting Room Slide Deck
        </h2>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Practice Name (shown on slides)
            </label>
            <input
              type="text"
              value={practiceName}
              onChange={e => setPracticeName(e.target.value)}
              placeholder="Hallmark Dental"
              className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#E0622A]/25 focus:border-[#E0622A] transition-all"
            />
          </div>

          <div className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-500 leading-relaxed">
              3 slides: hero (tier rewards), how it works, choose your reward.
              Download → upload to Google Drive → "Open with Google Slides."
            </p>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 font-mono break-all">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading || !practiceName.trim()}
            className="w-full flex items-center justify-center gap-2 bg-[#1a2e5a] hover:bg-[#162547] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-all text-sm"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
            ) : done ? (
              <><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Downloaded — check Downloads folder</>
            ) : (
              <><Download className="w-4 h-4" /> Download Slide Deck (.pptx)</>
            )}
          </button>
        </div>

        {/* Live previews */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Preview</p>
          <div className="space-y-4">
            {[
              { label: "Slide 1 — Refer a friend. Earn rewards.", El: () => <Slide1Preview name={practiceName} /> },
              { label: "Slide 2 — How it works",                 El: () => <Slide2Preview name={practiceName} /> },
              { label: "Slide 3 — Choose your reward",           El: () => <Slide3Preview name={practiceName} /> },
            ].map(({ label, El }) => (
              <div key={label} className="space-y-1.5">
                <p className="text-xs font-semibold text-slate-600">{label}</p>
                <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm" style={{ aspectRatio: "16/9" }}>
                  <El />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Google Slides steps */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Getting it into Google Slides</p>
          </div>
          <div className="divide-y divide-slate-100">
            {[
              { n: "1", t: "Download the .pptx file",       b: 'Click "Download Slide Deck" above — file saves to Downloads.' },
              { n: "2", t: "Upload to Google Drive",          b: 'drive.google.com → "+ New" → "File upload" → select the .pptx.' },
              { n: "3", t: "Open as Google Slides",           b: 'Right-click the file → "Open with" → "Google Slides". Converts automatically.' },
              { n: "4", t: "Display on your waiting room TV", b: 'Slideshow → "Present on another screen." Set to auto-advance every 12 seconds.' },
            ].map(({ n, t, b }) => (
              <div key={n} className="flex gap-4 px-5 py-4">
                <div className="w-6 h-6 rounded-full bg-[#E0622A] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{n}</div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 mb-0.5">{t}</p>
                  <p className="text-sm text-slate-500 leading-relaxed">{b}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Section 2: Referral Cards ── */}
      <div className="space-y-5">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-slate-400" />
          Referral Cards &amp; Flyers
        </h2>
        <p className="text-sm text-slate-500">
          Download print-ready PNGs. Send to a local print shop or use Moo.com / Vistaprint.
        </p>

        <div className="grid grid-cols-2 gap-4">
          {MARKETING_ASSETS.map(asset => (
            <div key={asset.file} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide text-center">{asset.label}</p>
              <div className="rounded-xl overflow-hidden border border-slate-100 bg-slate-50">
                <img
                  src={`/marketing/${asset.file}`}
                  alt={asset.label}
                  className="w-full h-auto object-contain"
                  loading="lazy"
                />
              </div>
              <a
                href={`/marketing/${asset.file}`}
                download={asset.download}
                className="flex w-full items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2.5 rounded-xl transition-all text-xs"
              >
                <Download className="w-3.5 h-3.5" />
                Download PNG
              </a>
            </div>
          ))}
        </div>

        <div className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-500 leading-relaxed">
            The QR code links to <span className="font-mono text-slate-700">joinrippl.com/find</span> — patients enter their mobile number to get their personal referral link instantly. Works for all offices.
          </p>
        </div>
      </div>

      {/* ── Section 3: Printable Posters ── */}
      <div className="space-y-5">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-slate-400" />
          Waiting Room Posters
        </h2>
        <p className="text-sm text-slate-500">
          Open the poster in a new tab, then Cmd+P → "Background graphics" on → Save as PDF or print directly.
        </p>

        <a
          href="/print/flyer-8.5in.html"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl px-5 py-4 shadow-sm hover:border-slate-300 hover:shadow-md transition-all group"
        >
          <div>
            <p className="text-sm font-bold text-slate-800 group-hover:text-[#E0622A] transition-colors">8.5×11 in Waiting Room Flyer</p>
            <p className="text-xs text-slate-500 mt-0.5">Full-page · dark navy + orange · Fraunces font</p>
          </div>
          <Download className="w-4 h-4 text-slate-400 group-hover:text-[#E0622A] transition-colors shrink-0" />
        </a>

        <div className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-500 leading-relaxed">
            In the print dialog: set paper to Letter, make sure "Background graphics" is enabled, then Save as PDF. For physical prints, use FedEx, Staples, or a local print shop.
          </p>
        </div>
      </div>

    </div>
  );
}
