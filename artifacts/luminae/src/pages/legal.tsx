import { useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { ArrowLeft, ExternalLink, Trash2 } from "lucide-react";
import { LuminaeWordmark, OutOfMatchBackdrop, OutOfMatchHeader } from "@/components/out-of-match/OutOfMatchChrome";
import { useAccount } from "@/contexts/AccountContext";
import { apiRequestAccountDeletion } from "@/lib/accountSession";

const operator = import.meta.env.VITE_LUMINAE_OPERATOR_NAME ?? "Luminae";
const supportEmail = import.meta.env.VITE_LUMINAE_SUPPORT_EMAIL ?? "support contact available in the store listing";

const sections = {
  privacy: {
    title: "Privacy Policy",
    blocks: [
      ["Information we collect", "Account identifiers, optional email, authentication records, game and campaign progress, purchases and Lume transactions, moderation reports, and limited operational events such as crashes, reconnects, and frame loss."],
      ["How we use it", "We use this information to operate accounts and multiplayer games, preserve progress, verify purchases, prevent abuse, provide support, and understand service reliability. Luminae does not create advertising profiles and does not collect precise location, contacts, camera, microphone, or Android advertising identifiers."],
      ["Sharing", "Information is shared only with service providers needed to operate Luminae, including hosting, transactional email, Google Fonts when loaded from its network, and the Google Play or Samsung Galaxy storefront used for a purchase. We do not sell personal information."],
      ["Retention and deletion", "Gameplay and account records remain while the account is active. A confirmed deletion request revokes sessions immediately and is completed after a seven-day safety period. Signing in again during that period cancels the request. Storefronts may retain their own transaction records under their policies and legal obligations."],
      ["Age", "Luminae is intended for players age 13 and older and is not directed to children under 13."],
      ["Contact", `Privacy and support requests may be sent to ${supportEmail}. The service operator is ${operator}.`],
    ],
  },
  terms: {
    title: "Terms of Service",
    blocks: [
      ["Early access", "Luminae is an evolving early-access game. Features, balance, availability, and saved-state compatibility may change, but we will not intentionally rewrite earned purchase history."],
      ["Account and license", "You are responsible for your account credentials. We grant a personal, revocable, non-transferable license to use Luminae for lawful play. Automated abuse, exploitation, reverse engineering of private services, and interference with other players are prohibited."],
      ["Virtual currency", "Lume is a limited, revocable in-game entitlement with no cash value. It cannot be transferred or redeemed for money. Purchased, earned, and granted Lume share one spendable balance while their sources remain separately recorded."],
      ["Community", "Private-room chat is subject to the Conduct Policy. We may restrict accounts or content to protect players, service integrity, or legal compliance."],
      ["Availability", "Online services may be interrupted for maintenance, security, or circumstances outside our control. To the extent allowed by law, the service is provided without a guarantee of uninterrupted availability."],
      ["Contact", `Questions about these terms may be sent to ${supportEmail}.`],
    ],
  },
  conduct: {
    title: "Conduct Policy",
    blocks: [
      ["Respect private rooms", "Free-text chat is available only to signed-in participants in invitation-based rooms. Do not harass, threaten, demean, impersonate, or target another player."],
      ["Protect privacy", "Do not share personal contact information, solicit it from others, or expose another person's identity. Links and contact details may be removed automatically."],
      ["Keep play fair", "Do not exploit defects, automate play, manipulate purchases, evade enforcement, or intentionally disrupt a room or service."],
      ["Controls and enforcement", "Players can mute, block, and report. Reports preserve the relevant message for review. Filtering, rate limits, warnings, room restrictions, suspension, or account closure may be used proportionately."],
      ["Contact", `Urgent safety concerns may be sent to ${supportEmail}.`],
    ],
  },
  refunds: {
    title: "Purchases And Refunds",
    blocks: [
      ["Native purchases", "Android Lume packs are sold by Google Play or Samsung Galaxy Store at the localized price shown before confirmation. Web and Mac builds do not currently sell real-money packs."],
      ["Verification", "The store must confirm a purchase before Lume is credited. Pending, cancelled, duplicate, or unverifiable transactions do not grant Lume."],
      ["Refunds", "Request refunds through the storefront that processed the payment. Confirmed refunds create a matching negative Lume adjustment. If the spendable balance is insufficient, it may become negative and further spending remains unavailable until restored."],
      ["Support", `For a missing verified purchase, include the storefront and order reference in a message to ${supportEmail}. Never send a password or full payment credential.`],
    ],
  },
} as const;

function DeletionPage() {
  const [, setLocation] = useLocation();
  const { account, token, logout } = useAccount();
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestDeletion = async () => {
    if (!token || !password) return;
    setPending(true);
    setError(null);
    try {
      await apiRequestAccountDeletion(token, password);
      await logout();
      setLocation("/");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not request deletion");
      setPending(false);
    }
  };

  return (
    <section className="oom-panel mx-auto max-w-xl p-5 sm:p-7">
      <h1 className="font-serif text-2xl font-bold">Delete Luminae Account</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        This removes the account, match and campaign history, unlocked content, social relationships, and in-service purchase records after a seven-day safety period. Active sessions are revoked immediately. Signing in again during that period cancels deletion.
      </p>
      {!account || !token ? (
        <div className="mt-5 rounded-md border border-border/45 bg-black/20 p-4 text-sm text-muted-foreground">
          Sign in from the main menu, then return to this page to confirm deletion. This public page is also the external deletion resource for Luminae.
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          <p className="text-sm">Deleting <strong>{account.username}</strong></p>
          <label className="block text-xs font-semibold text-muted-foreground" htmlFor="delete-password">Confirm your password</label>
          <input id="delete-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-11 w-full rounded-md border border-border/50 bg-input/60 px-3" autoComplete="current-password" />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button type="button" onClick={() => void requestDeletion()} disabled={!password || pending} className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-destructive px-4 font-semibold text-destructive-foreground disabled:opacity-40">
            <Trash2 className="h-4 w-4" /> {pending ? "Scheduling deletion..." : "Delete my account"}
          </button>
        </div>
      )}
    </section>
  );
}

export default function LegalPage() {
  const { section = "privacy" } = useParams<{ section: string }>();
  const page = sections[section as keyof typeof sections];
  return (
    <div className="oom-shell min-h-[100dvh]">
      <OutOfMatchBackdrop />
      <OutOfMatchHeader left={<Link href="/"><LuminaeWordmark /></Link>} right={<Link href="/" className="oom-icon-button" aria-label="Back to Luminae"><ArrowLeft className="h-4 w-4" /></Link>} />
      <main className="oom-frame relative z-10 py-6 sm:py-10">
        {section === "delete-account" ? <DeletionPage /> : page ? (
          <article className="oom-panel mx-auto max-w-3xl p-5 sm:p-8">
            <p className="oom-kicker">Effective August 23, 2026</p>
            <h1 className="mt-2 font-serif text-3xl font-bold">{page.title}</h1>
            <div className="mt-7 space-y-6">
              {page.blocks.map(([heading, body]) => <section key={heading}><h2 className="text-sm font-bold uppercase text-primary">{heading}</h2><p className="mt-2 text-sm leading-7 text-muted-foreground">{body}</p></section>)}
            </div>
          </article>
        ) : null}
        <nav className="mx-auto mt-5 flex max-w-3xl flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <Link href="/legal/privacy">Privacy</Link><Link href="/legal/terms">Terms</Link><Link href="/legal/conduct">Conduct</Link><Link href="/legal/refunds">Refunds</Link><Link href="/legal/delete-account" className="inline-flex items-center gap-1">Account deletion <ExternalLink className="h-3 w-3" /></Link>
        </nav>
      </main>
    </div>
  );
}
