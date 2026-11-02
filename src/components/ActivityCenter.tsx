"use client";
import { useState } from "react";
import { Bell, CheckCheck, ChevronRight } from "lucide-react";
type Notice = {
  id: string;
  actorId: string;
  text: string;
  target: string;
  read: boolean;
  createdAt: number;
};
type Person = { id: string; name: string; avatar?: string };
export default function ActivityCenter({
  notifications,
  users,
  onRead,
  onOpen,
}: {
  notifications: Notice[];
  users: Person[];
  onRead: (ids: string[]) => Promise<void>;
  onOpen: (notice: Notice) => void;
}) {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const unread = notifications.filter((n) => !n.read);
  const visible = [...(unreadOnly ? unread : notifications)].sort(
    (a, b) => b.createdAt - a.createdAt,
  );
  const people = new Map(users.map((person) => [person.id, person]));
  return (
    <section aria-label="Recent activity">
      <div className="page-heading activity-heading">
        <div>
          <div className="eyebrow">YOUR CREATIVE CIRCLE</div>
          <h1>Recent activity.</h1>
          <p role="status">
            {unread.length
              ? `${unread.length} unread ${unread.length === 1 ? "interaction" : "interactions"}. See who’s connecting with your work.`
              : "You’re all caught up. Your latest interactions live here."}
          </p>
        </div>
        <button
          type="button"
          className="button secondary"
          disabled={busy || !unread.length}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await onRead(unread.map((n) => n.id));
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <CheckCheck size={17} />
          {busy ? "Updating…" : "Mark all as read"}
        </button>
      </div>
      <div
        className="activity-filters"
        role="group"
        aria-label="Filter activity"
      >
        <button
          type="button"
          aria-pressed={!unreadOnly}
          onClick={() => setUnreadOnly(false)}
        >
          All activity
        </button>
        <button
          type="button"
          aria-pressed={unreadOnly}
          onClick={() => setUnreadOnly(true)}
        >
          Unread ({unread.length})
        </button>
      </div>
      {error && (
        <p className="error-box" role="alert">
          {error}
        </p>
      )}
      {visible.length ? (
        <div className="notifications-list">
          {visible.map((n) => {
            const person = people.get(n.actorId);
            return (
              <button
                type="button"
                key={n.id}
                className={n.read ? "" : "activity-unread"}
                onClick={() => onOpen(n)}
              >
                {person?.avatar ? (
                  <img
                    className="avatar activity-avatar"
                    src={person.avatar}
                    alt=""
                    loading="lazy"
                  />
                ) : (
                  <span
                    className="avatar initials activity-avatar"
                    aria-hidden="true"
                  >
                    {person?.name?.[0] || "N"}
                  </span>
                )}
                <span>
                  <strong>{person?.name || "A creator"}</strong> {n.text}
                  <small>
                    <time dateTime={new Date(n.createdAt).toISOString()}>
                      {new Date(n.createdAt).toLocaleString()}
                    </time>
                    {!n.read && " · Unread"}
                  </small>
                </span>
                {!n.read && (
                  <i className="activity-unread-dot" aria-hidden="true" />
                )}
                <ChevronRight size={17} />
              </button>
            );
          })}
        </div>
      ) : (
        <div className="activity-empty">
          <Bell size={30} />
          <h2>
            {unreadOnly
              ? "All caught up."
              : "Your next connection starts here."}
          </h2>
          <p>
            {unreadOnly
              ? "You have no unread notifications."
              : "New followers, likes, and comments will appear here—even when they happened while you were away."}
          </p>
        </div>
      )}
    </section>
  );
}
