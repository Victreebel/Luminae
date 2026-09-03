import { useEffect, useState } from "react";

type ViewportSize = {
  width: number;
  height: number;
};

function readViewportSize(): ViewportSize {
  if (typeof window === "undefined") return { width: 1024, height: 768 };
  return { width: window.innerWidth, height: window.innerHeight };
}

export function useViewportSize(): ViewportSize {
  const [size, setSize] = useState(readViewportSize);

  useEffect(() => {
    const update = () => setSize(readViewportSize());
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return size;
}
