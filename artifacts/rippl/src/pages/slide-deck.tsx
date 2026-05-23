/**
 * Marketing Materials hub — waiting-room slide deck + downloadable marketing assets.
 */
import PptxGenJS from "pptxgenjs";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  Download, Monitor, Info, CheckCircle2, Loader2, ImageIcon,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

// ── Design tokens ──────────────────────────────────────────────────────────────
const BG      = "0d1117";
const CARD_BG = "0f1e2e";
const TEAL    = "2dd4bf";
const ORANGE  = "f59e0b";
const PURPLE  = "7c3aed";
const WHITE   = "ffffff";
const MUTED   = "94a3b8";
const BORDER  = "1e3a5f";

// ── Slide shell (no practice logo — generic template) ──────────────────────────
function addShell(s: ReturnType<PptxGenJS["addSlide"]>) {
  s.background = { color: BG };

  // Teal rounded border
  s.addShape(pptx.ShapeType.roundRect, {
    x: 0.12, y: 0.12, w: 13.09, h: 7.26,
    fill: { type: "none" } as any,
    line: { color: TEAL, width: 2.5 },
    rectRadius: 0.25,
  });

  // Powered by Rippl (bottom-right)
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
  pptx.layout = "LAYOUT_WIDE"; // 13.33 × 7.5 in

  // Slide 1 — Refer a friend. Earn rewards.
  {
    const s = pptx.addSlide();
    addShell(s);

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
        rectRadius: 0.57,
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
    addShell(s);

    s.addText("How it works", {
      x: 0.5, y: 0.85, w: 12.33, h: 1.0,
      fontSize: 64, bold: true, color: WHITE, fontFace: "Arial Black", align: "center",
    });

    const STEPS = [
      { num: "01", title: "Get your link",      body: "Ask the front desk for your personal referral link" },
      { num: "02", title: "Share with friends", body: "Text or email your link to anyone who needs a great dentist" },
      { num: "03", title: "Earn rewards",        body: "When they visit you automatically earn up to $100" },
    ];
    const cardW = 3.6, cardH = 5.05, gap = 0.5;
    const totalW = STEPS.length * cardW + (STEPS.length - 1) * gap;
    const sx = (13.33 - totalW) / 2;
    const sy = 1.65;

    STEPS.forEach((step, i) => {
      const x = sx + i * (cardW + gap);
      s.addShape(pptx.ShapeType.roundRect, {
        x, y: sy, w: cardW, h: cardH,
        fill: { color: CARD_BG },
        line: { color: TEAL, width: 1.5 },
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
    addShell(s);

    s.addText("Choose your reward", {
      x: 0.5, y: 0.75, w: 12.33, h: 0.95,
      fontSize: 60, bold: true, color: WHITE, fontFace: "Arial Black", align: "center",
    });
    s.addText("Your choice — automatically delivered when your friend visits", {
      x: 0.5, y: 1.65, w: 12.33, h: 0.4,
      fontSize: 15, color: MUTED, align: "center",
    });

    const REWARDS = [
      { badge: "MOST POPULAR",  badgeColor: TEAL,   title: "$35 Gift Card",      body: "Amazon, Visa, Target,\nStarbucks & more",  cta: "→ Instant delivery",  ctaColor: TEAL,   border: TEAL,   cardBg: CARD_BG  },
      { badge: "MOST VALUABLE", badgeColor: ORANGE, title: "$100 Dental Credit", body: "Applied to your account\nwithin 24 hours",  cta: "→ Highest value",     ctaColor: ORANGE, border: ORANGE, cardBg: "1a0e04" },
      { badge: "",              badgeColor: "",      title: "$35 Local Reward",   body: "Redeem at local partner\nbusinesses",       cta: "→ Show PIN in store", ctaColor: PURPLE, border: PURPLE, cardBg: "120a1e" },
      { badge: "",              badgeColor: "",      title: "Donate $35",         body: "Charitable donation\nin your name",         cta: "→ Give back",         ctaColor: MUTED,  border: BORDER, cardBg: CARD_BG  },
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
        fill: { color: r.cardBg },
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

  const slug = (practiceName || "rippl").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  await pptx.writeFile({ fileName: `rippl-waiting-room-${slug}.pptx` });
}

// ── Scaled slide previews ──────────────────────────────────────────────────────
// Inner canvas is 800×450 (60px/PPTX-inch, 0.833px/PPTX-pt), scaled to fit container.

const CW = 800;   // canvas width px
const CH = 450;   // canvas height px
const IN = 60;    // px per PPTX inch
const PT = 0.833; // px per PPTX point

function ScaledSlide({ children }: { children: React.ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    if (!outerRef.current) return;
    const obs = new ResizeObserver(entries => {
      setScale(entries[0].contentRect.width / CW);
    });
    obs.observe(outerRef.current);
    setScale(outerRef.current.offsetWidth / CW || 0.5);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={outerRef} style={{ width: "100%", aspectRatio: "16/9", position: "relative", overflow: "hidden", background: "#0d1117" }}>
      <div style={{
        position: "absolute", top: 0, left: 0,
        width: CW, height: CH,
        transform: `scale(${scale})`,
        transformOrigin: "top left",
        background: "#0d1117",
        fontFamily: "system-ui, -apple-system, Arial, sans-serif",
      }}>
        {children}
      </div>
    </div>
  );
}

function SlideBorder() {
  return (
    <>
      <div style={{
        position: "absolute",
        left: 0.12 * IN, top: 0.12 * IN,
        width: 13.09 * IN, height: 7.26 * IN,
        border: "3px solid #2dd4bf",
        borderRadius: 0.25 * IN,
        pointerEvents: "none",
        boxSizing: "border-box",
      }} />
      <div style={{
        position: "absolute",
        right: 0.28 * IN, bottom: 0.16 * IN,
        display: "flex", alignItems: "center", gap: 6,
      }}>
        <div style={{ width: 13, height: 13, borderRadius: "50%", background: "#2dd4bf" }} />
        <span style={{ fontSize: 8.5 * PT, color: "white", fontWeight: 700 }}>Powered by Rippl</span>
      </div>
    </>
  );
}

function Slide1Preview({ name: _ }: { name: string }) {
  const TIERS = [
    { label: "INFLUENCER", amt: "$35",  sub: "1st referral", border: "#2dd4bf" },
    { label: "AMPLIFIER",  amt: "$50",  sub: "3 referrals",  border: "#2dd4bf" },
    { label: "AMBASSADOR", amt: "$75",  sub: "6 referrals",  border: "#2dd4bf" },
    { label: "LEGEND",     amt: "$100", sub: "10 referrals", border: "#7c3aed" },
  ];
  const bW = 2.6 * IN, bH = 1.15 * IN, bG = 0.25 * IN;
  const totalBW = TIERS.length * bW + (TIERS.length - 1) * bG;
  const bX0 = (CW - totalBW) / 2;
  const bY = 4.05 * IN;

  return (
    <ScaledSlide>
      <SlideBorder />
      <div style={{ position: "absolute", left: 0.5 * IN, top: 1.1 * IN, width: 12.33 * IN, fontSize: 78 * PT, fontWeight: 900, color: "white", textAlign: "center", lineHeight: 1.05, whiteSpace: "nowrap" }}>
        Refer a friend.
      </div>
      <div style={{ position: "absolute", left: 0.5 * IN, top: 2.2 * IN, width: 12.33 * IN, fontSize: 78 * PT, fontWeight: 900, color: "#2dd4bf", textAlign: "center", lineHeight: 1.05, whiteSpace: "nowrap" }}>
        Earn rewards.
      </div>
      <div style={{ position: "absolute", left: 1.0 * IN, top: 3.45 * IN, width: 11.33 * IN, fontSize: 17 * PT, color: "#94a3b8", textAlign: "center" }}>
        Share your personal link — when they visit, you earn. No forms. No waiting. Automatic.
      </div>
      {TIERS.map((t, i) => (
        <div key={t.label} style={{
          position: "absolute",
          left: bX0 + i * (bW + bG), top: bY,
          width: bW, height: bH,
          background: "#0f1e2e",
          border: `2px solid ${t.border}`,
          borderRadius: bH / 2,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 2,
        }}>
          <div style={{ fontSize: 7.5 * PT, fontWeight: 700, color: "#2dd4bf", letterSpacing: "0.12em" }}>{t.label}</div>
          <div style={{ fontSize: 36 * PT, fontWeight: 900, color: "white", lineHeight: 1 }}>{t.amt}</div>
          <div style={{ fontSize: 9.5 * PT, color: "#94a3b8" }}>{t.sub}</div>
        </div>
      ))}
      <div style={{ position: "absolute", left: 0.5 * IN, top: 5.5 * IN, width: 12.33 * IN, fontSize: 14 * PT, color: "#94a3b8", textAlign: "center" }}>
        Ask the front desk for your personal referral link today
      </div>
    </ScaledSlide>
  );
}

function Slide2Preview({ name: _ }: { name: string }) {
  const STEPS = [
    { num: "01", title: "Get your link",      body: "Ask the front desk for your personal referral link" },
    { num: "02", title: "Share with friends", body: "Text or email your link to anyone who needs a great dentist" },
    { num: "03", title: "Earn rewards",        body: "When they visit you automatically earn up to $100" },
  ];
  const cW = 3.6 * IN, cH = 5.05 * IN, gap = 0.5 * IN;
  const totalCW = STEPS.length * cW + (STEPS.length - 1) * gap;
  const cX0 = (CW - totalCW) / 2;
  const cY = 1.65 * IN;

  return (
    <ScaledSlide>
      <SlideBorder />
      <div style={{ position: "absolute", left: 0.5 * IN, top: 0.85 * IN, width: 12.33 * IN, fontSize: 64 * PT, fontWeight: 900, color: "white", textAlign: "center", lineHeight: 1.05 }}>
        How it works
      </div>
      {STEPS.map((step, i) => {
        const x = cX0 + i * (cW + gap);
        return (
          <div key={i} style={{
            position: "absolute",
            left: x, top: cY, width: cW, height: cH,
            background: "#0f1e2e",
            border: "1.5px solid #2dd4bf",
            borderRadius: 0.15 * IN,
            display: "flex", flexDirection: "column",
            alignItems: "center", paddingTop: 20, paddingLeft: 10, paddingRight: 10,
          }}>
            <div style={{ fontSize: 40 * PT, fontWeight: 900, color: "#2dd4bf", lineHeight: 1, marginBottom: 8 }}>{step.num}</div>
            <div style={{ fontSize: 20 * PT, fontWeight: 700, color: "white", textAlign: "center", marginBottom: 6 }}>{step.title}</div>
            <div style={{ fontSize: 14 * PT, color: "#94a3b8", textAlign: "center", lineHeight: 1.4 }}>{step.body}</div>
          </div>
        );
      })}
      {/* Arrows */}
      {[0, 1].map(i => {
        const arrowX = cX0 + (i + 1) * cW + i * gap;
        const arrowY = cY + cH / 2;
        return (
          <div key={i} style={{ position: "absolute", left: arrowX + 4, top: arrowY - 10, display: "flex", alignItems: "center", gap: 0 }}>
            <div style={{ width: gap - 14, height: 2, background: "#2dd4bf" }} />
            <div style={{ fontSize: 16 * PT, color: "#2dd4bf", lineHeight: 1 }}>→</div>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 0.5 * IN, top: 6.65 * IN, width: 12.33 * IN, fontSize: 12 * PT, color: "#2dd4bf", textAlign: "center" }}>
        Gift card · $100 Dental credit · Local partner · Charity donation
      </div>
    </ScaledSlide>
  );
}

function Slide3Preview({ name: _ }: { name: string }) {
  const REWARDS = [
    { badge: "MOST POPULAR",  bc: "#2dd4bf", title: "$35 Gift Card",      body: "Amazon, Visa, Target,\nStarbucks & more",  cta: "→ Instant delivery",  cc: "#2dd4bf", border: "#2dd4bf", cardBg: "#0f1e2e" },
    { badge: "MOST VALUABLE", bc: "#f59e0b", title: "$100 Dental Credit", body: "Applied to your account\nwithin 24 hours",  cta: "→ Highest value",     cc: "#f59e0b", border: "#f59e0b", cardBg: "#1a0e04" },
    { badge: "",              bc: "",        title: "$35 Local Reward",    body: "Redeem at local partner\nbusinesses",       cta: "→ Show PIN in store", cc: "#7c3aed", border: "#7c3aed", cardBg: "#120a1e" },
    { badge: "",              bc: "",        title: "Donate $35",          body: "Charitable donation\nin your name",         cta: "→ Give back",         cc: "#94a3b8", border: "#1e3a5f", cardBg: "#0f1e2e" },
  ];
  const rW = 2.8 * IN, rH = 4.6 * IN, rG = 0.28 * IN;
  const totalRW = REWARDS.length * rW + (REWARDS.length - 1) * rG;
  const rX0 = (CW - totalRW) / 2;
  const rY = 2.1 * IN;

  return (
    <ScaledSlide>
      <SlideBorder />
      <div style={{ position: "absolute", left: 0.5 * IN, top: 0.75 * IN, width: 12.33 * IN, fontSize: 60 * PT, fontWeight: 900, color: "white", textAlign: "center", lineHeight: 1.05 }}>
        Choose your reward
      </div>
      <div style={{ position: "absolute", left: 0.5 * IN, top: 1.65 * IN, width: 12.33 * IN, fontSize: 15 * PT, color: "#94a3b8", textAlign: "center" }}>
        Your choice — automatically delivered when your friend visits
      </div>
      {REWARDS.map((r, i) => {
        const x = rX0 + i * (rW + rG);
        return (
          <div key={i}>
            {r.badge && (
              <div style={{
                position: "absolute",
                left: x + 0.15 * IN, top: rY - 0.42 * IN,
                width: rW - 0.3 * IN, height: 0.38 * IN,
                background: r.bc, borderRadius: 0.15 * IN,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 8 * PT, fontWeight: 700, color: "#0d1117", letterSpacing: "0.05em",
              }}>{r.badge}</div>
            )}
            <div style={{
              position: "absolute",
              left: x, top: rY, width: rW, height: rH,
              background: r.cardBg,
              border: `1.5px solid ${r.border}`,
              borderRadius: 0.12 * IN,
              display: "flex", flexDirection: "column",
              padding: "18px 12px 14px",
            }}>
              <div style={{ fontSize: 17 * PT, fontWeight: 700, color: "white", textAlign: "center", marginBottom: 8 }}>{r.title}</div>
              <div style={{ fontSize: 12 * PT, color: "#94a3b8", textAlign: "center", flex: 1, lineHeight: 1.5, whiteSpace: "pre-line" }}>{r.body}</div>
              <div style={{ fontSize: 11 * PT, fontWeight: 700, color: r.cc, textAlign: "center" }}>{r.cta}</div>
            </div>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 0.5 * IN, top: 6.93 * IN, width: 11.0 * IN, fontSize: 10.5 * PT, color: "#94a3b8", textAlign: "center" }}>
        Ask the front desk for your personal referral link today · Rewards grow with every referral — up to $100
      </div>
    </ScaledSlide>
  );
}

// ── Static marketing assets ────────────────────────────────────────────────────

const MARKETING_ASSETS = [
  { label: "Referral Card — Back",  file: "ripplcardback.png",    download: "rippl-referral-card-back.png"  },
  { label: "Referral Card — Front", file: "ripplcardfront.png",   download: "rippl-referral-card-front.png" },
  { label: "Flyer — 5 in",         file: "rippl-flyer-5in.png",   download: "rippl-flyer-5in.png"           },
  { label: "Flyer — 8.5 in",       file: "rippl-flyer-8.5in.png", download: "rippl-flyer-8.5in.png"         },
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
      await generateDeck(practiceName || "rippl");
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
        <h1 className="text-2xl font-display font-bold text-slate-900 mb-2">Marketing Materials</h1>
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
              Practice Name (used in filename)
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
            disabled={loading}
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
              { label: "Slide 1 — Refer a friend. Earn rewards.", El: Slide1Preview },
              { label: "Slide 2 — How it works",                 El: Slide2Preview },
              { label: "Slide 3 — Choose your reward",           El: Slide3Preview },
            ].map(({ label, El }) => (
              <div key={label} className="space-y-1.5">
                <p className="text-xs font-semibold text-slate-600">{label}</p>
                <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                  <El name={practiceName} />
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
                <img src={`/marketing/${asset.file}`} alt={asset.label} className="w-full h-auto object-contain" loading="lazy" />
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
            The QR code links to <span className="font-mono text-slate-700">joinrippl.com/find</span> — patients enter their mobile number to get their personal referral link instantly.
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
            <p className="text-xs text-slate-500 mt-0.5">Open → Cmd+P → Save as PDF → print on letter paper</p>
          </div>
          <Download className="w-4 h-4 text-slate-400 group-hover:text-[#E0622A] transition-colors shrink-0" />
        </a>

        <div className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-500 leading-relaxed">
            In the print dialog: set paper to Letter, enable "Background graphics," then Save as PDF or send to a print shop.
          </p>
        </div>
      </div>

    </div>
  );
}
