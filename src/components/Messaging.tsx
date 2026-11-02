"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  CheckCheck,
  ImagePlus,
  Loader2,
  MessageCircle,
  Plus,
  Search,
  Send,
  X,
  ArrowDown,
} from "lucide-react";
import {
  conversationList,
  conversationMessages,
  type ChatMessage,
  type ChatPerson,
} from "@/lib/conversations";
type Draft = { text: string; image: string };
const blank: Draft = { text: "", image: "" };
const clock = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
function Face({ person }: { person?: ChatPerson }) {
  return person?.avatar ? (
    <img className="nx-chat-avatar" src={person.avatar} alt="" />
  ) : (
    <span className="nx-chat-avatar nx-chat-initial">
      {person?.name?.[0] || "?"}
    </span>
  );
}
export default function Messaging({
  me,
  users,
  messages,
  chat,
  onChat,
  onProfile,
  onNew,
  api,
  onRefresh,
  onSent,
}: {
  me: string;
  users: ChatPerson[];
  messages: ChatMessage[];
  chat: string;
  onChat: (id: string) => void;
  onProfile: (id: string) => void;
  onNew: () => void;
  api: (action: string, body: Record<string, any>) => Promise<any>;
  onRefresh: () => Promise<void>;
  onSent: (message: ChatMessage) => void;
}) {
  const [query, setQuery] = useState("");
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [newBelow, setNewBelow] = useState(false);
  const [viewport, setViewport] = useState<number>();
  const stream = useRef<HTMLDivElement>(null);
  const previousChat = useRef("");
  const activeChat = useRef(chat);
  activeChat.current = chat;
  const nearBottom = useRef(true);
  const forceBottom = useRef(false);
  const pending = useRef(false);
  const callbacks = useRef({ api, onRefresh });
  callbacks.current = { api, onRefresh };
  const current = users.find((p) => p.id === chat);
  const thread = conversationMessages(messages, me, chat);
  const rows = conversationList(messages, users, me, chat).filter(
    ({ person }) =>
      `${person.name} ${person.username || ""}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const draft = drafts[chat] || blank;
  const unreadKey = thread
    .filter((m) => m.to === me && !m.read)
    .map((m) => m.id)
    .join(",");
  const lastId = thread.at(-1)?.id;
  const updateDraft = (id: string, patch: Partial<Draft>) =>
    setDrafts((previous) => ({
      ...previous,
      [id]: { ...(previous[id] || blank), ...patch },
    }));
  useEffect(() => {
    const resize = () => setViewport(window.visualViewport?.height);
    resize();
    window.visualViewport?.addEventListener("resize", resize);
    return () => window.visualViewport?.removeEventListener("resize", resize);
  }, []);
  useEffect(() => {
    setError("");
  }, [chat]);
  useEffect(() => {
    const panel = stream.current;
    if (!panel) return;
    const switched = previousChat.current !== chat;
    if (switched || nearBottom.current || forceBottom.current) {
      panel.scrollTop = panel.scrollHeight;
      setNewBelow(false);
      nearBottom.current = true;
    } else setNewBelow(true);
    previousChat.current = chat;
    forceBottom.current = false;
  }, [chat, lastId]);
  useEffect(() => {
    if (!chat || !unreadKey) return;
    void callbacks.current
      .api("read", { from: chat })
      .then(() => callbacks.current.onRefresh())
      .catch(() => {});
  }, [chat, unreadKey]);
  async function send() {
    if (pending.current || (!draft.text.trim() && !draft.image)) return;
    const recipient = chat,
      snapshot = draft;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const sent = await api("message", {
        to: recipient,
        text: snapshot.text,
        image: snapshot.image,
      });
      setDrafts((previous) => ({
        ...previous,
        [recipient]:
          previous[recipient] === snapshot
            ? blank
            : previous[recipient] || blank,
      }));
      // Only scroll the sending conversation, never a different conversation opened in flight.
      forceBottom.current = activeChat.current === recipient;
      onSent(sent);
      await onRefresh();
    } catch (e) {
      setError(`${(e as Error).message} Your draft is kept. Try again.`);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <div
      className={`nx-messenger ${chat ? "nx-chat-active" : ""}`}
      style={
        {
          "--chat-viewport": viewport ? `${viewport}px` : "100dvh",
        } as CSSProperties
      }
    >
      <aside className="nx-inbox" aria-label="Conversations">
        <div className="nx-inbox-heading">
          <div>
            <span className="eyebrow">YOUR INBOX</span>
            <h2>
              Messages<span>.</span>
            </h2>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="New conversation"
            onClick={onNew}
          >
            <Plus size={20} />
          </button>
        </div>
        <label className="nx-chat-search">
          <Search size={17} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a conversation"
            aria-label="Search conversations"
          />
        </label>
        <div className="nx-conversation-scroll">
          {rows.length ? (
            rows.map(({ person, last, unread }) => (
              <button
                type="button"
                key={person.id}
                className={`nx-conversation ${chat === person.id ? "selected" : ""}`}
                aria-current={chat === person.id ? "true" : undefined}
                onClick={() => onChat(person.id)}
              >
                <Face person={person} />
                <span className="nx-conversation-copy">
                  <strong>{person.name}</strong>
                  <small>
                    {last
                      ? `${last.from === me ? "You: " : ""}${last.text || "Image attachment"}`
                      : "Start with a hello"}
                  </small>
                </span>
                <span className="nx-conversation-meta">
                  {last && (
                    <time dateTime={new Date(last.createdAt).toISOString()}>
                      {clock(last.createdAt)}
                    </time>
                  )}
                  {unread > 0 && (
                    <b aria-label={`${unread} unread messages`}>{unread}</b>
                  )}
                </span>
              </button>
            ))
          ) : (
            <div className="nx-chat-empty">
              <MessageCircle size={28} />
              <p>
                {query
                  ? "No conversations match."
                  : "Your next collaboration starts with a hello."}
              </p>
              <button type="button" className="text-button" onClick={onNew}>
                Find a creator <ArrowUpRight size={15} />
              </button>
            </div>
          )}
        </div>
      </aside>
      <section
        className="nx-thread"
        aria-label={
          current
            ? `Conversation with ${current.name}`
            : "Choose a conversation"
        }
      >
        {chat && current ? (
          <>
            <header className="nx-thread-heading">
              <button
                type="button"
                className="icon-button nx-chat-back"
                aria-label="Back to conversations"
                onClick={() => onChat("")}
              >
                <ArrowLeft size={20} />
              </button>
              <Face person={current} />
              <div>
                <strong>{current.name}</strong>
                <small>
                  {current.discipline || `@${current.username || "creator"}`}
                </small>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="View creator profile"
                onClick={() => onProfile(chat)}
              >
                <ArrowUpRight size={20} />
              </button>
            </header>
            <div
              className="nx-stream"
              ref={stream}
              role="log"
              aria-label="Messages, oldest first"
              aria-live="polite"
              aria-relevant="additions"
              onScroll={() => {
                const p = stream.current;
                if (p) {
                  nearBottom.current =
                    p.scrollHeight - p.scrollTop - p.clientHeight < 80;
                  if (nearBottom.current) setNewBelow(false);
                }
              }}
            >
              <div className="nx-thread-intro">
                <span>THE START OF SOMETHING GOOD</span>
                <p>This is your conversation with {current.name}.</p>
              </div>
              {thread.map((m, i) => {
                const date = new Date(m.createdAt).toLocaleDateString();
                const day =
                  i === 0 ||
                  date !==
                    new Date(thread[i - 1].createdAt).toLocaleDateString();
                return (
                  <div key={m.id} className="nx-message-group">
                    {day && (
                      <div className="nx-date-divider">
                        <time dateTime={new Date(m.createdAt).toISOString()}>
                          {date}
                        </time>
                      </div>
                    )}
                    <div
                      className={`nx-message ${m.from === me ? "mine" : ""}`}
                    >
                      {m.image && (
                        <a
                          href={m.image}
                          target="_blank"
                          rel="noreferrer"
                          aria-label="Open message attachment"
                        >
                          <img
                            src={m.image}
                            alt="Message attachment"
                            onLoad={() => {
                              if (nearBottom.current && stream.current)
                                stream.current.scrollTop =
                                  stream.current.scrollHeight;
                            }}
                          />
                        </a>
                      )}
                      {m.text && <p>{m.text}</p>}
                      <small>
                        <time dateTime={new Date(m.createdAt).toISOString()}>
                          {clock(m.createdAt)}
                        </time>
                        {m.from === me && (
                          <span aria-label={m.read ? "Read" : "Sent"}>
                            {m.read ? (
                              <CheckCheck size={13} />
                            ) : (
                              <Check size={13} />
                            )}
                          </span>
                        )}
                      </small>
                    </div>
                  </div>
                );
              })}
            </div>
            {newBelow && (
              <button
                type="button"
                className="nx-new-messages"
                onClick={() => {
                  if (stream.current)
                    stream.current.scrollTop = stream.current.scrollHeight;
                  nearBottom.current = true;
                  setNewBelow(false);
                }}
              >
                Latest messages <ArrowDown size={14} />
              </button>
            )}
            <div className="nx-compose-dock">
              {error && (
                <p className="nx-chat-error" role="alert">
                  {error}
                </p>
              )}
              {draft.image && (
                <div className="nx-attachment">
                  <img src={draft.image} alt="Ready to send" />
                  <span>Image attached</span>
                  <button
                    type="button"
                    className="icon-button"
                    disabled={busy}
                    aria-label="Remove attachment"
                    onClick={() => updateDraft(chat, { image: "" })}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
              <form
                className="nx-composer"
                onSubmit={(e) => {
                  e.preventDefault();
                  void send();
                }}
              >
                <label className="nx-attach-button" aria-label="Attach image">
                  <ImagePlus size={21} />
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={busy}
                    aria-label="Attach an image to your message"
                    onChange={async (e) => {
                      const file = e.currentTarget.files?.[0];
                      e.currentTarget.value = "";
                      if (!file || pending.current) return;
                      const recipient = chat;
                      pending.current = true;
                      setBusy(true);
                      setError("");
                      try {
                        const { uploadDirect } =
                          await import("@/lib/direct-upload");
                        const result = await uploadDirect(file, true, api);
                        updateDraft(recipient, { image: result.url });
                      } catch (e) {
                        setError((e as Error).message);
                      } finally {
                        pending.current = false;
                        setBusy(false);
                      }
                    }}
                  />
                </label>
                <textarea
                  rows={1}
                  maxLength={2000}
                  value={draft.text}
                  disabled={busy}
                  onChange={(e) => updateDraft(chat, { text: e.target.value })}
                  placeholder={`Message ${current.name.split(" ")[0]}…`}
                  aria-label="Message"
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      !e.shiftKey &&
                      !e.nativeEvent.isComposing &&
                      window.matchMedia("(min-width: 761px)").matches
                    ) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                />
                <button
                  className="nx-send"
                  type="submit"
                  disabled={busy || (!draft.text.trim() && !draft.image)}
                  aria-label="Send message"
                >
                  {busy ? (
                    <Loader2 size={18} className="spin" />
                  ) : (
                    <Send size={18} />
                  )}
                </button>
              </form>
              <p className="nx-composer-hint">
                Make a connection. Keep it kind.
              </p>
            </div>
          </>
        ) : (
          <div className="nx-welcome">
            <div className="nx-welcome-icon">
              <MessageCircle size={36} />
            </div>
            <span className="eyebrow">
              GOOD WORK STARTS WITH A CONVERSATION
            </span>
            <h2>
              A little hello.
              <br />A bigger possibility.
            </h2>
            <p>
              Share an idea, ask about a project, or meet your next
              collaborator.
            </p>
            <button type="button" className="button primary" onClick={onNew}>
              Start a conversation <Plus size={17} />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
