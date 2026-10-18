"use client";

import { useId, useState } from "react";
import type { Period } from "enflasyon-core";
import type { BasketState } from "@/lib/basket-url";
import { track } from "@/lib/analytics";
import { ogImagePath, shareUrl } from "@/lib/share";

interface ShareActionsProps {
  readonly state: BasketState;
  readonly lastPeriod: Period;
}

const buttonClass =
  "min-h-11 rounded-md bg-[var(--color-surface)] px-3.5 text-sm font-medium transition-colors hover:bg-[var(--color-line)] disabled:opacity-50";
const primaryClass =
  "min-h-11 rounded-md bg-[var(--color-accent)] px-3.5 text-sm font-medium text-[var(--color-accent-ink)] transition-opacity hover:opacity-90";

/**
 * Paylaşım (docs/web.md, Bölüm 2.2 adım 3 ve 7): linki kopyala, sistem paylaşımı,
 * story kartı. Gizlilik varsayılandır: TL tutarları yalnızca kullanıcı açıkça
 * işaretlerse linke (fragment'e) eklenir; önizleme görseli hiçbir zaman tutar içermez.
 */
export function ShareActions({ state, lastPeriod }: ShareActionsProps) {
  const checkboxId = useId();
  const [includeAmounts, setIncludeAmounts] = useState(false);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const canIncludeAmounts = state.mode === "tl";
  const options = { includeAmounts: canIncludeAmounts && includeAmounts };
  const url = () => shareUrl(state, window.location.origin, lastPeriod, options);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url());
      setStatus("Link kopyalandı.");
      track({ name: "link-kopyalandi" });
    } catch {
      setStatus("Link kopyalanamadı; adres çubuğundan kopyalayabilirsin.");
    }
  };

  const share = async () => {
    if (typeof navigator.share !== "function") {
      await copy();
      return;
    }
    try {
      await navigator.share({ title: "Benim enflasyonum", url: url() });
      track({ name: "paylasildi" });
    } catch {
      // Kullanıcı paylaşım penceresini kapattı; bir şey yapmaya gerek yok.
    }
  };

  const story = async () => {
    setBusy(true);
    setStatus("Story kartı hazırlanıyor…");
    try {
      const response = await fetch(ogImagePath(state, lastPeriod, "story"));
      if (!response.ok) throw new Error(String(response.status));
      const file = new File([await response.blob()], "benim-enflasyonum.png", {
        type: "image/png",
      });
      if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "Benim enflasyonum" });
        setStatus("");
        track({ name: "story-indirildi" });
      } else {
        const href = URL.createObjectURL(file);
        const anchor = document.createElement("a");
        anchor.href = href;
        anchor.download = file.name;
        anchor.click();
        URL.revokeObjectURL(href);
        setStatus("Story kartı indirildi.");
        track({ name: "story-indirildi" });
      }
    } catch {
      setStatus("Story kartı hazırlanamadı. Tekrar dene.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-6 space-y-3 border-t border-[var(--color-line)] pt-5">
      <h3 className="text-sm font-medium">Sonucunu paylaş</h3>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => void copy()} className={buttonClass}>
          Linki kopyala
        </button>
        <button type="button" onClick={() => void share()} className={primaryClass}>
          Paylaş
        </button>
        <button type="button" onClick={() => void story()} disabled={busy} className={buttonClass}>
          Story olarak indir
        </button>
      </div>
      {canIncludeAmounts && (
        <div className="flex items-start gap-2 text-sm">
          <input
            id={checkboxId}
            type="checkbox"
            checked={includeAmounts}
            onChange={(event) => {
              setIncludeAmounts(event.target.checked);
            }}
            className="mt-1 size-4 accent-[var(--color-accent)]"
          />
          <label htmlFor={checkboxId}>TL tutarlarımı da linke ekle</label>
        </div>
      )}
      <p className="text-sm text-[var(--color-muted)]">
        {options.includeAmounts
          ? "Link girdiğin tutarları içerir; tutarlar linkin # sonrasında durur, sunucuya gitmez ve yalnızca linki açan görür."
          : "Link yalnızca harcamalarının yüzde dağılımını içerir; tutarların paylaşılmaz. Önizleme görselinde hiçbir zaman tutar yer almaz."}
      </p>
      <p role="status" className="text-sm">
        {status}
      </p>
    </div>
  );
}
