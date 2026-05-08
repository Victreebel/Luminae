export function VoidSovereign() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(ellipse at 50% 50%, #0c0c14 0%, #040407 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "22px",
        padding: "40px",
        overflow: "hidden",
        position: "relative",
        userSelect: "none",
      }}
    >
      {/* Inlined keyframes for shimmer animation */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Cinzel+Decorative:wght@400;700;900&display=swap');

        @keyframes shimmer-sweep {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }

        @keyframes pulse-glow {
          0%, 100% { opacity: 0.55; }
          50%       { opacity: 0.85; }
        }

        .luminae-void-title {
          font-family: 'Cinzel Decorative', 'Cinzel', serif;
          font-weight: 900;
          font-size: clamp(52px, 9.5vw, 84px);
          letter-spacing: 0.15em;
          line-height: 1;
          margin: 0;
          color: transparent;
          background: linear-gradient(
            105deg,
            #0f0f1a 0%,
            #1a1a2e 15%,
            #eaf0ff 30%,
            #ffffff 38%,
            #1e1e32 45%,
            #0a0a14 55%,
            #e8d9ff 62%,
            #ffffff 68%,
            #1a1a2e 75%,
            #0f0f1a 100%
          );
          background-size: 300% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer-sweep 6s linear infinite;
          filter:
            drop-shadow(0 0 1px rgba(255,255,255,0.9))
            drop-shadow(0 0 16px rgba(180,160,255,0.35))
            drop-shadow(0 0 40px rgba(120,100,200,0.18));
          position: relative;
          z-index: 1;
        }
      `}</style>

      {/* Outer glow orb behind title */}
      <div
        style={{
          position: "absolute",
          width: 500,
          height: 200,
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse, rgba(100,80,180,0.12) 0%, transparent 70%)",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
          animation: "pulse-glow 4s ease-in-out infinite",
        }}
      />

      {/* Decorative corner marks */}
      {[
        { top: 20, left: 20 },
        { top: 20, right: 20 },
        { bottom: 20, left: 20 },
        { bottom: 20, right: 20 },
      ].map((pos, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: 18,
            height: 18,
            borderTop: i < 2 ? "1px solid rgba(200,210,255,0.2)" : undefined,
            borderBottom: i >= 2 ? "1px solid rgba(200,210,255,0.2)" : undefined,
            borderLeft: i % 2 === 0 ? "1px solid rgba(200,210,255,0.2)" : undefined,
            borderRight: i % 2 === 1 ? "1px solid rgba(200,210,255,0.2)" : undefined,
            ...pos,
          }}
        />
      ))}

      {/* Top ornamental line */}
      <div
        style={{
          width: "70%",
          maxWidth: 480,
          display: "flex",
          alignItems: "center",
          gap: 10,
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ flex: 1, height: 1, background: "linear-gradient(to right, transparent, rgba(255,255,255,0.15))" }} />
        <div
          style={{
            width: 5,
            height: 5,
            transform: "rotate(45deg)",
            border: "1px solid rgba(255,255,255,0.25)",
          }}
        />
        <div style={{ flex: 1, height: 1, background: "linear-gradient(to left, transparent, rgba(255,255,255,0.15))" }} />
      </div>

      {/* Main title */}
      <h1 className="luminae-void-title">LUMINAE</h1>

      {/* Affinity spectrum bar */}
      <div
        style={{
          width: "55%",
          maxWidth: 360,
          height: 2,
          background:
            "linear-gradient(90deg, #C8D4F8, #FF6B52, #607AFF, #2ECC71, #B14FD8, #FFC43D)",
          borderRadius: 1,
          opacity: 0.3,
          position: "relative",
          zIndex: 1,
          filter: "blur(0.5px)",
        }}
      />

      {/* Subtitle */}
      <p
        style={{
          margin: 0,
          fontSize: 9,
          letterSpacing: "0.45em",
          color: "rgba(200,210,255,0.3)",
          textTransform: "uppercase",
          fontFamily: "'Cinzel', serif",
          fontWeight: 400,
          position: "relative",
          zIndex: 1,
        }}
      >
        Collect · Forge · Ascend
      </p>

      {/* Bottom ornamental line */}
      <div
        style={{
          width: "70%",
          maxWidth: 480,
          display: "flex",
          alignItems: "center",
          gap: 10,
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ flex: 1, height: 1, background: "linear-gradient(to right, transparent, rgba(255,255,255,0.15))" }} />
        <div
          style={{
            width: 5,
            height: 5,
            transform: "rotate(45deg)",
            border: "1px solid rgba(255,255,255,0.25)",
          }}
        />
        <div style={{ flex: 1, height: 1, background: "linear-gradient(to left, transparent, rgba(255,255,255,0.15))" }} />
      </div>
    </div>
  );
}
