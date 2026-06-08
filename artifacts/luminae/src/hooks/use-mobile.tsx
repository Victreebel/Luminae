import * as React from "react"

const MOBILE_BREAKPOINT = 768

function hasTouchSupport(): boolean {
  return (
    typeof window !== 'undefined' &&
    (('ontouchstart' in window) || navigator.maxTouchPoints > 0)
  )
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const touch = hasTouchSupport()
    const check = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT && touch)
    }
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    mql.addEventListener("change", check)
    check()
    return () => mql.removeEventListener("change", check)
  }, [])

  return !!isMobile
}
