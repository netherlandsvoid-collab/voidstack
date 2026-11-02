"use client";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  X,
  ArrowUpRight,
  Image as ImageIcon,
  UserRound,
  ShoppingBag,
} from "lucide-react";
import {
  buildSearchIndex,
  searchEntries,
  type SearchEntry,
  type SearchKind,
} from "@/lib/search";
import { money } from "@/lib/payment-methods";
const filters = [
  { id: "all", label: "Everything" },
  { id: "artwork", label: "Artwork" },
  { id: "asset", label: "Assets" },
  { id: "creator", label: "Creators" },
] as const;
export default function SearchExperience({
  users,
  posts,
  products,
  mediaTypes,
  loading,
  onClose,
  onSelect,
}: {
  users: Record<string, any>[];
  posts: Record<string, any>[];
  products: Record<string, any>[];
  mediaTypes: Record<string, string>;
  loading: boolean;
  onClose: () => void;
  onSelect: (entry: SearchEntry) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(""),
    [kind, setKind] = useState<SearchKind | "all">("all"),
    [sort, setSort] = useState<"relevance" | "newest">("relevance"),
    [limit, setLimit] = useState(24);
  const deferred = useDeferredValue(query);
  const index = useMemo(
    () => buildSearchIndex(users, posts, products, mediaTypes),
    [users, posts, products, mediaTypes],
  );
  const all = useMemo(
    () => searchEntries(index, deferred, "all", sort),
    [index, deferred, sort],
  );
  const results = kind === "all" ? all : all.filter((e) => e.kind === kind);
  const waiting = query !== deferred;
  useEffect(() => {
    const panel = dialog.current!;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    panel.showModal();
    input.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      panel.close();
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);
  function change(value: string) {
    setQuery(value);
    setLimit(24);
  }
  function select(entry: SearchEntry) {
    dialog.current?.close();
    onClose();
    onSelect(entry);
  }
  return (
    <dialog
      ref={dialog}
      className="nx-search-dialog"
      aria-labelledby="nx-search-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const r = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <div className="nx-search-heading">
        <div>
          <span className="eyebrow">THE NEXT GREAT FIND</span>
          <h2 id="nx-search-title">
            Explore Nexirel<span>.</span>
          </h2>
        </div>
        <button
          className="icon-button"
          aria-label="Close search"
          onClick={onClose}
        >
          <X size={22} />
        </button>
      </div>
      <form
        className="nx-search-field"
        onSubmit={(e) => {
          e.preventDefault();
          input.current?.blur();
        }}
        role="search"
      >
        <Search size={22} />
        <input
          ref={input}
          aria-label="Search artwork, assets and creators"
          placeholder="Try ‘3D’, ‘logo’ or a creator’s name"
          value={query}
          maxLength={200}
          onChange={(e) => change(e.target.value)}
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              change("");
              input.current?.focus();
            }}
          >
            <X size={18} />
          </button>
        )}
      </form>
      <div className="nx-search-controls">
        <div className="nx-search-tabs" aria-label="Result type">
          {filters.map((f) => (
            <button
              key={f.id}
              aria-pressed={kind === f.id}
              className={kind === f.id ? "active" : ""}
              onClick={() => {
                setKind(f.id);
                setLimit(24);
              }}
            >
              {f.label}
              {deferred.trim() && (
                <span>
                  {f.id === "all"
                    ? all.length
                    : all.filter((e) => e.kind === f.id).length}
                </span>
              )}
            </button>
          ))}
        </div>
        <label className="nx-search-sort">
          <span className="sr-only">Sort results</span>
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as typeof sort);
              setLimit(24);
            }}
          >
            <option value="relevance">Most relevant</option>
            <option value="newest">Newest first</option>
          </select>
        </label>
      </div>
      <div className="nx-search-body" aria-busy={waiting || loading}>
        {!query.trim() ? (
          <div className="nx-search-start">
            <span className="nx-search-symbol">
              <Search size={32} />
            </span>
            <h3>A new idea starts here.</h3>
            <p>
              Find work that inspires you, assets for your next project, and the
              people behind them.
            </p>
            <div className="nx-search-suggestions">
              {[
                "Motion",
                "3D",
                "Typography",
                "Logo",
                "Photography",
                "Templates",
              ].map((term) => (
                <button
                  key={term}
                  onClick={() => {
                    change(term);
                    input.current?.focus();
                  }}
                >
                  {term}
                  <ArrowUpRight size={14} />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="nx-search-summary" role="status">
              {loading
                ? "Loading the collection…"
                : waiting
                  ? "Searching…"
                  : `${results.length} ${results.length === 1 ? "result" : "results"} for “${deferred.trim()}”`}
            </div>
            {results.length ? (
              <>
                <div className="nx-search-grid">
                  {results.slice(0, limit).map((entry) => (
                    <button
                      className={`nx-search-card ${entry.kind}`}
                      key={entry.kind + entry.id}
                      onClick={() => select(entry)}
                    >
                      <div className="nx-search-art">
                        {entry.image && !entry.video ? (
                          <img src={entry.image} alt="" loading="lazy" />
                        ) : entry.kind === "creator" ? (
                          <UserRound size={30} />
                        ) : entry.kind === "asset" ? (
                          <ShoppingBag size={30} />
                        ) : (
                          <ImageIcon size={30} />
                        )}
                        <span className="nx-search-type">
                          {entry.kind === "asset"
                            ? "Digital asset"
                            : entry.kind === "creator"
                              ? "Creator"
                              : entry.video
                                ? "Video"
                                : "Artwork"}
                        </span>
                      </div>
                      <div className="nx-search-card-copy">
                        <h3>{entry.title}</h3>
                        <p>{entry.subtitle}</p>
                        <div>
                          {entry.kind === "asset" ? (
                            <strong>
                              {entry.price === 0
                                ? "Free"
                                : money(entry.price || 0, entry.currency)}
                            </strong>
                          ) : (
                            <span>
                              {entry.kind === "creator"
                                ? "View profile"
                                : "View artwork"}
                            </span>
                          )}
                          <ArrowUpRight size={17} />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                {results.length > limit && (
                  <button
                    className="button nx-search-more"
                    onClick={() => setLimit((l) => l + 24)}
                  >
                    Show more results
                  </button>
                )}
              </>
            ) : !loading && !waiting ? (
              <div className="nx-search-empty">
                <Search size={30} />
                <h3>No matches this time.</h3>
                <p>
                  Try a shorter phrase, a creator’s username, or a different
                  result type.
                </p>
                {kind !== "all" && all.length > 0 && (
                  <button className="button" onClick={() => setKind("all")}>
                    See all {all.length} matches
                  </button>
                )}
              </div>
            ) : null}
          </>
        )}
      </div>
      <footer className="nx-search-footer">
        Made to be discovered.<span>Esc to close</span>
      </footer>
    </dialog>
  );
}
