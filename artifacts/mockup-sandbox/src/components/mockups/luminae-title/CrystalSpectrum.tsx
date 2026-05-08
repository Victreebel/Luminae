const LETTERS = [
  { char: "L", color: "#C8D4F8", glow: "#A8B8E8", name: "Radiance" },
  { char: "U", color: "#FF6B52", glow: "#FF8A6A", name: "Flare" },
  { char: "M", color: "#607AFF", glow: "#7090FF", name: "Continuum" },
  { char: "I", color: "#2ECC71", glow: "#5BE197", name: "Verdance" },
  { char: "N", color: "#B14FD8", glow: "#CC72EE", name: "Abyss" },
  { char: "A", color: "#FFC43D", glow: "#FFE08A", name: "Singularity" },
  { char: "E", color: "#C8D4F8", glow: "#A8B8E8", name: "Radiance" },
];

export function CrystalSpectrum() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(ellipse at 50% 40%, #0e0e1a 0%, #050508 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "28px",
        padding: "32px",
        fontFamily: "'Cinzel Decorative', 'Cinzel', serif",
        userSelect: "none",
      }}
    >
      {/* Star field */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        {Array.from({ length: 48 }).map((_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              width: i % 5 === 0 ? 2 : 1,
              height: i % 5 === 0 ? 2 : 1,
              borderRadius: "50%",
              background: "rgba(200,215,255,0.6)",
              left: `${(i * 37 + i * i * 3) % 100}%`,
              top: `${(i * 53 + i * 7) % 100}%`,
              opacity: 0.3 + (i % 5) * 0.12,
            }}
          />
        ))}
      </div>

      {/* Thin decorative line above */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", maxWidth: 560, position: "relative", zIndex: 1 }}>
        <div style={{ flex: 1, height: 1, background: "linear-gradient(to right, transparent, rgba(200,212,248,0.3))" }} />
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#C8D4F8", opacity: 0.5 }} />
        <div style={{ flex: 1, height: 1, background: "linear-gradient(to left, transparent, rgba(200,212,248,0.3))" }} />
      </div>

      {/* Title */}
      <div
        style={{
          display: "flex",
          gap: "0.04em",
          position: "relative",
          zIndex: 1,
        }}
      >
        {LETTERS.map((l, i) => (
          <span
            key={i}
            style={{
              fontSize: "clamp(56px, 10vw, 88px)",
              fontWeight: 700,
              letterSpacing: "0.02em",
              color: l.color,
              textShadow: `0 0 24px ${l.glow}cc, 0 0 60px ${l.glow}55, 0 0 90px ${l.glow}22`,
              transition: "text-shadow 0.3s",
              lineHeight: 1,
              display: "inline-block",
            }}
          >
            {l.char}
          </span>
        ))}
      </div>

      {/* Subtitle */}
      <p
        style={{
          margin: 0,
          fontSize: 12,
          letterSpacing: "0.35em",
          color: "rgba(200,212,248,0.45)",
          textTransform: "uppercase",
          fontFamily: "'Cinzel', serif",
          fontWeight: 400,
          position: "relative",
          zIndex: 1,
        }}
      >
        A Cosmic Engine-Building Game
      </p>

      {/* Affinity gem row */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", position: "relative", zIndex: 1 }}>
        {LETTERS.slice(0, 6).map((l, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "2px",
                transform: "rotate(45deg)",
                background: l.color,
                boxShadow: `0 0 8px ${l.glow}88`,
              }}
            />
          </div>
        ))}
      </div>

      {/* Thin decorative line below */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", maxWidth: 560, position: "relative", zIndex: 1 }}>
        <div style={{ flex: 1, height: 1, background: "linear-gradient(to right, transparent, rgba(200,212,248,0.3))" }} />
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#C8D4F8", opacity: 0.5 }} />
        <div style={{ flex: 1, height: 1, background: "linear-gradient(to left, transparent, rgba(200,212,248,0.3))" }} />
      </div>
    </div>
  );
}
