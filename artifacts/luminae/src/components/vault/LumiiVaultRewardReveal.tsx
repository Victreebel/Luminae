import { Loader2, Sparkles } from "lucide-react";
import { AntimatterBlueprintCard } from "@/components/blueprints/AntimatterBlueprintCard";

export function LumiiVaultRewardReveal({
  pending,
  error,
  onEnterVault,
}: {
  pending: boolean;
  error: string | null;
  onEnterVault: () => void;
}) {
  return (
    <>
      <span>BLUEPRINT // 01 RECOVERED</span>
      <h2>Antimatter Detonator</h2>
      <AntimatterBlueprintCard
        state="manifested"
        presentation="card"
        matchedSockets={4}
        covenantBroken
      />
      {error && <p className="lumii-vault-encounter__error">{error}</p>}
      <button type="button" onClick={onEnterVault} disabled={pending}>
        {pending ? <Loader2 className="lumii-vault-encounter__spinner" aria-label="Opening Vault" /> : <Sparkles aria-hidden="true" />}
        Enter Vault
      </button>
    </>
  );
}
