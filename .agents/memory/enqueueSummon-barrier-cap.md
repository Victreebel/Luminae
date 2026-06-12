---
name: enqueueSummon animation barrier — cap at 500 ms
description: The Luminary arrival cutscene must not wait the full forge animation lock; cap at 500 ms.
---

## The rule
In `enqueueSummon` (game.tsx), the animation barrier check before `doEnqueueArrival`
must be **capped at 500 ms**:

```js
const cappedBarrier = Math.min(animBarrier, 500);
setTimeout(doEnqueueArrival, cappedBarrier + 100);
```

## Why
The barrier was added so the Luminary portal DOM measurement fires after
card-market animations settle. But the portal lives in a completely
separate DOM section — forge/deal animations don't affect its layout.
Waiting the full lock duration (3000 ms normal, 5800 ms fallback) caused:
1. A visible 3-second freeze before the arrival cutscene started.
2. Summons being silently "skipped" because the state queue had already
   advanced past the event by the time `doEnqueueArrival` fired.

500 ms is more than enough for the DOM to settle after any card animation.

## How to apply
If the barrier logic in `enqueueSummon` is ever refactored, keep the 500 ms
cap. Do not raise it back to an uncapped `animationEndTimeRef.current - Date.now()`.
