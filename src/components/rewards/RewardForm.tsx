import { ImagePlus, WifiOff } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import type { RewardDraft, RewardRevisionView } from "@/components/sync/model";

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function validateProductUrl(value: string): string | null {
  if (!value.trim()) return null;
  if (
    [...value].some((character) => character.charCodeAt(0) <= 31 || character.charCodeAt(0) === 127)
  ) {
    return "Product links cannot contain control characters.";
  }
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:")
      return "Use a safe http or https product link.";
    if (url.username || url.password) return "Product links cannot include usernames or passwords.";
    const host = url.hostname.toLowerCase();
    const ipv4 = host
      .match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
      ?.slice(1)
      .map(Number);
    const privateIpv4 =
      ipv4 &&
      (ipv4[0] === 10 ||
        ipv4[0] === 127 ||
        (ipv4[0] === 169 && ipv4[1] === 254) ||
        (ipv4[0] === 172 && (ipv4[1] ?? 0) >= 16 && (ipv4[1] ?? 0) <= 31) ||
        (ipv4[0] === 192 && ipv4[1] === 168));
    const normalizedIpv6 = host.replace(/^\[/, "").replace(/\]$/, "");
    const privateIpv6 = /^(?:fc|fd|fe[89ab])/i.test(normalizedIpv6);
    if (host === "localhost" || normalizedIpv6 === "::1" || privateIpv4 || privateIpv6)
      return "That product link is not allowed.";
    return null;
  } catch {
    return "Enter a complete http or https product link.";
  }
}

export function RewardForm({
  initial,
  offline,
  onSubmit,
  onCancel,
}: {
  initial?: RewardRevisionView;
  offline: boolean;
  onSubmit: (draft: RewardDraft) => Promise<void>;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [productUrl, setProductUrl] = useState(initial?.productUrl ?? "");
  const [price, setPrice] = useState(
    initial?.estimatedPriceCents === undefined
      ? ""
      : (initial.estimatedPriceCents / 100).toFixed(2),
  );
  const [image, setImage] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(initial?.name ?? "");
    setProductUrl(initial?.productUrl ?? "");
    setPrice(
      initial?.estimatedPriceCents === undefined
        ? ""
        : (initial.estimatedPriceCents / 100).toFixed(2),
    );
    setImage(null);
  }, [initial]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const urlError = validateProductUrl(productUrl);
    if (urlError) return setError(urlError);
    const dollars = price.trim() ? Number(price) : undefined;
    if (dollars !== undefined && (!Number.isFinite(dollars) || dollars < 0 || dollars > 100_000)) {
      return setError("Enter a valid estimated price.");
    }
    if (image && (!allowedImageTypes.has(image.type) || image.size > 5 * 1024 * 1024)) {
      return setError("Choose a JPEG, PNG, or WebP image no larger than 5 MB.");
    }
    if (image && "createImageBitmap" in window) {
      try {
        const bitmap = await createImageBitmap(image);
        const oversized = bitmap.width > 4096 || bitmap.height > 4096;
        bitmap.close();
        if (oversized) return setError("Choose an image no larger than 4096 by 4096 pixels.");
      } catch {
        return setError(
          "That image could not be safely decoded. Choose a different JPEG, PNG, or WebP file.",
        );
      }
    }

    const draft: RewardDraft = { name: name.trim() };
    if (productUrl.trim()) draft.productUrl = productUrl.trim();
    if (dollars !== undefined) draft.estimatedPriceCents = Math.round(dollars * 100);
    if (image) draft.image = image;

    setBusy(true);
    try {
      await onSubmit(draft);
      if (!initial) {
        setName("");
        setProductUrl("");
        setPrice("");
        setImage(null);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The reward could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-border p-4">
      <h3 className="font-extrabold">
        {initial ? `Propose changes to ${initial.name}` : "Propose a reward"}
      </h3>
      {initial?.status === "approved" && (
        <p className="text-xs text-muted-foreground">
          Your approved reward stays unchanged until a parent accepts this revision.
        </p>
      )}
      <label className="block text-sm font-bold">
        Reward name
        <input
          required
          maxLength={120}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="mt-1 min-h-[48px] w-full rounded-xl bg-secondary/40 px-3 outline-none focus:ring-1 focus:ring-primary"
        />
      </label>
      <label className="block text-sm font-bold">
        Product link <span className="font-normal text-muted-foreground">(optional)</span>
        <input
          type="url"
          inputMode="url"
          placeholder="https://…"
          value={productUrl}
          onChange={(event) => setProductUrl(event.target.value)}
          className="mt-1 min-h-[48px] w-full rounded-xl bg-secondary/40 px-3 outline-none focus:ring-1 focus:ring-primary"
        />
      </label>
      <label className="block text-sm font-bold">
        Estimated price <span className="font-normal text-muted-foreground">(optional)</span>
        <div className="relative mt-1">
          <span className="absolute left-3 top-3 text-muted-foreground">$</span>
          <input
            inputMode="decimal"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            className="min-h-[48px] w-full rounded-xl bg-secondary/40 pl-8 pr-3 outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </label>
      <label className="flex min-h-[48px] cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border px-3 text-sm font-bold">
        <ImagePlus aria-hidden className="h-5 w-5" />
        <span className="min-w-0 truncate">
          {image?.name ?? "Add JPEG, PNG, or WebP photo (optional)"}
        </span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(event) => setImage(event.target.files?.[0] ?? null)}
        />
      </label>
      {offline && image && (
        <p className="flex items-center gap-2 text-xs font-bold text-amber-800">
          <WifiOff aria-hidden className="h-4 w-4" /> Text saves now; the photo waits safely on this
          device for a connection.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        You can suggest a price, but only a parent sets the XP cost. No purchase is made
        automatically.
      </p>
      {error && (
        <p role="alert" className="text-sm font-bold text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-border px-4 py-2 font-bold"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="rounded-full bg-primary px-5 py-2 font-extrabold text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Saving…" : initial ? "Send revision for approval" : "Send for approval"}
        </button>
      </div>
    </form>
  );
}
