export default function FeedSkeleton() {
  return (
    <div
      className="feed-skeleton signal-skeleton"
      role="status"
      aria-label="Loading your creative feed"
    >
      <span className="sr-only">Loading your creative feed…</span>
      {[1, 2, 3, 4].map((i) => (
        <div className="skeleton-card" key={i} aria-hidden="true">
          <div className="skeleton-author" />
          <div className="skeleton-art" />
          <div className="skeleton-line short" />
        </div>
      ))}
    </div>
  );
}
