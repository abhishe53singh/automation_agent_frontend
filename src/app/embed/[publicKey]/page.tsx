import { EmbedChat } from "./_components/EmbedChat";

/**
 * `/embed/{publicKey}` — the page `public/embed.js` loads in its iframe.
 * `?origin=` is the embedding site's origin, passed by the loader as a
 * fallback for browsers that expose neither `ancestorOrigins` nor a referrer.
 */
export default async function EmbedPage({
  params,
  searchParams,
}: {
  params: Promise<{ publicKey: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { publicKey } = await params;
  const { origin } = await searchParams;
  return (
    <EmbedChat publicKey={publicKey} originHint={typeof origin === "string" ? origin : undefined} />
  );
}
