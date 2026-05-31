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

// ── Slide design tokens (Bold Celebration — dark warm bg, orange-first) ────────
const BG      = "111111";
const CARD_BG = "1e1108";
const ORANGE  = "E0622A";
const AMBER   = "F5A623";
const WHITE   = "FFFFFF";
const MUTED   = "888888";
const SOFT    = "cccccc";

// Bespoke / luxury tokens
const GOLD       = "C9A84C";
const GOLD_SOFT  = "8B6B1A";
const CARD_LUX   = "1a140a";

const FRAUNCES = "Fraunces";
const DM_SANS  = "DM Sans";
const GEIST    = "Geist Mono";

// ── Slide shell ────────────────────────────────────────────────────────────────
function addShell(s: ReturnType<PptxGenJS["addSlide"]>) {
  s.background = { color: BG };
  s.addShape(pptx.ShapeType.roundRect, {
    x: 0.12, y: 0.12, w: 13.09, h: 7.26,
    fill: { type: "none" } as any,
    line: { color: ORANGE, width: 2.5 },
    rectRadius: 0.25,
  });
  s.addShape(pptx.ShapeType.ellipse, {
    x: 11.55, y: 7.05, w: 0.22, h: 0.22,
    fill: { color: ORANGE },
  });
  s.addText("Powered by Rippl", {
    x: 11.8, y: 7.02, w: 1.4, h: 0.28,
    fontSize: 8.5, color: WHITE, bold: true, valign: "middle", fontFace: DM_SANS,
  });
}

function addBespokeShell(s: ReturnType<PptxGenJS["addSlide"]>) {
  s.background = { color: BG };
  s.addShape(pptx.ShapeType.roundRect, {
    x: 0.12, y: 0.12, w: 13.09, h: 7.26,
    fill: { type: "none" } as any,
    line: { color: GOLD, width: 2.5 },
    rectRadius: 0.25,
  });
  s.addShape(pptx.ShapeType.ellipse, {
    x: 11.55, y: 7.05, w: 0.22, h: 0.22,
    fill: { color: GOLD },
  });
  s.addText("Powered by Rippl", {
    x: 11.8, y: 7.02, w: 1.4, h: 0.28,
    fontSize: 8.5, color: WHITE, bold: true, valign: "middle", fontFace: DM_SANS,
  });
}

let pptx: PptxGenJS;

// ── Vertical-specific slide content ───────────────────────────────────────────

const SLIDE_CONTENT = {
  dental: {
    tiers: [
      { label: "INFLUENCER", amt: "$35",  sub: "1st referral", border: ORANGE },
      { label: "AMPLIFIER",  amt: "$50",  sub: "3 referrals",  border: ORANGE },
      { label: "AMBASSADOR", amt: "$75",  sub: "6 referrals",  border: ORANGE },
      { label: "LEGEND",     amt: "$100", sub: "10 referrals", border: AMBER  },
    ],
    s1Cta:   "Ask the front desk for your personal referral link today",
    s2Steps: [
      { num: "01", title: "Get your link",      body: "Ask the front desk for your personal referral link" },
      { num: "02", title: "Share with friends", body: "Text or email your link to anyone who needs a great dentist" },
      { num: "03", title: "Earn rewards",        body: "When they visit, you automatically earn a reward — your choice" },
    ],
    s2Footer: "Gift card · Dental credit · Local reward · Charitable donation — you choose",
    s3Subtitle: "Your choice — automatically delivered when your friend visits",
    s3Rewards: [
      { badge: "MOST POPULAR",  badgeColor: ORANGE, title: "Gift Card",     body: "Amazon, Visa, Target,\nStarbucks & more",  cta: "→ Instant delivery",  ctaColor: ORANGE, border: ORANGE,   cardBg: CARD_BG  },
      { badge: "MOST VALUABLE", badgeColor: AMBER,  title: "Dental Credit", body: "Applied to your account\nwithin 24 hours", cta: "→ Highest value",     ctaColor: AMBER,  border: AMBER,    cardBg: "1c1000" },
      { badge: "",              badgeColor: "",     title: "Local Reward",  body: "Redeem at local partner\nbusinesses",       cta: "→ Show PIN in store", ctaColor: SOFT,   border: "444444", cardBg: "181818" },
      { badge: "",              badgeColor: "",     title: "Donate",        body: "Charitable donation\nin your name",         cta: "→ Give back",         ctaColor: MUTED,  border: "333333", cardBg: "141414" },
    ] as RewardCard[],
    s3Footer: "Ask the front desk for your personal referral link today  ·  Rewards grow with every referral",
    deckSlug: "waiting-room",
    tvStep:   "Display on your waiting room TV",
  },
  automotive: {
    tiers: [
      { label: "INFLUENCER", amt: "$100", sub: "1st referral", border: ORANGE },
      { label: "AMPLIFIER",  amt: "$150", sub: "3 referrals",  border: ORANGE },
      { label: "AMBASSADOR", amt: "$200", sub: "6 referrals",  border: ORANGE },
      { label: "LEGEND",     amt: "$250", sub: "10 referrals", border: AMBER  },
    ],
    s1Cta:   "Ask our sales team for your personal referral link today",
    s2Steps: [
      { num: "01", title: "Get your link",      body: "Ask our sales team for your personal referral link" },
      { num: "02", title: "Share with friends", body: "Text or email your link to anyone looking for their next vehicle" },
      { num: "03", title: "Earn rewards",        body: "When they purchase, you automatically earn a reward — your choice" },
    ],
    s2Footer: "Gift card · Charitable donation — you choose",
    s3Subtitle: "Your choice — automatically delivered when your friend purchases",
    s3Rewards: [
      { badge: "MOST POPULAR", badgeColor: ORANGE, title: "Gift Card", body: "Amazon, Visa, Target,\nStarbucks & more", cta: "→ Instant delivery", ctaColor: ORANGE, border: ORANGE,   cardBg: CARD_BG  },
      { badge: "",             badgeColor: "",     title: "Donate",    body: "Charitable donation\nin your name",       cta: "→ Give back",       ctaColor: MUTED,  border: "333333", cardBg: "141414" },
    ] as RewardCard[],
    s3Footer: "Ask our sales team for your personal referral link today  ·  Rewards grow with every referral",
    deckSlug: "showroom-floor",
    tvStep:   "Display on your showroom floor TV",
  },
} as const;

type RewardCard = {
  badge: string; badgeColor: string; title: string; body: string;
  cta: string; ctaColor: string; border: string; cardBg: string;
};

// ── Bespoke (ultra-luxury) deck content ────────────────────────────────────────

const BESPOKE = {
  tiers: [
    { label: "CONNOISSEUR", sub: "1st referral" },
    { label: "PATRON",      sub: "3 referrals"  },
    { label: "MAISON",      sub: "6 referrals"  },
    { label: "CURATOR",     sub: "10 referrals" },
  ],
  s1Tag:     "Be rewarded.",
  s1Body:    "Share the experience — when they join our family of clients, your reward is personally arranged.",
  s1Cta:     "Speak with your advisor for your personal referral link",
  s2Steps: [
    { num: "01", title: "Your link",           body: "Your sales advisor will provide your personal referral link" },
    { num: "02", title: "Make the introduction", body: "Share with friends who share your passion for exceptional automobiles" },
    { num: "03", title: "Your reward",          body: "When they become a client, a curated reward is arranged for you" },
  ],
  s2Footer:   "Fine dining · Private events · Bespoke experiences — curated for you",
  s3Title:    "Your reward, curated",
  s3Subtitle: "Each experience is personally arranged — no forms, no waiting",
  s3Rewards: [
    { badge: "MOST REQUESTED", title: "Fine Dining",      body: "An evening for two at a\nrestaurant of your choosing",   cta: "→ Reserved for you"           },
    { badge: "",               title: "Track Experience", body: "A private driving session\nat a premier circuit",         cta: "→ Arranged personally"        },
    { badge: "",               title: "Maison Weekend",   body: "Hotel, dinner, and an\nexperience — curated for you",    cta: "→ Co-designed with your advisor" },
    { badge: "",               title: "Charitable Gift",  body: "A donation in your name\nto your chosen cause",          cta: "→ Your legacy"                },
  ],
  s3Footer:   "Speak with your advisor · Every reward is personally arranged",
};

async function generateBespokeDeck(practiceName: string): Promise<void> {
  pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";

  // Slide 1 — Refer a friend. Be rewarded.
  {
    const s = pptx.addSlide();
    addBespokeShell(s);
    s.addText("Refer a friend.", {
      x: 0.5, y: 1.1, w: 12.33, h: 1.3,
      fontSize: 78, bold: true, color: WHITE, fontFace: FRAUNCES, align: "center",
    });
    s.addText(BESPOKE.s1Tag, {
      x: 0.5, y: 2.2, w: 12.33, h: 1.3,
      fontSize: 78, bold: true, color: GOLD, fontFace: FRAUNCES, align: "center",
    });
    s.addText(BESPOKE.s1Body, {
      x: 1.0, y: 3.45, w: 11.33, h: 0.55,
      fontSize: 16, color: MUTED, align: "center", fontFace: DM_SANS,
    });
    const badgeW = 2.6, badgeGap = 0.25;
    const totalW = BESPOKE.tiers.length * badgeW + (BESPOKE.tiers.length - 1) * badgeGap;
    const startX = (13.33 - totalW) / 2;
    BESPOKE.tiers.forEach((tier, i) => {
      const x = startX + i * (badgeW + badgeGap);
      const y = 4.05;
      s.addShape(pptx.ShapeType.roundRect, {
        x, y, w: badgeW, h: 1.15,
        fill: { color: CARD_LUX },
        line: { color: GOLD, width: 1.5 },
        rectRadius: 0.57,
      });
      s.addText(tier.label, {
        x, y: y + 0.28, w: badgeW, h: 0.32,
        fontSize: 13, bold: true, color: GOLD, align: "center", charSpacing: 1.5, fontFace: DM_SANS,
      });
      s.addText(tier.sub, {
        x, y: y + 0.66, w: badgeW, h: 0.28,
        fontSize: 10, color: MUTED, align: "center", fontFace: DM_SANS,
      });
    });
    s.addText(BESPOKE.s1Cta, {
      x: 0.5, y: 5.5, w: 12.33, h: 0.35,
      fontSize: 14, color: MUTED, align: "center", fontFace: DM_SANS,
    });
  }

  // Slide 2 — How it works
  {
    const s = pptx.addSlide();
    addBespokeShell(s);
    s.addText("How it works", {
      x: 0.5, y: 0.85, w: 12.33, h: 1.0,
      fontSize: 64, bold: true, color: WHITE, fontFace: FRAUNCES, align: "center",
    });
    const cardW = 3.6, cardH = 4.0, gap = 0.5;
    const totalW = BESPOKE.s2Steps.length * cardW + (BESPOKE.s2Steps.length - 1) * gap;
    const sx = (13.33 - totalW) / 2;
    const sy = 1.85;
    BESPOKE.s2Steps.forEach((step, i) => {
      const x = sx + i * (cardW + gap);
      s.addShape(pptx.ShapeType.roundRect, {
        x, y: sy, w: cardW, h: cardH,
        fill: { color: CARD_LUX },
        line: { color: GOLD, width: 1.5 },
        rectRadius: 0.15,
      });
      s.addText(step.num, {
        x, y: sy + 0.35, w: cardW, h: 0.65,
        fontSize: 40, bold: true, color: GOLD, fontFace: GEIST, align: "center",
      });
      s.addText(step.title, {
        x: x + 0.15, y: sy + 1.1, w: cardW - 0.3, h: 0.5,
        fontSize: 20, bold: true, color: WHITE, align: "center", fontFace: FRAUNCES,
      });
      s.addText(step.body, {
        x: x + 0.2, y: sy + 1.7, w: cardW - 0.4, h: 1.2,
        fontSize: 14, color: SOFT, align: "center", lineSpacingMultiple: 1.4, fontFace: DM_SANS,
      });
      if (i < BESPOKE.s2Steps.length - 1) {
        const ax = x + cardW + 0.06;
        const ay = sy + cardH / 2 - 0.15;
        s.addShape(pptx.ShapeType.rect, {
          x: ax, y: ay + 0.12, w: gap - 0.12, h: 0.03,
          fill: { color: GOLD_SOFT },
        });
        s.addText("→", {
          x: ax + gap - 0.48, y: ay - 0.03, w: 0.4, h: 0.35,
          fontSize: 18, color: GOLD, align: "center", valign: "middle",
        });
      }
    });
    s.addText(BESPOKE.s2Footer, {
      x: 0.5, y: 6.5, w: 12.33, h: 0.3,
      fontSize: 12, color: GOLD, align: "center", fontFace: DM_SANS,
    });
  }

  // Slide 3 — Your reward, curated
  {
    const s = pptx.addSlide();
    addBespokeShell(s);
    s.addText(BESPOKE.s3Title, {
      x: 0.5, y: 0.75, w: 12.33, h: 0.95,
      fontSize: 60, bold: true, color: GOLD, fontFace: FRAUNCES, align: "center",
    });
    s.addText(BESPOKE.s3Subtitle, {
      x: 0.5, y: 1.65, w: 12.33, h: 0.4,
      fontSize: 15, color: MUTED, align: "center", fontFace: DM_SANS,
    });
    const rcW = 2.8, rcH = 3.8, rcG = 0.28;
    const totalW = BESPOKE.s3Rewards.length * rcW + (BESPOKE.s3Rewards.length - 1) * rcG;
    const rx = (13.33 - totalW) / 2;
    const ry = 2.7;
    BESPOKE.s3Rewards.forEach((r, i) => {
      const x = rx + i * (rcW + rcG);
      const isFirst = i === 0;
      if (r.badge) {
        s.addShape(pptx.ShapeType.roundRect, {
          x: x + 0.15, y: ry - 0.42, w: rcW - 0.3, h: 0.38,
          fill: { color: GOLD },
          line: { color: GOLD, width: 0 },
          rectRadius: 0.15,
        });
        s.addText(r.badge, {
          x: x + 0.15, y: ry - 0.42, w: rcW - 0.3, h: 0.38,
          fontSize: 8, bold: true, color: BG, align: "center", valign: "middle", charSpacing: 1, fontFace: DM_SANS,
        });
      }
      s.addShape(pptx.ShapeType.roundRect, {
        x, y: ry, w: rcW, h: rcH,
        fill: { color: isFirst ? CARD_LUX : "181818" },
        line: { color: isFirst ? GOLD : "444444", width: 1.5 },
        rectRadius: 0.12,
      });
      s.addText(r.title, {
        x: x + 0.12, y: ry + 0.3, w: rcW - 0.24, h: 0.6,
        fontSize: 17, bold: true, color: WHITE, align: "center", fontFace: FRAUNCES,
      });
      s.addText(r.body, {
        x: x + 0.12, y: ry + 1.0, w: rcW - 0.24, h: 0.9,
        fontSize: 12, color: SOFT, align: "center", lineSpacingMultiple: 1.5, fontFace: DM_SANS,
      });
      s.addText(r.cta, {
        x: x + 0.12, y: ry + rcH - 0.45, w: rcW - 0.24, h: 0.35,
        fontSize: 11, bold: true, color: isFirst ? GOLD : MUTED, align: "center", fontFace: DM_SANS,
      });
    });
    s.addText(BESPOKE.s3Footer, {
      x: 0.5, y: 6.93, w: 11.0, h: 0.28,
      fontSize: 10.5, color: MUTED, align: "center", fontFace: DM_SANS,
    });
  }

  const slug = (practiceName || "rippl").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  await pptx.writeFile({ fileName: `rippl-bespoke-${slug}.pptx` });
}

// ── Deck generator ─────────────────────────────────────────────────────────────
async function generateDeck(practiceName: string, isAuto: boolean): Promise<void> {
  const content = isAuto ? SLIDE_CONTENT.automotive : SLIDE_CONTENT.dental;
  pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";

  // Slide 1 — Refer a friend. Earn rewards.
  {
    const s = pptx.addSlide();
    addShell(s);
    s.addText("Refer a friend.", {
      x: 0.5, y: 1.1, w: 12.33, h: 1.3,
      fontSize: 78, bold: true, color: WHITE, fontFace: FRAUNCES, align: "center",
    });
    s.addText("Earn rewards.", {
      x: 0.5, y: 2.2, w: 12.33, h: 1.3,
      fontSize: 78, bold: true, color: ORANGE, fontFace: FRAUNCES, align: "center",
    });
    s.addText(
      isAuto
        ? "Share your personal link — when they buy, you earn. No forms. No waiting. Automatic."
        : "Share your personal link — when they visit, you earn. No forms. No waiting. Automatic.",
      { x: 1.0, y: 3.45, w: 11.33, h: 0.55, fontSize: 17, color: MUTED, align: "center", fontFace: DM_SANS },
    );
    const TIERS = content.tiers;
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
        fontSize: 7.5, bold: true, color: ORANGE, align: "center", charSpacing: 1.5, fontFace: DM_SANS,
      });
      s.addText(tier.amt, {
        x, y: y + 0.27, w: badgeW, h: 0.55,
        fontSize: 36, bold: true, color: WHITE, fontFace: FRAUNCES, align: "center",
      });
      s.addText(tier.sub, {
        x, y: y + 0.82, w: badgeW, h: 0.24,
        fontSize: 9.5, color: MUTED, align: "center", fontFace: DM_SANS,
      });
    });
    s.addText(content.s1Cta, {
      x: 0.5, y: 5.5, w: 12.33, h: 0.35,
      fontSize: 14, color: MUTED, align: "center", fontFace: DM_SANS,
    });
  }

  // Slide 2 — How it works
  {
    const s = pptx.addSlide();
    addShell(s);
    s.addText("How it works", {
      x: 0.5, y: 0.85, w: 12.33, h: 1.0,
      fontSize: 64, bold: true, color: WHITE, fontFace: FRAUNCES, align: "center",
    });
    const cardW = 3.6, cardH = 4.0, gap = 0.5;
    const totalW = content.s2Steps.length * cardW + (content.s2Steps.length - 1) * gap;
    const sx = (13.33 - totalW) / 2;
    const sy = 1.85;
    content.s2Steps.forEach((step, i) => {
      const x = sx + i * (cardW + gap);
      s.addShape(pptx.ShapeType.roundRect, {
        x, y: sy, w: cardW, h: cardH,
        fill: { color: CARD_BG },
        line: { color: ORANGE, width: 1.5 },
        rectRadius: 0.15,
      });
      s.addText(step.num, {
        x, y: sy + 0.35, w: cardW, h: 0.65,
        fontSize: 40, bold: true, color: ORANGE, fontFace: GEIST, align: "center",
      });
      s.addText(step.title, {
        x: x + 0.15, y: sy + 1.1, w: cardW - 0.3, h: 0.5,
        fontSize: 20, bold: true, color: WHITE, align: "center", fontFace: FRAUNCES,
      });
      s.addText(step.body, {
        x: x + 0.2, y: sy + 1.7, w: cardW - 0.4, h: 1.2,
        fontSize: 14, color: SOFT, align: "center", lineSpacingMultiple: 1.4, fontFace: DM_SANS,
      });
      if (i < content.s2Steps.length - 1) {
        const ax = x + cardW + 0.06;
        const ay = sy + cardH / 2 - 0.15;
        s.addShape(pptx.ShapeType.rect, {
          x: ax, y: ay + 0.12, w: gap - 0.12, h: 0.03,
          fill: { color: ORANGE },
        });
        s.addText("→", {
          x: ax + gap - 0.48, y: ay - 0.03, w: 0.4, h: 0.35,
          fontSize: 18, color: ORANGE, align: "center", valign: "middle",
        });
      }
    });
    s.addText(content.s2Footer, {
      x: 0.5, y: 6.5, w: 12.33, h: 0.3,
      fontSize: 12, color: AMBER, align: "center", fontFace: DM_SANS,
    });
  }

  // Slide 3 — Choose your reward
  {
    const s = pptx.addSlide();
    addShell(s);
    s.addText("Choose your reward", {
      x: 0.5, y: 0.75, w: 12.33, h: 0.95,
      fontSize: 60, bold: true, color: WHITE, fontFace: FRAUNCES, align: "center",
    });
    s.addText(content.s3Subtitle, {
      x: 0.5, y: 1.65, w: 12.33, h: 0.4,
      fontSize: 15, color: MUTED, align: "center", fontFace: DM_SANS,
    });
    const rcW = isAuto ? 3.8 : 2.8;
    const rcH = 3.8;
    const rcG = isAuto ? 0.6 : 0.28;
    const totalW = content.s3Rewards.length * rcW + (content.s3Rewards.length - 1) * rcG;
    const rx = (13.33 - totalW) / 2;
    const ry = 2.7;
    content.s3Rewards.forEach((r, i) => {
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
          fontSize: 8, bold: true, color: BG, align: "center", valign: "middle", charSpacing: 1, fontFace: DM_SANS,
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
        fontSize: 17, bold: true, color: WHITE, align: "center", fontFace: FRAUNCES,
      });
      s.addText(r.body, {
        x: x + 0.12, y: ry + 1.0, w: rcW - 0.24, h: 0.9,
        fontSize: 12, color: SOFT, align: "center", lineSpacingMultiple: 1.5, fontFace: DM_SANS,
      });
      s.addText(r.cta, {
        x: x + 0.12, y: ry + rcH - 0.45, w: rcW - 0.24, h: 0.35,
        fontSize: 11, bold: true, color: r.ctaColor, align: "center", fontFace: DM_SANS,
      });
    });
    s.addText(content.s3Footer, {
      x: 0.5, y: 6.93, w: 11.0, h: 0.28,
      fontSize: 10.5, color: MUTED, align: "center", fontFace: DM_SANS,
    });
  }

  const slug = (practiceName || "rippl").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  await pptx.writeFile({ fileName: `rippl-${content.deckSlug}-${slug}.pptx` });
}

// ── Scaled slide previews ──────────────────────────────────────────────────────
const CW = 800;
const CH = 450;
const IN = 60;
const PT = 0.833;

const F_DISPLAY = "'Fraunces', Georgia, serif";
const F_BODY    = "'DM Sans', Arial, sans-serif";
const F_MONO    = "'Geist Mono', 'Courier New', monospace";

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
    <div ref={outerRef} style={{ width: "100%", aspectRatio: "16/9", position: "relative", overflow: "hidden", background: "#111111" }}>
      <div style={{
        position: "absolute", top: 0, left: 0,
        width: CW, height: CH,
        transform: `scale(${scale})`,
        transformOrigin: "top left",
        background: "#111111",
        fontFamily: F_BODY,
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
        border: "3px solid #E0622A",
        borderRadius: 0.25 * IN,
        pointerEvents: "none",
        boxSizing: "border-box",
      }} />
      <div style={{ position: "absolute", right: 0.28 * IN, bottom: 0.16 * IN, display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ width: 13, height: 13, borderRadius: "50%", background: "#E0622A" }} />
        <span style={{ fontSize: 8.5 * PT, color: "white", fontWeight: 700, fontFamily: F_BODY }}>Powered by Rippl</span>
      </div>
    </>
  );
}

function SlideBorderGold() {
  return (
    <>
      <div style={{
        position: "absolute",
        left: 0.12 * IN, top: 0.12 * IN,
        width: 13.09 * IN, height: 7.26 * IN,
        border: "3px solid #C9A84C",
        borderRadius: 0.25 * IN,
        pointerEvents: "none",
        boxSizing: "border-box",
      }} />
      <div style={{ position: "absolute", right: 0.28 * IN, bottom: 0.16 * IN, display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ width: 13, height: 13, borderRadius: "50%", background: "#C9A84C" }} />
        <span style={{ fontSize: 8.5 * PT, color: "white", fontWeight: 700, fontFamily: F_BODY }}>Powered by Rippl</span>
      </div>
    </>
  );
}

function BespokeSlide1Preview({ name: _ }: { name: string }) {
  const bW = 2.6 * IN, bH = 1.15 * IN, bG = 0.25 * IN;
  const totalBW = BESPOKE.tiers.length * bW + (BESPOKE.tiers.length - 1) * bG;
  const bX0 = (CW - totalBW) / 2;
  const bY = 4.05 * IN;
  return (
    <ScaledSlide>
      <SlideBorderGold />
      <div style={{ position: "absolute", left: 0.5 * IN, top: 1.1 * IN, width: 12.33 * IN, fontSize: 78 * PT, fontWeight: 700, color: "white", textAlign: "center", lineHeight: 1.05, whiteSpace: "nowrap", fontFamily: F_DISPLAY }}>
        Refer a friend.
      </div>
      <div style={{ position: "absolute", left: 0.5 * IN, top: 2.2 * IN, width: 12.33 * IN, fontSize: 78 * PT, fontWeight: 700, color: "#C9A84C", textAlign: "center", lineHeight: 1.05, whiteSpace: "nowrap", fontFamily: F_DISPLAY }}>
        Be rewarded.
      </div>
      <div style={{ position: "absolute", left: 1.0 * IN, top: 3.45 * IN, width: 11.33 * IN, fontSize: 16 * PT, color: "#888888", textAlign: "center", fontFamily: F_BODY }}>
        {BESPOKE.s1Body}
      </div>
      {BESPOKE.tiers.map((t, i) => (
        <div key={t.label} style={{
          position: "absolute",
          left: bX0 + i * (bW + bG), top: bY,
          width: bW, height: bH,
          background: "#1a140a",
          border: "2px solid #C9A84C",
          borderRadius: bH / 2,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 4,
        }}>
          <div style={{ fontSize: 11 * PT, fontWeight: 700, color: "#C9A84C", letterSpacing: "0.12em", fontFamily: F_BODY }}>{t.label}</div>
          <div style={{ fontSize: 9.5 * PT, color: "#888888", fontFamily: F_BODY }}>{t.sub}</div>
        </div>
      ))}
      <div style={{ position: "absolute", left: 0.5 * IN, top: 5.5 * IN, width: 12.33 * IN, fontSize: 14 * PT, color: "#888888", textAlign: "center", fontFamily: F_BODY }}>
        {BESPOKE.s1Cta}
      </div>
    </ScaledSlide>
  );
}

function BespokeSlide2Preview({ name: _ }: { name: string }) {
  const cW = 3.6 * IN, cH = 4.0 * IN, gap = 0.5 * IN;
  const totalCW = BESPOKE.s2Steps.length * cW + (BESPOKE.s2Steps.length - 1) * gap;
  const cX0 = (CW - totalCW) / 2;
  const cY = 1.85 * IN;
  return (
    <ScaledSlide>
      <SlideBorderGold />
      <div style={{ position: "absolute", left: 0.5 * IN, top: 0.85 * IN, width: 12.33 * IN, fontSize: 64 * PT, fontWeight: 700, color: "white", textAlign: "center", lineHeight: 1.05, fontFamily: F_DISPLAY }}>
        How it works
      </div>
      {BESPOKE.s2Steps.map((step, i) => {
        const x = cX0 + i * (cW + gap);
        return (
          <div key={i} style={{
            position: "absolute",
            left: x, top: cY, width: cW, height: cH,
            background: "#1a140a",
            border: "1.5px solid #C9A84C",
            borderRadius: 0.15 * IN,
            display: "flex", flexDirection: "column",
            alignItems: "center", paddingTop: 18, paddingLeft: 10, paddingRight: 10,
          }}>
            <div style={{ fontSize: 40 * PT, fontWeight: 600, color: "#C9A84C", lineHeight: 1, marginBottom: 8, fontFamily: F_MONO }}>{step.num}</div>
            <div style={{ fontSize: 20 * PT, fontWeight: 700, color: "white", textAlign: "center", marginBottom: 6, fontFamily: F_DISPLAY }}>{step.title}</div>
            <div style={{ fontSize: 14 * PT, color: "#cccccc", textAlign: "center", lineHeight: 1.4, fontFamily: F_BODY }}>{step.body}</div>
          </div>
        );
      })}
      {[0, 1].map(i => {
        const arrowX = cX0 + (i + 1) * cW + i * gap;
        const arrowY = cY + cH / 2;
        return (
          <div key={i} style={{ position: "absolute", left: arrowX + 4, top: arrowY - 10, display: "flex", alignItems: "center" }}>
            <div style={{ width: gap - 14, height: 2, background: "#8B6B1A" }} />
            <div style={{ fontSize: 16 * PT, color: "#C9A84C", lineHeight: 1 }}>→</div>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 0.5 * IN, top: 6.5 * IN, width: 12.33 * IN, fontSize: 12 * PT, color: "#C9A84C", textAlign: "center", fontFamily: F_BODY }}>
        {BESPOKE.s2Footer}
      </div>
    </ScaledSlide>
  );
}

function BespokeSlide3Preview({ name: _ }: { name: string }) {
  const rW = 2.8 * IN, rH = 3.8 * IN, rG = 0.28 * IN;
  const totalRW = BESPOKE.s3Rewards.length * rW + (BESPOKE.s3Rewards.length - 1) * rG;
  const rX0 = (CW - totalRW) / 2;
  const rY = 2.7 * IN;
  return (
    <ScaledSlide>
      <SlideBorderGold />
      <div style={{ position: "absolute", left: 0.5 * IN, top: 0.75 * IN, width: 12.33 * IN, fontSize: 60 * PT, fontWeight: 700, color: "#C9A84C", textAlign: "center", lineHeight: 1.05, fontFamily: F_DISPLAY }}>
        {BESPOKE.s3Title}
      </div>
      <div style={{ position: "absolute", left: 0.5 * IN, top: 1.65 * IN, width: 12.33 * IN, fontSize: 15 * PT, color: "#888888", textAlign: "center", fontFamily: F_BODY }}>
        {BESPOKE.s3Subtitle}
      </div>
      {BESPOKE.s3Rewards.map((r, i) => {
        const x = rX0 + i * (rW + rG);
        const isFirst = i === 0;
        return (
          <div key={i}>
            {r.badge && (
              <div style={{
                position: "absolute",
                left: x + 0.15 * IN, top: rY - 0.42 * IN,
                width: rW - 0.3 * IN, height: 0.38 * IN,
                background: "#C9A84C", borderRadius: 0.15 * IN,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 8 * PT, fontWeight: 700, color: "#111111", letterSpacing: "0.05em",
                fontFamily: F_BODY,
              }}>{r.badge}</div>
            )}
            <div style={{
              position: "absolute",
              left: x, top: rY, width: rW, height: rH,
              background: isFirst ? "#1a140a" : "#181818",
              border: `1.5px solid ${isFirst ? "#C9A84C" : "#444444"}`,
              borderRadius: 0.12 * IN,
              display: "flex", flexDirection: "column",
              padding: "14px 10px 12px",
            }}>
              <div style={{ fontSize: 17 * PT, fontWeight: 700, color: "white", textAlign: "center", marginBottom: 6, fontFamily: F_DISPLAY }}>{r.title}</div>
              <div style={{ fontSize: 12 * PT, color: "#cccccc", textAlign: "center", flex: 1, lineHeight: 1.5, whiteSpace: "pre-line", fontFamily: F_BODY }}>{r.body}</div>
              <div style={{ fontSize: 11 * PT, fontWeight: 700, color: isFirst ? "#C9A84C" : "#888888", textAlign: "center", fontFamily: F_BODY }}>{r.cta}</div>
            </div>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 0.5 * IN, top: 6.93 * IN, width: 11.0 * IN, fontSize: 10.5 * PT, color: "#888888", textAlign: "center", fontFamily: F_BODY }}>
        {BESPOKE.s3Footer}
      </div>
    </ScaledSlide>
  );
}

function Slide1Preview({ name: _, isAuto = false }: { name: string; isAuto?: boolean }) {
  const src = isAuto ? SLIDE_CONTENT.automotive : SLIDE_CONTENT.dental;
  const TIERS = src.tiers.map(t => ({
    ...t,
    border: `#${t.border}`,
    labelColor: "#E0622A",
  }));
  const bW = 2.6 * IN, bH = 1.15 * IN, bG = 0.25 * IN;
  const totalBW = TIERS.length * bW + (TIERS.length - 1) * bG;
  const bX0 = (CW - totalBW) / 2;
  const bY = 4.05 * IN;

  return (
    <ScaledSlide>
      <SlideBorder />
      <div style={{ position: "absolute", left: 0.5 * IN, top: 1.1 * IN, width: 12.33 * IN, fontSize: 78 * PT, fontWeight: 700, color: "white", textAlign: "center", lineHeight: 1.05, whiteSpace: "nowrap", fontFamily: F_DISPLAY }}>
        Refer a friend.
      </div>
      <div style={{ position: "absolute", left: 0.5 * IN, top: 2.2 * IN, width: 12.33 * IN, fontSize: 78 * PT, fontWeight: 700, color: "#E0622A", textAlign: "center", lineHeight: 1.05, whiteSpace: "nowrap", fontFamily: F_DISPLAY }}>
        Earn rewards.
      </div>
      <div style={{ position: "absolute", left: 1.0 * IN, top: 3.45 * IN, width: 11.33 * IN, fontSize: 17 * PT, color: "#888888", textAlign: "center", fontFamily: F_BODY }}>
        {isAuto
          ? "Share your personal link — when they buy, you earn. No forms. No waiting. Automatic."
          : "Share your personal link — when they visit, you earn. No forms. No waiting. Automatic."}
      </div>
      {TIERS.map((t, i) => (
        <div key={t.label} style={{
          position: "absolute",
          left: bX0 + i * (bW + bG), top: bY,
          width: bW, height: bH,
          background: "#1e1108",
          border: `2px solid ${t.border}`,
          borderRadius: bH / 2,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 2,
        }}>
          <div style={{ fontSize: 7.5 * PT, fontWeight: 700, color: t.labelColor, letterSpacing: "0.12em", fontFamily: F_BODY }}>{t.label}</div>
          <div style={{ fontSize: 36 * PT, fontWeight: 700, color: "white", lineHeight: 1, fontFamily: F_DISPLAY }}>{t.amt}</div>
          <div style={{ fontSize: 9.5 * PT, color: "#888888", fontFamily: F_BODY }}>{t.sub}</div>
        </div>
      ))}
      <div style={{ position: "absolute", left: 0.5 * IN, top: 5.5 * IN, width: 12.33 * IN, fontSize: 14 * PT, color: "#888888", textAlign: "center", fontFamily: F_BODY }}>
        {isAuto
          ? "Ask our sales team for your personal referral link today"
          : "Ask the front desk for your personal referral link today"}
      </div>
    </ScaledSlide>
  );
}

function Slide2Preview({ name: _, isAuto = false }: { name: string; isAuto?: boolean }) {
  const STEPS = isAuto ? SLIDE_CONTENT.automotive.s2Steps : SLIDE_CONTENT.dental.s2Steps;
  const cW = 3.6 * IN, cH = 4.0 * IN, gap = 0.5 * IN;
  const totalCW = STEPS.length * cW + (STEPS.length - 1) * gap;
  const cX0 = (CW - totalCW) / 2;
  const cY = 1.85 * IN;

  return (
    <ScaledSlide>
      <SlideBorder />
      <div style={{ position: "absolute", left: 0.5 * IN, top: 0.85 * IN, width: 12.33 * IN, fontSize: 64 * PT, fontWeight: 700, color: "white", textAlign: "center", lineHeight: 1.05, fontFamily: F_DISPLAY }}>
        How it works
      </div>
      {STEPS.map((step, i) => {
        const x = cX0 + i * (cW + gap);
        return (
          <div key={i} style={{
            position: "absolute",
            left: x, top: cY, width: cW, height: cH,
            background: "#1e1108",
            border: "1.5px solid #E0622A",
            borderRadius: 0.15 * IN,
            display: "flex", flexDirection: "column",
            alignItems: "center", paddingTop: 18, paddingLeft: 10, paddingRight: 10,
          }}>
            <div style={{ fontSize: 40 * PT, fontWeight: 600, color: "#E0622A", lineHeight: 1, marginBottom: 8, fontFamily: F_MONO }}>{step.num}</div>
            <div style={{ fontSize: 20 * PT, fontWeight: 700, color: "white", textAlign: "center", marginBottom: 6, fontFamily: F_DISPLAY }}>{step.title}</div>
            <div style={{ fontSize: 14 * PT, color: "#cccccc", textAlign: "center", lineHeight: 1.4, fontFamily: F_BODY }}>{step.body}</div>
          </div>
        );
      })}
      {[0, 1].map(i => {
        const arrowX = cX0 + (i + 1) * cW + i * gap;
        const arrowY = cY + cH / 2;
        return (
          <div key={i} style={{ position: "absolute", left: arrowX + 4, top: arrowY - 10, display: "flex", alignItems: "center" }}>
            <div style={{ width: gap - 14, height: 2, background: "#E0622A" }} />
            <div style={{ fontSize: 16 * PT, color: "#E0622A", lineHeight: 1 }}>→</div>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 0.5 * IN, top: 6.5 * IN, width: 12.33 * IN, fontSize: 12 * PT, color: "#F5A623", textAlign: "center", fontFamily: F_BODY }}>
        {isAuto ? SLIDE_CONTENT.automotive.s2Footer : SLIDE_CONTENT.dental.s2Footer}
      </div>
    </ScaledSlide>
  );
}

function Slide3Preview({ name: _, isAuto = false }: { name: string; isAuto?: boolean }) {
  const src = isAuto ? SLIDE_CONTENT.automotive : SLIDE_CONTENT.dental;
  const REWARDS = src.s3Rewards.map(r => ({
    badge: r.badge, bc: `#${r.badgeColor}`,
    title: r.title, body: r.body,
    cta: r.cta, cc: `#${r.ctaColor}`,
    border: `#${r.border}`, cardBg: `#${r.cardBg}`,
  }));
  const rW = (isAuto ? 3.8 : 2.8) * IN;
  const rH = 3.8 * IN;
  const rG = (isAuto ? 0.6 : 0.28) * IN;
  const totalRW = REWARDS.length * rW + (REWARDS.length - 1) * rG;
  const rX0 = (CW - totalRW) / 2;
  const rY = 2.7 * IN;

  return (
    <ScaledSlide>
      <SlideBorder />
      <div style={{ position: "absolute", left: 0.5 * IN, top: 0.75 * IN, width: 12.33 * IN, fontSize: 60 * PT, fontWeight: 700, color: "white", textAlign: "center", lineHeight: 1.05, fontFamily: F_DISPLAY }}>
        Choose your reward
      </div>
      <div style={{ position: "absolute", left: 0.5 * IN, top: 1.65 * IN, width: 12.33 * IN, fontSize: 15 * PT, color: "#888888", textAlign: "center", fontFamily: F_BODY }}>
        {src.s3Subtitle}
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
                fontSize: 8 * PT, fontWeight: 700, color: "#111111", letterSpacing: "0.05em",
                fontFamily: F_BODY,
              }}>{r.badge}</div>
            )}
            <div style={{
              position: "absolute",
              left: x, top: rY, width: rW, height: rH,
              background: r.cardBg,
              border: `1.5px solid ${r.border}`,
              borderRadius: 0.12 * IN,
              display: "flex", flexDirection: "column",
              padding: "14px 10px 12px",
            }}>
              <div style={{ fontSize: 17 * PT, fontWeight: 700, color: "white", textAlign: "center", marginBottom: 6, fontFamily: F_DISPLAY }}>{r.title}</div>
              <div style={{ fontSize: 12 * PT, color: "#cccccc", textAlign: "center", flex: 1, lineHeight: 1.5, whiteSpace: "pre-line", fontFamily: F_BODY }}>{r.body}</div>
              <div style={{ fontSize: 11 * PT, fontWeight: 700, color: r.cc, textAlign: "center", fontFamily: F_BODY }}>{r.cta}</div>
            </div>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 0.5 * IN, top: 6.93 * IN, width: 11.0 * IN, fontSize: 10.5 * PT, color: "#888888", textAlign: "center", fontFamily: F_BODY }}>
        {src.s3Footer}
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

// ── Bespoke deck section (rendered inside SlideDeck when isAuto) ───────────────

function BespokeDeckSection() {
  const [name, setName]     = useState("Carlock Motorcars");
  const [loading, setLoading] = useState(false);
  const [done, setDone]     = useState(false);
  const [error, setError]   = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true); setDone(false); setError(null);
    try {
      await generateBespokeDeck(name || "rippl");
      setDone(true);
      setTimeout(() => setDone(false), 5000);
    } catch (e) {
      setError(`Generation failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally { setLoading(false); }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Monitor className="w-4 h-4 text-slate-400" />
        <h2 className="text-base font-bold text-slate-800">Bespoke Experience Slide Deck</h2>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full border"
          style={{ background: "#1a140a", borderColor: "#C9A84C", color: "#C9A84C" }}>
          Ultra-Luxury
        </span>
      </div>
      <p className="text-sm text-slate-500">
        For Rolls-Royce, Bentley, and Aston Martin clientele. No dollar amounts — pure experience framing with a gold design language.
      </p>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Dealership Name (used in filename)
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Carlock Motorcars"
            className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/25 focus:border-[#C9A84C] transition-all"
          />
        </div>

        <div className="flex items-start gap-2 rounded-xl px-4 py-3" style={{ background: "#1a140a", border: "1px solid #C9A84C33" }}>
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: "#C9A84C" }} />
          <p className="text-xs leading-relaxed" style={{ color: "#C9A84C99" }}>
            3 slides: tier names only (no dollar amounts), how it works, curated experience rewards.
            Gold design language — no orange. Separate file from the standard deck.
          </p>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 font-mono break-all">{error}</div>
        )}

        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed font-semibold py-3.5 rounded-xl transition-all text-sm"
          style={{ background: "#C9A84C", color: "#111111" }}
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
          ) : done ? (
            <><CheckCircle2 className="w-4 h-4" /> Downloaded — check Downloads folder</>
          ) : (
            <><Download className="w-4 h-4" /> Download Bespoke Deck (.pptx)</>
          )}
        </button>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Preview</p>
        <div className="space-y-4">
          {[
            { label: "Slide 1 — Refer a friend. Be rewarded.", El: BespokeSlide1Preview },
            { label: "Slide 2 — How it works",                 El: BespokeSlide2Preview },
            { label: "Slide 3 — Your reward, curated",         El: BespokeSlide3Preview },
          ].map(({ label, El }) => (
            <div key={label} className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-600">{label}</p>
              <div className="rounded-xl overflow-hidden border shadow-sm" style={{ borderColor: "#C9A84C44" }}>
                <El name={name} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function SlideDeck() {
  const { profile, isDemo, demoVertical } = useAuth();
  const isAuto = isDemo && demoVertical === "automotive";
  const defaultName = isAuto ? "Summit Auto Group" : "Hallmark Dental";
  const deckSectionLabel = isAuto ? "Showroom Floor Slide Deck" : "Waiting Room Slide Deck";
  const tvStepLabel = isAuto ? "Display on your showroom floor TV" : "Display on your waiting room TV";

  const [practiceName, setPracticeName] = useState(defaultName);
  const [loading, setLoading]           = useState(false);
  const [done, setDone]                 = useState(false);
  const [error, setError]               = useState<string | null>(null);

  useEffect(() => {
    setPracticeName(isAuto ? "Summit Auto Group" : "Hallmark Dental");
  }, [isAuto]);

  useEffect(() => {
    if (!profile || isDemo) return;
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
  }, [profile, isDemo]);

  async function handleGenerate() {
    setLoading(true);
    setDone(false);
    setError(null);
    try {
      await generateDeck(practiceName || "rippl", isAuto);
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
          {isAuto
            ? "Download ready-made assets for your dealership — slide deck for Google Slides and referral materials."
            : "Download ready-made assets for your practice — slide deck for Google Slides and printable referral materials."}
        </p>
      </div>

      {/* ── Section 1: Slide Deck ── */}
      <div className="space-y-5">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <Monitor className="w-4 h-4 text-slate-400" />
          {deckSectionLabel}
        </h2>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {isAuto ? "Dealership Name (used in filename)" : "Practice Name (used in filename)"}
            </label>
            <input
              type="text"
              value={practiceName}
              onChange={e => setPracticeName(e.target.value)}
              placeholder={defaultName}
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
            className="w-full flex items-center justify-center gap-2 bg-[#E0622A] hover:bg-[#c8561f] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-all text-sm"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
            ) : done ? (
              <><CheckCircle2 className="w-4 h-4" /> Downloaded — check Downloads folder</>
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
                  <El name={practiceName} isAuto={isAuto} />
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
              { n: "1", t: "Download the .pptx file",   b: 'Click "Download Slide Deck" above — file saves to Downloads.' },
              { n: "2", t: "Upload to Google Drive",     b: 'drive.google.com → "+ New" → "File upload" → select the .pptx.' },
              { n: "3", t: "Open as Google Slides",      b: 'Right-click the file → "Open with" → "Google Slides". Converts automatically.' },
              { n: "4", t: tvStepLabel,                  b: 'Slideshow → "Present on another screen." Set to auto-advance every 12 seconds.' },
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

      {/* ── Bespoke Deck (ultra-luxury, auto demo only) ── */}
      {isAuto && <BespokeDeckSection />}

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
                className="flex w-full items-center justify-center gap-1.5 bg-[#E0622A] hover:bg-[#c8561f] text-white font-semibold py-2.5 rounded-xl transition-all text-xs"
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
          className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl px-5 py-4 shadow-sm hover:border-[#E0622A]/40 hover:shadow-md transition-all group"
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
