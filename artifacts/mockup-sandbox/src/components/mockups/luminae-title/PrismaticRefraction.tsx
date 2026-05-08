export function PrismaticRefraction() {
  const gradientColors = [
    "#C8D4F8",
    "#FF6B52",
    "#607AFF",
    "#2ECC71",
    "#B14FD8",
    "#FFC43D",
    "#C8D4F8",
  ];

  const gradient = `linear-gradient(100deg, ${gradientColors.join(", ")})`;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#06060f",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "20px",
        padding: "32px",
        position: "relative",
        overflow: "hidden",
        fontFamily: "'Cinzel', serif",
        userSelect: "none",
      }}
    >
      {/* Refracted light bands behind title */}
      <div
        style={{
          position: "absolute",
          width: "140%",
          height: 180,
          left: "-20%",
          top: "50%",
          transform: "translateY(-50%) rotate(-2deg)",
          background:
            "linear-gradient(90deg, transparent 0%, rgba(200,212,248,0.03) 8%, rgba(255,107,82,0.04) 18%, rgba(96,122,255,0.05) 32%, rgba(46,204,113,0.04) 48%, rgba(177,79,216,0.04) 62%, rgba(255,196,61,0.04) 76%, rgba(200,212,248,0.03) 88%, transparent 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Prism refraction light split beneath */}
      <div
        style={{
          position: "absolute",
          bottom: "20%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "80%",
          height: 3,
          background: gradient,
          opacity: 0.35,
          borderRadius: 2,
          filter: "blur(2px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "calc(20% - 10px)",
          left: "55%",
          transform: "translateX(-50%)",
          width: "60%",
          height: 1,
          background: gradient,
          opacity: 0.15,
          filter: "blur(1px)",
        }}
      />

      {/* Thin gold divider line above */}
      <div
        style={{
          width: "60%",
          maxWidth: 420,
          height: 1,
          background: "linear-gradient(90deg, transparent, rgba(255,196,61,0.4), transparent)",
          position: "relative",
          zIndex: 1,
        }}
      />

      {/* Main gradient title */}
      <h1
        style={{
          margin: 0,
          fontSize: "clamp(60px, 11vw, 96px)",
          fontFamily: "'Cinzel Decorative', 'Cinzel', serif",
          fontWeight: 900,
          letterSpacing: "0.12em",
          background: gradient,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          backgroundSize: "200% 100%",
          filter: "drop-shadow(0 0 30px rgba(180, 160, 255, 0.25))",
          position: "relative",
          zIndex: 1,
          lineHeight: 1.1,
        }}
      >
        LUMINAE
      </h1>

      {/* Prismatic tagline with individual affinity colors */}
      <div
        style={{
          display: "flex",
          gap: "16px",
          alignItems: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        {["Radiance", "Flare", "Continuum", "Verdance", "Abyss", "Singularity"].map((name, i) => {
          const colors = ["#C8D4F8", "#FF6B52", "#607AFF", "#2ECC71", "#B14FD8", "#FFC43D"];
          return (
            <span
              key={i}
              style={{
                fontSize: 8,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: colors[i],
                opacity: 0.6,
                fontFamily: "'Cinzel', serif",
              }}
            >
              {name}
            </span>
          );
        })}
      </div>

      {/* Thin divider below */}
      <div
        style={{
          width: "60%",
          maxWidth: 420,
          height: 1,
          background: "linear-gradient(90deg, transparent, rgba(255,196,61,0.4), transparent)",
          position: "relative",
          zIndex: 1,
        }}
      />
    </div>
  );
}
