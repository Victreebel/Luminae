import { afterEach, describe, expect, it } from "vitest";
import { resolveOutOfMatchSound } from "./outOfMatchSounds";

afterEach(() => {
  document.body.replaceChildren();
});

function targetFrom(markup: string, selector = "button") {
  document.body.innerHTML = markup;
  return document.querySelector(selector);
}

describe("out-of-match sound direction", () => {
  it("gives the Vault its own cue even when a nested icon is clicked", () => {
    const target = targetFrom(
      '<button class="account-archive__door account-archive__door--vault"><span class="icon" /></button>',
      ".icon",
    );

    expect(resolveOutOfMatchSound(target)).toBe("vault");
  });

  it("distinguishes primary, archive, navigation, and ordinary controls", () => {
    expect(resolveOutOfMatchSound(targetFrom('<button class="oom-action-primary">Begin</button>')))
      .toBe("primary");
    expect(resolveOutOfMatchSound(targetFrom('<div class="oom-segmented"><button>Archive</button></div>')))
      .toBe("archive");
    expect(resolveOutOfMatchSound(targetFrom('<div class="oom-segmented"><button>Games</button></div>')))
      .toBe("navigate");
    expect(resolveOutOfMatchSound(targetFrom("<button>Refresh</button>"))).toBe("control");
  });

  it("routes store and settings controls to their own cues", () => {
    expect(resolveOutOfMatchSound(targetFrom('<div class="oom-segmented"><button>Store</button></div>')))
      .toBe("store");
    expect(resolveOutOfMatchSound(targetFrom('<div class="oom-segmented"><button>Settings</button></div>')))
      .toBe("settings");
    expect(resolveOutOfMatchSound(targetFrom('<div class="account-vault__mode-switch"><button>Campaign</button></div>')))
      .toBe("settings");
  });

  it("reads panel state and closure language", () => {
    expect(resolveOutOfMatchSound(targetFrom('<button aria-haspopup="dialog" aria-expanded="false">Friends</button>')))
      .toBe("open");
    expect(resolveOutOfMatchSound(targetFrom('<button aria-haspopup="menu" aria-expanded="true">Account</button>')))
      .toBe("close");
    expect(resolveOutOfMatchSound(targetFrom('<button role="menuitem">Sign out</button>')))
      .toBe("close");
  });

  it("stays silent for disabled and explicitly silent controls", () => {
    expect(resolveOutOfMatchSound(targetFrom("<button disabled>Unavailable</button>"))).toBeNull();
    expect(resolveOutOfMatchSound(targetFrom('<button data-oom-sound="none">Silent</button>'))).toBeNull();
  });
});
