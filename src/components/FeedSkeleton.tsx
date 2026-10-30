export default function FeedSkeleton() {
  return (
    <div
      className="feed-skeleton"
      role="status"
      aria-label="Loading your creative feed"
    >
      <span className="sr-only">Loading your creative feed…</span>
      <div className="skeleton-feature" aria-hidden="true">
        <div className="skeleton-art" />
        <div className="skeleton-copy">
          <div className="skeleton-author" />
          <div className="skeleton-line" />
          <div className="skeleton-line short" />
          <div className="skeleton-line" />
          <div className="skeleton-line short" />
        </div>
      </div>
      <div className="skeleton-row" aria-hidden="true">
        {[1, 2].map((i) => (
          <div className="skeleton-card" key={i}>
            <div className="skeleton-art" />
            <div className="skeleton-line" />
            <div className="skeleton-line short" />
          </div>
        ))}
      </div>
    </div>
  );
}
