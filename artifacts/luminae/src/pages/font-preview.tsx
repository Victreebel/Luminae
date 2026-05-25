const LETTERS = [
  { char: "L", color: "#C8D4F8", glow: "#A8B8E8", name: "Radiance" },
  { char: "U", color: "#FF6B52", glow: "#FF8A6A", name: "Flare" },
  { char: "M", color: "#607AFF", glow: "#7090FF", name: "Continuum" },
  { char: "I", color: "#2ECC71", glow: "#5BE197", name: "Verdance" },
  { char: "N", color: "#B14FD8", glow: "#CC72EE", name: "Abyss" },
  { char: "A", color: "#FFC43D", glow: "#FFE08A", name: "Singularity" },
  { char: "E", color: "#C8D4F8", glow: "#A8B8E8", name: "Radiance" },
];

const AFFINITY_COLORS = ["#C8D4F8", "#FF6B52", "#607AFF", "#2ECC71", "#B14FD8", "#FFC43D"];
const AFFINITY_NAMES = ["Radiance", "Flare", "Continuum", "Verdance", "Abyss", "Singularity"];
const GRADIENT = `linear-gradient(100deg, ${[...AFFINITY_COLORS, "#C8D4F8"].join(", ")})`;

function Label({ children }: { children: string }) {
  return (
    <div style={{
      position: "absolute",
      top: 12,
      left: 16,
      fontSize: 10,
      letterSpacing: "0.25em",
      textTransform: "uppercase",
      color: "rgba(200,212,248,0.35)",
      fontFamily: "'Cinzel', serif",
      pointerEvents: "none",
    }}>
      {children}
    </div>
  );
}

function VariantA() {
  return (
    <div style={{
      flex: 1,
      background: "radial-gradient(ellipse at 50% 40%, #0e0e1a 0%, #050508 100%)",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: 24, padding: 32,
      fontFamily: "'Cinzel Decorative', 'Cinzel', serif",
      position: "relative", overflow: "hidden",
    }}>
      <Label>A · Crystal Spectrum</Label>

      {/* Stars */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        {Array.from({ length: 48 }).map((_, i) => (
          <div key={i} style={{
            position: "absolute",
            width: i % 5 === 0 ? 2 : 1, height: i % 5 === 0 ? 2 : 1,
            borderRadius: "50%", background: "rgba(200,215,255,0.6)",
            left: `${(i * 37 + i * i * 3) % 100}%`,
            top: `${(i * 53 + i * 7) % 100}%`,
            opacity: 0.3 + (i % 5) * 0.12,
          }} />
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, width: "80%", position: "relative", zIndex: 1 }}>
        <div style={{ flex: 1, height: 1, background: "linear-gradient(to right, transparent, rgba(200,212,248,0.3))" }} />
        <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#C8D4F8", opacity: 0.5 }} />
        <div style={{ flex: 1, height: 1, background: "linear-gradient(to left, transparent, rgba(200,212,248,0.3))" }} />
      </div>

      <div style={{ display: "flex", gap: "0.03em", position: "relative", zIndex: 1 }}>
        {LETTERS.map((l, i) => (
          <span key={i} style={{
            fontSize: "clamp(48px, 7vw, 72px)",
            fontWeight: 700, letterSpacing: "0.02em",
            color: l.color,
            textShadow: `0 0 24px ${l.glow}cc, 0 0 60px ${l.glow}55, 0 0 90px ${l.glow}22`,
            lineHeight: 1, display: "inline-block",
          }}>{l.char}</span>
        ))}
      </div>

      <p style={{ margin: 0, fontSize: 10, letterSpacing: "0.35em", color: "rgba(200,212,248,0.45)", textTransform: "uppercase", fontFamily: "'Cinzel', serif", position: "relative", zIndex: 1 }}>
        A Cosmic Engine-Building Game
      </p>

      <div style={{ display: "flex", gap: 8, alignItems: "center", position: "relative", zIndex: 1 }}>
        {AFFINITY_COLORS.map((c, i) => (
          <div key={i} style={{ width: 8, height: 8, borderRadius: "2px", transform: "rotate(45deg)", background: c, boxShadow: `0 0 8px ${c}88` }} />
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, width: "80%", position: "relative", zIndex: 1 }}>
        <div style={{ flex: 1, height: 1, background: "linear-gradient(to right, transparent, rgba(200,212,248,0.3))" }} />
        <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#C8D4F8", opacity: 0.5 }} />
        <div style={{ flex: 1, height: 1, background: "linear-gradient(to left, transparent, rgba(200,212,248,0.3))" }} />
      </div>
    </div>
  );
}

function VariantB() {
  return (
    <div style={{
      flex: 1,
      background: "#06060f",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: 18, padding: 32,
      position: "relative", overflow: "hidden",
      fontFamily: "'Cinzel', serif",
    }}>
      <Label>B · Prismatic Refraction</Label>

      <div style={{
        position: "absolute", width: "140%", height: 160, left: "-20%", top: "50%",
        transform: "translateY(-50%) rotate(-2deg)",
        background: "linear-gradient(90deg, transparent 0%, rgba(200,212,248,0.03) 8%, rgba(255,107,82,0.04) 18%, rgba(96,122,255,0.05) 32%, rgba(46,204,113,0.04) 48%, rgba(177,79,216,0.04) 62%, rgba(255,196,61,0.04) 76%, rgba(200,212,248,0.03) 88%, transparent 100%)",
        pointerEvents: "none",
      }} />

      <div style={{
        position: "absolute", bottom: "18%", left: "50%", transform: "translateX(-50%)",
        width: "75%", height: 3, background: GRADIENT, opacity: 0.35, borderRadius: 2, filter: "blur(2px)",
      }} />

      <div style={{ width: "55%", height: 1, background: "linear-gradient(90deg, transparent, rgba(255,196,61,0.4), transparent)", position: "relative", zIndex: 1 }} />

      <h1 style={{
        margin: 0,
        fontSize: "clamp(52px, 8vw, 84px)",
        fontFamily: "'Cinzel Decorative', 'Cinzel', serif",
        fontWeight: 900, letterSpacing: "0.12em",
        background: GRADIENT,
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        backgroundClip: "text", backgroundSize: "200% 100%",
        filter: "drop-shadow(0 0 30px rgba(180, 160, 255, 0.25))",
        position: "relative", zIndex: 1, lineHeight: 1.1,
      }}>LUMINAE</h1>

      <div style={{ display: "flex", gap: 12, alignItems: "center", position: "relative", zIndex: 1 }}>
        {AFFINITY_NAMES.map((name, i) => (
          <span key={i} style={{ fontSize: 7, letterSpacing: "0.2em", textTransform: "uppercase", color: AFFINITY_COLORS[i], opacity: 0.65, fontFamily: "'Cinzel', serif" }}>
            {name}
          </span>
        ))}
      </div>

      <div style={{ width: "55%", height: 1, background: "linear-gradient(90deg, transparent, rgba(255,196,61,0.4), transparent)", position: "relative", zIndex: 1 }} />
    </div>
  );
}

function VariantC() {
  return (
    <div style={{
      flex: 1,
      background: "radial-gradient(ellipse at 50% 50%, #0c0c14 0%, #040407 100%)",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: 20, padding: 40,
      overflow: "hidden", position: "relative",
    }}>
      <style>{`
        @keyframes shimmer-sweep {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.55; }
          50%       { opacity: 0.85; }
        }
        .fp-void-title {
          font-family: 'Cinzel Decorative', 'Cinzel', serif;
          font-weight: 900;
          font-size: clamp(44px, 6.5vw, 76px);
          letter-spacing: 0.15em;
          line-height: 1; margin: 0; color: transparent;
          background: linear-gradient(105deg,
            #06060f  0%,
            #06060f  6%,
            #d0dcff 10%, #C8D4F8 13%, #d0dcff 16%,
            #06060f 20%,
            #06060f 27%,
            #ff9070 31%, #FF6B52 34%, #ff9070 37%,
            #06060f 41%,
            #06060f 48%,
            #8090ff 52%, #607AFF 55%, #8090ff 58%,
            #06060f 62%,
            #06060f 69%,
            #50e890 73%, #2ECC71 76%, #50e890 79%,
            #06060f 83%,
            #06060f 87%,
            #5c20b8 91%, #7028d0 93%, #5c20b8 95%,
            #06060f 99%,
            #06060f 100%
          );
          background-size: 400% 100%;
          -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
          animation: shimmer-sweep 50s linear infinite;
          filter: drop-shadow(0 0 1px rgba(255,196,61,0.9)) drop-shadow(0 0 18px rgba(255,196,61,0.25)) drop-shadow(0 0 40px rgba(200,140,40,0.15));
          position: relative; z-index: 1;
        }
      `}</style>
      <Label>C · Void Sovereign</Label>

      <div style={{
        position: "absolute", width: 500, height: 200, borderRadius: "50%",
        background: "radial-gradient(ellipse, rgba(100,80,180,0.12) 0%, transparent 70%)",
        top: "50%", left: "50%", transform: "translate(-50%, -50%)",
        pointerEvents: "none", animation: "pulse-glow 4s ease-in-out infinite",
      }} />

      {[{ top: 20, left: 20 }, { top: 20, right: 20 }, { bottom: 20, left: 20 }, { bottom: 20, right: 20 }].map((pos, i) => (
        <div key={i} style={{
          position: "absolute", width: 18, height: 18,
          borderTop: i < 2 ? "1px solid rgba(255,196,61,0.3)" : undefined,
          borderBottom: i >= 2 ? "1px solid rgba(255,196,61,0.3)" : undefined,
          borderLeft: i % 2 === 0 ? "1px solid rgba(255,196,61,0.3)" : undefined,
          borderRight: i % 2 === 1 ? "1px solid rgba(255,196,61,0.3)" : undefined,
          ...pos,
        }} />
      ))}

      <div style={{ width: "70%", display: "flex", alignItems: "center", gap: 10, position: "relative", zIndex: 1 }}>
        <div style={{ flex: 1, height: 1, background: "linear-gradient(to right, transparent, rgba(255,196,61,0.3))" }} />
        <div style={{ width: 5, height: 5, transform: "rotate(45deg)", border: "1px solid rgba(255,196,61,0.45)" }} />
        <div style={{ flex: 1, height: 1, background: "linear-gradient(to left, transparent, rgba(255,196,61,0.3))" }} />
      </div>

      <h1 className="fp-void-title">LUMINAE</h1>

      <p style={{ margin: 0, fontSize: 8, letterSpacing: "0.45em", color: "rgba(255,196,61,0.45)", textTransform: "uppercase", fontFamily: "'Cinzel', serif", fontWeight: 400, position: "relative", zIndex: 1 }}>
        Collect · Forge · Ascend
      </p>

      <div style={{ width: "70%", display: "flex", alignItems: "center", gap: 10, position: "relative", zIndex: 1 }}>
        <div style={{ flex: 1, height: 1, background: "linear-gradient(to right, transparent, rgba(255,196,61,0.3))" }} />
        <div style={{ width: 5, height: 5, transform: "rotate(45deg)", border: "1px solid rgba(255,196,61,0.45)" }} />
        <div style={{ flex: 1, height: 1, background: "linear-gradient(to left, transparent, rgba(255,196,61,0.3))" }} />
      </div>
    </div>
  );
}

export default function FontPreview() {
  if (import.meta.env.PROD) return null;
  return (
    <div style={{ display: "flex", width: "100vw", height: "100vh", overflow: "hidden" }}>
      <VariantA />
      <div style={{ width: 1, background: "rgba(255,255,255,0.08)", flexShrink: 0 }} />
      <VariantB />
      <div style={{ width: 1, background: "rgba(255,255,255,0.08)", flexShrink: 0 }} />
      <VariantC />
    </div>
  );
}
