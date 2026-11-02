export type SearchKind = "artwork" | "asset" | "creator";
type RecordItem = Record<string, any>;
export type SearchEntry = {
  id: string;
  kind: SearchKind;
  title: string;
  subtitle: string;
  image?: string;
  video?: boolean;
  createdAt: number;
  price?: number;
  currency?: string;
  primary: string;
  secondary: string;
  source: RecordItem;
};
export const normalizeSearch = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[@#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
export function buildSearchIndex(
  users: RecordItem[],
  posts: RecordItem[],
  products: RecordItem[],
  mediaTypes: Record<string, string> = {},
): SearchEntry[] {
  const people = new Map(users.map((u) => [u.id, u]));
  const entries: SearchEntry[] = [];
  for (const u of users) {
    if (u.disabled) continue;
    entries.push({
      id: u.id,
      kind: "creator",
      title: u.name || u.username || "Creator",
      subtitle: `@${u.username || "creator"}${u.discipline ? " · " + u.discipline : ""}`,
      image: u.avatar,
      createdAt: u.createdAt || 0,
      primary: normalizeSearch(`${u.name || ""} ${u.username || ""}`),
      secondary: normalizeSearch(`${u.discipline || ""} ${u.bio || ""}`),
      source: u,
    });
  }
  for (const [kind, items] of [
    ["artwork", posts],
    ["asset", products],
  ] as const)
    for (const p of items) {
      if (kind === "asset" && p.status !== "published") continue;
      const author = people.get(p.userId);
      entries.push({
        id: p.id,
        kind,
        title: p.title || "Untitled",
        subtitle: author?.name || "Creator",
        image: p.image,
        video:
          mediaTypes[p.image]?.startsWith("video/") ||
          p.mediaType === "video" ||
          p.type === "video",
        createdAt: p.createdAt || 0,
        price: kind === "asset" ? p.price : undefined,
        currency: p.currency || "USD",
        primary: normalizeSearch(p.title || ""),
        secondary: normalizeSearch(
          [
            p.caption,
            p.description,
            p.category,
            p.format,
            ...(p.tags || []),
            author?.name,
            author?.username,
          ]
            .filter(Boolean)
            .join(" "),
        ),
        source: p,
      });
    }
  return entries;
}
export function searchEntries(
  entries: SearchEntry[],
  query: string,
  kind: SearchKind | "all" = "all",
  sort: "relevance" | "newest" = "relevance",
) {
  const q = normalizeSearch(query),
    words = q.split(" ").filter(Boolean);
  if (!q) return [];
  return entries
    .filter((e) => kind === "all" || e.kind === kind)
    .map((entry) => {
      const text = entry.primary + " " + entry.secondary;
      if (!words.every((word) => text.includes(word)))
        return { entry, score: 0 };
      const score =
        1 +
        (entry.primary === q
          ? 100
          : entry.primary.startsWith(q)
            ? 50
            : entry.primary.includes(q)
              ? 25
              : 0) +
        words.filter((w) => entry.primary.includes(w)).length * 5;
      return { entry, score };
    })
    .filter((r) => r.score > 0)
    .sort(
      (a, b) =>
        (sort === "relevance" ? b.score - a.score : 0) ||
        b.entry.createdAt - a.entry.createdAt ||
        a.entry.id.localeCompare(b.entry.id),
    )
    .map((r) => r.entry);
}
