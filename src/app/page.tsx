"use client";
import { useEffect, useState, useRef } from "react";
import { readApiResponse } from "@/lib/api-response";
import { uploadDirect } from "@/lib/direct-upload";
import AccountSettings from "@/components/AccountSettings";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  Home,
  Compass,
  ShoppingBag,
  MessageCircle,
  Bell,
  Bookmark,
  Plus,
  Search,
  Settings,
  ChevronDown,
  ChevronRight,
  Heart,
  MoreHorizontal,
  X,
  Check,
  Send,
  ImagePlus,
  Upload,
  Sun,
  Moon,
  LogOut,
  Download,
  Grid2X2,
  SlidersHorizontal,
  CheckCheck,
  Paperclip,
  Flag,
  Menu,
  Users,
  Palette,
  Sparkles,
  FileText,
  ShieldCheck,
  Loader2,
} from "lucide-react";
type Item = Record<string, any>;
const categories = [
  "For you",
  "Graphic design",
  "3D art",
  "Illustration",
  "Photography",
  "UI / UX",
  "Motion",
];
const navs = [
  { id: "home", label: "Home", icon: Home },
  { id: "explore", label: "Explore", icon: Compass },
  { id: "marketplace", label: "Marketplace", icon: ShoppingBag },
  { id: "messages", label: "Messages", icon: MessageCircle },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "saved", label: "Saved", icon: Bookmark },
];
const image = (id: string, w = 900) => "/art/forma.svg";
function Avatar({ user, size = 36 }: { user?: Item; size?: number }) {
  return user?.avatar ? (
    <img
      className="avatar"
      src={user.avatar}
      width={size}
      height={size}
      alt={user.name || "Creator"}
    />
  ) : (
    <span
      className="avatar initials"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.34,
        background: user?.color || "#e7e0f4",
      }}
    >
      {user?.name
        ?.split(" ")
        .map((n: string) => n[0])
        .join("")
        .slice(0, 2) || "N"}
    </span>
  );
}
function IconButton({
  children,
  label,
  onClick,
  className = "",
}: {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      className={`icon-button ${className}`}
      title={label}
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
export default function App() {
  const [data, setData] = useState<Item>({
    users: [],
    posts: [],
    products: [],
    follows: [],
    likes: [],
    saved: [],
    comments: [],
    messages: [],
    notifications: [],
    orders: [],
    sellerOrders: [],
  });
  const [loading, setLoading] = useState(true),
    [page, setPage] = useState("home"),
    [tab, setTab] = useState("Discover"),
    [category, setCategory] = useState("For you"),
    [query, setQuery] = useState(""),
    [searchOpen, setSearchOpen] = useState(false),
    [modal, setModal] = useState(""),
    [selected, setSelected] = useState<Item | null>(null),
    [profileId, setProfileId] = useState("mila"),
    [profileTab, setProfileTab] = useState("Posts"),
    [chat, setChat] = useState(""),
    [toast, setToast] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [dark, setDark] = useState(false),
    [mobileNav, setMobileNav] = useState(false),
    [limit, setLimit] = useState(6),
    [price, setPrice] = useState("all"),
    [sort, setSort] = useState("recent"),
    [authMode, setAuthMode] = useState("register"),
    [media, setMedia] = useState<string[]>([]),
    [fileId, setFileId] = useState(""),
    [preview, setPreview] = useState(""),
    [messageText, setMessageText] = useState(""),
    [messageImage, setMessageImage] = useState("");
  const [sellDownload, setSellDownload] = useState(false);
  const productsById = new Map<string, Item>(
    (data.products as Item[]).map((p) => [p.id, p]),
  );
  const formRef = useRef<HTMLFormElement>(null),
    toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const me = data.me,
    users = data.users as Item[];
  const user = (id: string) => users.find((u) => u.id === id);
  const tell = (text: string) => {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 4500);
  };
  const refresh = async () => {
    try {
      const res = await fetch("/api/state");
      setData(await readApiResponse(res));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 30000);
    const stream = new EventSource("/api/events");
    stream.onmessage = () => refresh();
    const initial = new URLSearchParams(location.search);
    if (initial.get("post")) {
      setSelected({ id: initial.get("post") });
      setModal("post");
    }
    if (initial.get("purchases")) setPage("downloads");
    if (initial.get("account") === "email-confirmed") {
      tell("Email confirmation complete. Your account details will refresh.");
      history.replaceState(null, "", "/");
    }
    if (initial.get("checkout"))
      tell("Checkout cancelled. No purchase was made.");
    if (initial.get("profile")) {
      setProfileId(initial.get("profile")!);
      setPage("profile");
    }
    setDark(localStorage.getItem("nexirel-theme") === "dark");
    return () => {
      clearInterval(timer);
      stream.close();
    };
  }, []);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        document.querySelector<HTMLInputElement>(".search-wrap input")?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("nexirel-theme", dark ? "dark" : "light");
  }, [dark]);
  useEffect(() => {
    if (!modal) return;
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModal("");
    };
    document.addEventListener("keydown", close);
    const previous = document.activeElement as HTMLElement;
    const dialog = document.querySelector<HTMLDivElement>('[role="dialog"]');
    dialog?.focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const elements = dialog?.querySelectorAll<HTMLElement>(
        "button,input,textarea,select,a[href]",
      );
      if (!elements?.length) return;
      const first = elements[0],
        last = elements[elements.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("keydown", close);
      document.removeEventListener("keydown", trap);
      previous?.focus();
    };
  }, [modal]);
  async function api(action: string, body: Item = {}) {
    const res = await fetch("/api/" + action, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return readApiResponse(res);
  }
  async function action(name: string, body: Item = {}, success = "") {
    if (!me) {
      setAuthMode("register");
      open("auth");
      return;
    }
    try {
      const result = await api(name, body);
      await refresh();
      if (success) tell(success);
      return result;
    } catch (e) {
      tell((e as Error).message);
    }
  }
  function open(name: string, item: Item | null = null) {
    setSelected(item);
    setModal(name);
    setError("");
    setMedia(item?.media || []);
    setPreview(item?.image || "");
    setFileId("");
    setSellDownload(false);
  }
  function go(id: string) {
    setPage(id);
    setQuery("");
    setSearchOpen(false);
    setMobileNav(false);
    setLimit(6);
    if (id === "notifications" && me) action("read");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function profile(id: string) {
    setProfileId(id);
    setProfileTab("Posts");
    go("profile");
  }
  function message(id: string) {
    if (!me) {
      open("auth");
      return;
    }
    setChat(id);
    go("messages");
    action("read", { from: id });
  }
  async function upload(file: File, privateFile = false) {
    const result = await uploadDirect(file, privateFile, api);
    setData((d) => ({
      ...d,
      mediaTypes: { ...d.mediaTypes, [result.url]: file.type },
    }));
    return result;
  }
  async function handleUpload(files: FileList | null, type: string) {
    if (!files) return;
    setBusy(true);
    try {
      for (const f of Array.from(files).slice(0, 6)) {
        const result = await upload(f, type === "file" || type === "message");
        if (type === "file") setFileId(result.id);
        else if (type === "preview") setPreview(result.url);
        else if (type === "message") setMessageImage(result.url);
        else setMedia((m) => [...m, result.url].slice(0, 6));
      }
    } catch (e) {
      tell((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const b = Object.fromEntries(new FormData(e.currentTarget).entries());
    try {
      if (modal === "auth") {
        if (authMode === "recover") {
          const r = await api("recover", b);
          setError(r.message);
          return;
        }
        const result = await api(authMode, b);
        if (result.confirmationRequired) {
          setError(result.message);
          setAuthMode("login");
          return;
        }
        tell(
          authMode === "register"
            ? "Welcome to Nexirel. Make yourself at home."
            : "Welcome back.",
        );
        setModal("");
        await refresh();
        if (authMode === "register") setTimeout(() => open("settings"), 100);
      } else if (modal === "create") {
        await api("post", {
          ...b,
          media,
          id: selected?.id,
          ...(sellDownload ? { sale: { price: b.price, fileId } } : {}),
        });
        setModal("");
        await refresh();
        tell(
          sellDownload
            ? "Your post and download listing are published."
            : "Your work is out in the world.",
        );
      } else if (modal === "listing") {
        await api("product", {
          ...b,
          fileId,
          image: preview,
          id: selected?.id,
        });
        setModal("");
        await refresh();
        go("seller");
        tell("Your listing has been saved.");
      } else if (modal === "settings") {
        await api("profile", { ...b, avatar: preview });
        setModal("");
        await refresh();
        tell("Profile updated.");
      } else if (modal === "report") {
        await api("report", { target: selected?.id, ...b });
        setModal("");
        tell("Report received. Thank you for keeping this space thoughtful.");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const unread = data.messages.filter(
    (m: Item) => m.to === me?.id && !m.read,
  ).length;
  const unseen = data.notifications.filter((n: Item) => !n.read).length;
  let posts = (data.posts as Item[]).filter(
    (p) =>
      (tab !== "Following" || data.follows.includes(p.userId)) &&
      (category === "For you" ||
        (p.tags || []).some((t: string) =>
          t.toLowerCase().includes(category.toLowerCase().replace(" art", "")),
        )),
  );
  if (page === "saved")
    posts = data.posts.filter((p: Item) => data.saved.includes(p.id));
  if (page === "profile")
    posts = data.posts.filter((p: Item) => p.userId === profileId);
  if (query)
    posts = posts.filter((p) =>
      `${p.title} ${p.caption} ${user(p.userId)?.name} ${p.tags.join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    );
  let products = data.products.filter(
    (p: Item) =>
      (page === "seller" ? p.userId === me?.id : p.status === "published") &&
      (!query ||
        `${p.title} ${p.category}`
          .toLowerCase()
          .includes(query.toLowerCase())) &&
      (price === "all" || p.price <= Number(price)),
  );
  if (category !== "For you" && page === "marketplace")
    products = products.filter((p: Item) =>
      p.category.toLowerCase().includes(category.toLowerCase()),
    );
  if (sort === "low") products.sort((a: Item, b: Item) => a.price - b.price);
  if (sort === "high") products.sort((a: Item, b: Item) => b.price - a.price);
  const currentPost = selected
    ? data.posts.find((p: Item) => p.id === selected.id)
    : null;
  const currentProfile = user(profileId);
  const friends = users.filter(
    (u) =>
      u.id !== me?.id &&
      (data.messages.some(
        (m: Item) =>
          (m.to === u.id && m.from === me?.id) ||
          (m.from === u.id && m.to === me?.id),
      ) ||
        u.id === chat),
  );
  function empty(
    title: string,
    description: string,
    button?: string,
    fn?: () => void,
  ) {
    return (
      <div className="empty">
        <Palette size={35} />
        <h3>{title}</h3>
        <p>{description}</p>
        {button && (
          <button className="button primary" onClick={fn}>
            {button}
          </button>
        )}
      </div>
    );
  }
  function productCard(p: Item) {
    return (
      <article className="product-card" key={p.id}>
        <button className="product-art" onClick={() => open("product", p)}>
          {p.image ? (
            <img src={p.image} alt={p.title} />
          ) : (
            <div className="art-placeholder">
              <Palette size={48} />
            </div>
          )}
          <span className="product-type">{p.category}</span>
          <span className="art-arrow">
            <ArrowUpRight size={19} />
          </span>
        </button>
        <div className="product-body">
          <div>
            <button
              className="text-button product-title"
              onClick={() => open("product", p)}
            >
              {p.title}
            </button>
            <p>
              {user(p.userId)?.name} <span>· {p.format}</span>
            </p>
          </div>
          <strong>${p.price}</strong>
        </div>
        {page === "seller" && (
          <div className="seller-actions">
            <span className={`status ${p.status}`}>{p.status}</span>
            <button className="text-button" onClick={() => open("listing", p)}>
              Edit listing <ArrowUpRight size={14} />
            </button>
          </div>
        )}
      </article>
    );
  }
  function postCard(p: Item) {
    const sale = productsById.get(p.productId);
    const author = user(p.userId),
      liked = data.likes.includes(p.id),
      saved = data.saved.includes(p.id);
    return (
      <article
        className="post-card"
        key={p.id}
        style={{ order: posts.findIndex((x) => x.id === p.id) }}
      >
        <button
          className="artwork"
          onClick={() => {
            open("post", p);
            history.replaceState(null, "", `?post=${p.id}`);
          }}
          aria-label={`View ${p.title}`}
          style={{ height: p.height || 350 }}
        >
          {p.image ? (
            data.mediaTypes?.[p.image]?.startsWith("video/") ? (
              <video src={p.image} controls />
            ) : (
              <img src={p.image} alt={p.title} loading="lazy" />
            )
          ) : (
            <div className="text-art">{p.caption}</div>
          )}
          <span className="art-category">{p.tags?.[0] || "Creative work"}</span>
          <span className="art-arrow">
            <ArrowUpRight size={20} />
          </span>
        </button>
        <div className="post-content">
          <div className="post-identity">
            <button className="creator" onClick={() => profile(p.userId)}>
              <Avatar user={author} size={33} />
              <span>
                <strong>{author?.name}</strong>
                <small>{author?.discipline?.split(" & ")[0]}</small>
              </span>
              {p.userId === "mila" && (
                <span className="verified">
                  <Check size={9} />
                </span>
              )}
            </button>
            <IconButton label="Post options" onClick={() => open("options", p)}>
              <MoreHorizontal size={20} />
            </IconButton>
          </div>
          <button
            className="post-title text-button"
            onClick={() => open("post", p)}
          >
            {p.title}
          </button>
          <p className="post-caption">{p.caption}</p>
          {sale?.status === "published" && (
            <button
              className="button secondary sale-link"
              onClick={() => open("product", sale)}
            >
              <ShoppingBag size={16} /> View download · ${sale.price} USD
            </button>
          )}
          <div className="post-bottom">
            <div>
              <button
                aria-label={liked ? "Unlike post" : "Like post"}
                className={liked ? "liked" : ""}
                onClick={() => action("like", { target: p.id })}
              >
                <Heart size={17} fill={liked ? "currentColor" : "none"} />
                <span>{(p.likes || 0) + (liked ? 1 : 0)}</span>
              </button>
              <button
                aria-label="View comments"
                onClick={() => open("post", p)}
              >
                <MessageCircle size={17} />
                <span>
                  {data.comments.filter((c: Item) => c.target === p.id)
                    .length || ""}
                </span>
              </button>
            </div>
            <IconButton
              label={saved ? "Unsave post" : "Save post"}
              className={saved ? "saved" : ""}
              onClick={() =>
                action(
                  "save",
                  { target: p.id },
                  saved
                    ? "Removed from saved"
                    : "Saved for a little inspiration later",
                )
              }
            >
              <Bookmark size={18} fill={saved ? "currentColor" : "none"} />
            </IconButton>
          </div>
        </div>
      </article>
    );
  }
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "mobile-open" : ""}`}>
        <a href="/" className="wordmark">
          <span className="brand-symbol">
            n<span>✻</span>
          </span>
          nexirel<span className="brand-dot">.</span>
        </a>
        <div className="workspace-label">YOUR CREATIVE SPACE</div>
        <nav>
          {navs.map((n) => (
            <button
              key={n.id}
              className={`nav-item ${page === n.id ? "active" : ""}`}
              onClick={() => go(n.id)}
            >
              <n.icon size={20} strokeWidth={page === n.id ? 2 : 1.65} />
              <span>{n.label}</span>
              {n.id === "messages" && unread > 0 && (
                <b className="nav-badge">{unread}</b>
              )}
              {n.id === "notifications" && unseen > 0 && (
                <span className="notification-dot" />
              )}
              {n.id === "marketplace" && <span className="new-pill">NEW</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-divider" />
        <button
          className="nav-item"
          onClick={() => (me ? profile(me.id) : open("auth"))}
        >
          <Users size={20} />
          <span>My profile</span>
        </button>
        <button
          className="nav-item"
          onClick={() => (me ? go("seller") : open("auth"))}
        >
          <Grid2X2 size={20} />
          <span>Creator studio</span>
        </button>
        <button
          className="button primary create-main"
          onClick={() => (me ? open("create") : open("auth"))}
        >
          <Plus size={19} /> Create something
        </button>
        <div className="sidebar-bottom">
          <div className="inspiration-note">
            <span className="tiny-flower">✻</span>
            <p>
              Good things happen
              <br />
              when creatives connect.
            </p>
            <button onClick={() => go("explore")}>
              Find your people <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="sidebar-controls">
            <button onClick={() => (me ? open("settings") : open("auth"))}>
              <Settings size={17} /> Settings
            </button>
            <IconButton
              label={dark ? "Switch to light mode" : "Switch to dark mode"}
              onClick={() => setDark(!dark)}
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </IconButton>
          </div>
          <button
            className="account"
            onClick={() => (me ? profile(me.id) : open("auth"))}
          >
            <Avatar user={me || { name: "Your creative space" }} />
            <span>
              <strong>{me?.name || "Make yourself at home"}</strong>
              <small>{me ? `@${me.username}` : "Join the community"}</small>
            </span>
            <MoreHorizontal size={18} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-breadcrumb">
            <IconButton
              label="Toggle navigation"
              className="mobile-menu"
              onClick={() => setMobileNav(!mobileNav)}
            >
              <Menu size={20} />
            </IconButton>
            <span>
              {page === "home"
                ? "Your daily dose of inspiration"
                : page === "marketplace"
                  ? "Made by creatives, for creatives"
                  : page === "messages"
                    ? "Good conversations start here"
                    : page === "profile"
                      ? "A little about the creator"
                      : "Your creative corner"}
            </span>
            <span className="desktop-star">✻</span>
          </div>
          <div className="topbar-actions">
            <div className="search-wrap">
              <Search size={17} />
              <input
                aria-label="Search Nexirel"
                placeholder="Search for inspiration..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSearchOpen(!!e.target.value);
                }}
                onFocus={() => query && setSearchOpen(true)}
              />
              <kbd>⌘ K</kbd>
              {searchOpen && (
                <div className="search-results">
                  <div className="eyebrow">CREATORS</div>
                  {users
                    .filter((u) =>
                      `${u.name} ${u.username}`
                        .toLowerCase()
                        .includes(query.toLowerCase()),
                    )
                    .slice(0, 4)
                    .map((u) => (
                      <button key={u.id} onClick={() => profile(u.id)}>
                        <Avatar user={u} size={29} />
                        <span>
                          {u.name}
                          <small>@{u.username}</small>
                        </span>
                        <ArrowUpRight size={15} />
                      </button>
                    ))}
                  <button
                    onClick={() => {
                      go("explore");
                      setQuery(query);
                    }}
                  >
                    Search posts <ArrowRight size={15} />
                  </button>
                  <button
                    onClick={() => {
                      go("marketplace");
                      setQuery(query);
                    }}
                  >
                    Search marketplace <ArrowRight size={15} />
                  </button>
                </div>
              )}
            </div>
            <IconButton
              label="Notifications"
              onClick={() => go("notifications")}
            >
              <Bell size={19} />
              {unseen > 0 && <i />}
            </IconButton>
            <button
              className="top-avatar"
              aria-label="Your profile"
              onClick={() => (me ? profile(me.id) : open("auth"))}
            >
              <Avatar user={me || { name: "You" }} size={33} />
            </button>
          </div>
        </header>
        <div
          className={`content-layout ${["messages", "profile", "seller", "downloads", "admin"].includes(page) ? "wide-layout" : ""}`}
        >
          <main className="main-content">
            {["home", "explore", "saved"].includes(page) && (
              <>
                <div className="page-heading">
                  <div>
                    <div className="eyebrow">A SPACE FOR YOUR NEXT IDEA</div>
                    <h1>
                      {page === "saved"
                        ? "Your inspiration, collected."
                        : page === "explore"
                          ? "Follow your curiosity."
                          : "A little more inspired."}
                      <span className="heading-spark">✻</span>
                    </h1>
                    <p>
                      {page === "saved"
                        ? "The work you love, ready when you need a spark."
                        : "Fresh perspectives. Beautiful work. Your kind of people."}
                    </p>
                  </div>
                </div>
                {page !== "saved" && (
                  <>
                    <div className="feed-tabs">
                      <div>
                        {["Discover", "Following"].map((t) => (
                          <button
                            className={tab === t ? "active" : ""}
                            key={t}
                            onClick={() => {
                              setTab(t);
                              setLimit(6);
                            }}
                          >
                            {t}
                            {t === "Discover" && (
                              <span className="tab-spark">✧</span>
                            )}
                            {t === "Following" && data.follows.length > 0 && (
                              <span className="count">
                                {data.follows.length}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                      <span className="feed-label">
                        <span /> A fresh perspective, every day
                      </span>
                    </div>
                    <div className="category-row">
                      {categories.map((c) => (
                        <button
                          className={category === c ? "selected" : ""}
                          onClick={() => {
                            setCategory(c);
                            setLimit(6);
                          }}
                          key={c}
                        >
                          {c === "For you" && <Sparkles size={13} />} {c}
                        </button>
                      ))}
                      <IconButton
                        label="Reset filters"
                        onClick={() => {
                          setCategory("For you");
                          setTab("Discover");
                          tell(
                            "Showing the latest posts from every discipline.",
                          );
                        }}
                      >
                        <SlidersHorizontal size={16} />
                      </IconButton>
                    </div>
                  </>
                )}
                {loading ? (
                  <div className="masonry">
                    {[1, 2, 3, 4].map((i) => (
                      <div className="skeleton" key={i} />
                    ))}
                  </div>
                ) : posts.length ? (
                  <>
                    <div className="masonry">
                      {[0, 1].map((col) => (
                        <div className="masonry-column" key={col}>
                          {posts
                            .slice(0, limit)
                            .filter((_, i) => i % 2 === col)
                            .map(postCard)}
                        </div>
                      ))}
                    </div>
                    {posts.length > limit ? (
                      <button
                        className="button load-more"
                        onClick={() => setLimit(limit + 6)}
                      >
                        A little more inspiration <ArrowRight size={16} />
                      </button>
                    ) : (
                      <p className="feed-end">
                        You’re all caught up. Go make something good.{" "}
                        <span>✻</span>
                      </p>
                    )}
                  </>
                ) : (
                  empty(
                    page === "saved"
                      ? "Keep a little inspiration."
                      : "A fresh start.",
                    page === "saved"
                      ? "Tap the bookmark on any post to find it here."
                      : tab === "Following"
                        ? "Follow a few creators and their latest work will appear here."
                        : "Try another creative discipline or search.",
                    "Explore creators",
                    () => {
                      setTab("Discover");
                      setCategory("For you");
                      go("explore");
                    },
                  )
                )}
                <div className="seed-note">
                  Curated sample work · Original sample artwork · Discover shows
                  recent posts
                </div>
              </>
            )}
            {page === "marketplace" && (
              <>
                <div className="page-heading">
                  <div className="eyebrow">THE CREATIVE MARKETPLACE</div>
                  <h1>
                    Your next great starting point
                    <span className="heading-spark">↗</span>
                  </h1>
                  <p>
                    Thoughtful resources from independent creators. Make them
                    your own.
                  </p>
                </div>
                <div className="market-banner">
                  <div>
                    <span className="eyebrow">MADE WITH INTENTION</span>
                    <h2>
                      Small details.
                      <br />
                      Endless possibilities.
                    </h2>
                    <p>A toolkit for whatever comes next.</p>
                    <button
                      className="button dark-button"
                      onClick={() => {
                        setCategory("Templates");
                        tell("Showing design templates");
                      }}
                    >
                      Explore the collection <ArrowUpRight size={16} />
                    </button>
                  </div>
                  <div className="banner-shapes">
                    <div />
                    <div />
                    <div />
                    <span>
                      FORM
                      <br />
                      <i>& FUNCTION</i>
                    </span>
                  </div>
                </div>
                <div className="market-filters">
                  <div className="category-row">
                    {[
                      "For you",
                      "Templates",
                      "Digital art",
                      "3D assets",
                      "Photography",
                      "Illustration",
                    ].map((c) => (
                      <button
                        key={c}
                        className={category === c ? "selected" : ""}
                        onClick={() => setCategory(c)}
                      >
                        {c === "For you" ? "All resources" : c}
                      </button>
                    ))}
                  </div>
                  <div className="selects">
                    <select
                      aria-label="Filter by price"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                    >
                      <option value="all">Any price</option>
                      <option value="20">Under $20</option>
                      <option value="40">Under $40</option>
                    </select>
                    <select
                      aria-label="Sort products"
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                    >
                      <option value="recent">Recommended</option>
                      <option value="low">Price: low to high</option>
                      <option value="high">Price: high to low</option>
                    </select>
                  </div>
                </div>
                <div className="product-grid">{products.map(productCard)}</div>
                {!products.length &&
                  empty(
                    "Nothing here just yet.",
                    "Try another category or price range.",
                  )}
                <div className="development-notice">
                  <ShieldCheck size={17} /> Development marketplace · Test
                  purchases only. No money is charged.
                </div>
              </>
            )}
            {page === "profile" && currentProfile && (
              <>
                <div className="profile-cover">
                  <span>
                    Ideas are better
                    <br />
                    when they’re shared.
                  </span>
                  <span className="cover-flower">✻</span>
                </div>
                <div className="profile-info">
                  <Avatar user={currentProfile} size={88} />
                  <div className="profile-action">
                    {me?.id === profileId ? (
                      <button
                        className="button secondary"
                        onClick={() => open("settings")}
                      >
                        Edit profile
                      </button>
                    ) : (
                      <>
                        <button
                          className={`button ${data.follows.includes(profileId) ? "secondary" : "primary"}`}
                          onClick={() =>
                            action("follow", { target: profileId })
                          }
                        >
                          {data.follows.includes(profileId) ? (
                            <>
                              <Check size={16} /> Following
                            </>
                          ) : (
                            <>
                              <Plus size={16} /> Follow
                            </>
                          )}
                        </button>
                        <button
                          className="button secondary"
                          onClick={() => message(profileId)}
                        >
                          <MessageCircle size={16} /> Message
                        </button>
                      </>
                    )}
                  </div>
                  <h1>{currentProfile.name}</h1>
                  <p className="muted">
                    @{currentProfile.username} · {currentProfile.discipline}
                  </p>
                  <p className="profile-bio">
                    {currentProfile.bio ||
                      "A creative story, just getting started."}
                  </p>
                  {currentProfile.website && (
                    <a
                      className="violet"
                      href={currentProfile.website}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Visit website <ArrowUpRight size={14} />
                    </a>
                  )}
                  <p className="profile-stats">
                    <strong>{currentProfile.followers}</strong> followers{" "}
                    <span>·</span>{" "}
                    <strong>
                      {
                        data.posts.filter((p: Item) => p.userId === profileId)
                          .length
                      }
                    </strong>{" "}
                    posts{" "}
                    {currentProfile.seed && (
                      <span className="sample-pill">Sample creator</span>
                    )}
                  </p>
                </div>
                <div className="feed-tabs">
                  <div>
                    {["Posts", "Shop", "About"].map((t) => (
                      <button
                        key={t}
                        className={profileTab === t ? "active" : ""}
                        onClick={() => setProfileTab(t)}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                {profileTab === "Posts" ? (
                  posts.length ? (
                    <div className="masonry">
                      {[0, 1].map((col) => (
                        <div className="masonry-column" key={col}>
                          {posts.filter((_, i) => i % 2 === col).map(postCard)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    empty("A blank canvas.", "This creator hasn’t posted yet.")
                  )
                ) : profileTab === "Shop" ? (
                  <div className="product-grid">
                    {data.products
                      .filter(
                        (p: Item) =>
                          p.userId === profileId && p.status === "published",
                      )
                      .map(productCard)}
                  </div>
                ) : (
                  <div className="about-card">
                    <h2>A little about {currentProfile.name.split(" ")[0]}</h2>
                    <p>
                      {currentProfile.bio || "Your creative story starts here."}
                    </p>
                    <h4>Creative disciplines</h4>
                    <span className="tag">{currentProfile.discipline}</span>
                    {me?.id !== profileId && (
                      <button
                        className="text-button danger"
                        onClick={() =>
                          action(
                            "block",
                            { target: profileId },
                            "Block preference updated. New messages are prevented.",
                          )
                        }
                      >
                        Block / unblock creator
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
            {page === "messages" && (
              <>
                <div className="page-heading">
                  <div className="eyebrow">A LITTLE CONNECTION</div>
                  <h1>
                    Conversations<span className="heading-spark">↗</span>
                  </h1>
                  <p>Share an idea. Start something together.</p>
                </div>
                {!me ? (
                  empty(
                    "Good things start with a hello.",
                    "Sign in to connect with other creatives.",
                    "Join Nexirel",
                    () => open("auth"),
                  )
                ) : (
                  <div className={`messenger ${chat ? "chat-active" : ""}`}>
                    <div className="conversation-list">
                      <div className="conversation-heading">
                        <strong>Your messages</strong>
                        <IconButton
                          label="New conversation"
                          onClick={() => open("new-chat")}
                        >
                          <Plus size={18} />
                        </IconButton>
                      </div>
                      {friends.length ? (
                        friends.map((u) => {
                          const msgs = data.messages.filter(
                              (m: Item) =>
                                (m.from === u.id && m.to === me.id) ||
                                (m.to === u.id && m.from === me.id),
                            ),
                            last = msgs[msgs.length - 1];
                          return (
                            <button
                              className={`conversation ${chat === u.id ? "active" : ""}`}
                              key={u.id}
                              onClick={() => {
                                setChat(u.id);
                                action("read", { from: u.id });
                              }}
                            >
                              <Avatar user={u} size={39} />
                              <span>
                                <strong>{u.name}</strong>
                                <small>
                                  {last?.text || "Start a conversation"}
                                </small>
                              </span>
                              {msgs.some(
                                (m: Item) => m.to === me.id && !m.read,
                              ) && <i />}
                            </button>
                          );
                        })
                      ) : (
                        <p className="mini-empty">
                          Your next collaboration starts with a hello.
                          <button
                            className="text-button violet"
                            onClick={() => open("new-chat")}
                          >
                            Find a creator <ArrowUpRight size={14} />
                          </button>
                        </p>
                      )}
                    </div>
                    <div className="chat-pane">
                      {chat ? (
                        <>
                          <div className="chat-heading">
                            <IconButton
                              className="mobile-back"
                              label="Back to conversations"
                              onClick={() => setChat("")}
                            >
                              <ArrowLeft size={18} />
                            </IconButton>
                            <Avatar user={user(chat)} />
                            <div>
                              <strong>{user(chat)?.name}</strong>
                              <small>{user(chat)?.discipline}</small>
                            </div>
                            <IconButton
                              label="View profile"
                              onClick={() => profile(chat)}
                            >
                              <ArrowUpRight size={19} />
                            </IconButton>
                          </div>
                          <div className="chat-messages">
                            {data.messages
                              .filter(
                                (m: Item) =>
                                  (m.from === chat && m.to === me.id) ||
                                  (m.to === chat && m.from === me.id),
                              )
                              .map((m: Item) => (
                                <div
                                  key={m.id}
                                  className={`message-bubble ${m.from === me.id ? "outgoing" : ""}`}
                                >
                                  {m.image && (
                                    <img
                                      src={m.image}
                                      alt="Message attachment"
                                    />
                                  )}
                                  {m.text && <p>{m.text}</p>}
                                  <small>
                                    {new Date(m.createdAt).toLocaleTimeString(
                                      [],
                                      { hour: "2-digit", minute: "2-digit" },
                                    )}
                                    {m.from === me.id &&
                                      (m.read ? (
                                        <CheckCheck size={13} />
                                      ) : (
                                        <Check size={13} />
                                      ))}
                                  </small>
                                </div>
                              ))}
                          </div>
                          {messageImage && (
                            <div className="attachment-preview">
                              <img
                                src={messageImage}
                                alt="Attachment preview"
                              />
                              <IconButton
                                label="Remove attachment"
                                onClick={() => setMessageImage("")}
                              >
                                <X size={15} />
                              </IconButton>
                            </div>
                          )}
                          <form
                            className="message-composer"
                            onSubmit={async (e) => {
                              e.preventDefault();
                              if (!messageText.trim() && !messageImage) return;
                              setBusy(true);
                              try {
                                await api("message", {
                                  to: chat,
                                  text: messageText,
                                  image: messageImage,
                                });
                                setMessageText("");
                                setMessageImage("");
                                await refresh();
                              } catch (e) {
                                tell(
                                  `${(e as Error).message} Your draft is kept; press send to retry.`,
                                );
                              } finally {
                                setBusy(false);
                              }
                            }}
                          >
                            <label className="icon-button" title="Attach image">
                              <Paperclip size={19} />
                              <input
                                type="file"
                                hidden
                                accept="image/jpeg,image/png,image/webp"
                                onChange={(e) =>
                                  handleUpload(e.target.files, "message")
                                }
                              />
                            </label>
                            <input
                              placeholder="A thoughtful hello goes a long way..."
                              aria-label="Message"
                              value={messageText}
                              onChange={(e) => setMessageText(e.target.value)}
                              maxLength={2000}
                            />
                            <button
                              disabled={
                                busy || (!messageText.trim() && !messageImage)
                              }
                              className="send-button"
                              aria-label="Send message"
                            >
                              {busy ? (
                                <Loader2 className="spin" size={17} />
                              ) : (
                                <Send size={17} />
                              )}
                            </button>
                          </form>
                        </>
                      ) : (
                        empty(
                          "A space to connect.",
                          "Choose a conversation or find someone whose work inspires you.",
                          "Find a creator",
                          () => open("new-chat"),
                        )
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
            {page === "notifications" && (
              <>
                <div className="page-heading">
                  <div className="eyebrow">YOUR CREATIVE CIRCLE</div>
                  <h1>A little good news.</h1>
                  <p>The latest from your corner of the community.</p>
                </div>
                {data.notifications.length ? (
                  <div className="notifications-list">
                    {[...data.notifications].reverse().map((n: Item) => (
                      <button
                        key={n.id}
                        onClick={() => {
                          const [type, id] = n.target.split(":");
                          if (type === "profile") profile(id);
                          else if (type === "post") open("post", { id });
                          else go(type);
                        }}
                      >
                        <Avatar user={user(n.actorId)} size={43} />
                        <span>
                          <strong>{user(n.actorId)?.name}</strong> {n.text}
                          <small>
                            {new Date(n.createdAt).toLocaleString()}
                          </small>
                        </span>
                        <ChevronRight size={17} />
                      </button>
                    ))}
                  </div>
                ) : (
                  empty(
                    "Quiet, in a good way.",
                    "New follows, comments, and purchases will appear here.",
                  )
                )}
              </>
            )}
            {page === "seller" && (
              <>
                <div className="page-heading heading-with-button">
                  <div>
                    <div className="eyebrow">YOUR IDEAS, OUT IN THE WORLD</div>
                    <h1>
                      Creator studio<span className="heading-spark">✻</span>
                    </h1>
                    <p>A little space to build your independent business.</p>
                  </div>
                  <button
                    className="button primary"
                    onClick={() => (me ? open("listing") : open("auth"))}
                  >
                    <Plus size={17} /> New product
                  </button>
                </div>
                {!me ? (
                  empty(
                    "Made by you. Loved by someone.",
                    "Create an account to open your digital storefront.",
                    "Get started",
                    () => open("auth"),
                  )
                ) : (
                  <>
                    <div className="stats-grid">
                      <div>
                        <span>Completed test sales</span>
                        <strong>
                          $
                          {data.sellerOrders
                            .filter((o: Item) => o.status === "paid")
                            .reduce((s: number, o: Item) => s + o.amount, 0)
                            .toFixed(2)}
                        </strong>
                        <small>Test transactions · No real earnings</small>
                      </div>
                      <div>
                        <span>Orders</span>
                        <strong>{data.sellerOrders.length}</strong>
                        <small>Based on transaction records</small>
                      </div>
                      <div>
                        <span>Your products</span>
                        <strong>{products.length}</strong>
                        <small>
                          {
                            products.filter(
                              (p: Item) => p.status === "published",
                            ).length
                          }{" "}
                          published
                        </small>
                      </div>
                    </div>
                    <h2 className="section-heading">Your collection</h2>
                    <div className="product-grid">
                      {products.map(productCard)}
                    </div>
                    {!products.length &&
                      empty(
                        "Every shop starts with one idea.",
                        "Upload a digital resource and share your craft.",
                        "Create your first product",
                        () => open("listing"),
                      )}
                    <h2 className="section-heading">Recent orders</h2>
                    {data.sellerOrders.length ? (
                      <div className="orders-list">
                        {data.sellerOrders.map((o: Item) => (
                          <div key={o.id}>
                            <span>
                              <strong>{o.title}</strong>
                              <small>
                                {new Date(o.createdAt).toLocaleDateString()} ·
                                Development purchase
                              </small>
                            </span>
                            <b>${o.amount}</b>
                            <span className="status">{o.status}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="muted">
                        Your first order will appear here.
                      </p>
                    )}
                  </>
                )}
              </>
            )}
            {page === "downloads" && (
              <>
                <div className="page-heading">
                  <div className="eyebrow">GOOD THINGS, KEEP FOREVER</div>
                  <h1>Your creative toolkit.</h1>
                  <p>Your purchases and downloads, all in one place.</p>
                </div>
                {data.orders.length ? (
                  <div className="orders-list">
                    {data.orders.map((o: Item) => (
                      <div key={o.id}>
                        <span>
                          <strong>{o.title}</strong>
                          <small>
                            {new Date(o.createdAt).toLocaleDateString()} · $
                            {o.amount} ·{" "}
                            {o.mode === "development"
                              ? "Development"
                              : "Stripe test"}{" "}
                            purchase · {o.status}
                          </small>
                        </span>
                        <button
                          className="button secondary"
                          disabled={o.status !== "paid"}
                          onClick={async () => {
                            const r = await action("download-link", {
                              orderId: o.id,
                            });
                            if (r) window.location.assign(r.url);
                          }}
                        >
                          <Download size={16} />{" "}
                          {o.status === "paid"
                            ? "Download"
                            : "Awaiting payment"}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  empty(
                    "Your next favourite tool is out there.",
                    "Explore thoughtful resources from independent creators.",
                    "Visit the marketplace",
                    () => {
                      setCategory("For you");
                      go("marketplace");
                    },
                  )
                )}
              </>
            )}
            {page === "admin" && (
              <>
                <div className="page-heading">
                  <h1>Community moderation</h1>
                </div>
                {me?.role !== "admin" ? (
                  empty(
                    "Administrator access required.",
                    "This area is restricted to authorised moderators.",
                  )
                ) : (
                  <>
                    <h2>Reports</h2>
                    {data.reports.map((r: Item) => (
                      <div className="about-card" key={r.id}>
                        <strong>{r.reason}</strong>
                        <p>
                          Target: {r.target} · {r.status}
                        </p>
                        <button
                          className="button secondary"
                          onClick={() =>
                            action("admin", { kind: "report", id: r.id })
                          }
                        >
                          Mark reviewed
                        </button>
                      </div>
                    ))}
                    <h2>Users</h2>
                    {users.map((u) => (
                      <div className="admin-row" key={u.id}>
                        {u.name}
                        <button
                          className="button secondary"
                          onClick={() =>
                            action("admin", { kind: "user", id: u.id })
                          }
                        >
                          {u.disabled ? "Restore" : "Suspend"}
                        </button>
                      </div>
                    ))}
                    <h2>Listings</h2>
                    {data.products.map((p: Item) => (
                      <div className="admin-row" key={p.id}>
                        {p.title}
                        <button
                          className="button secondary"
                          onClick={() =>
                            action("admin", { kind: "product", id: p.id })
                          }
                        >
                          Archive
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </>
            )}
            {error && !modal && (
              <div className="error-box">
                {error}
                <button onClick={refresh}>Retry</button>
              </div>
            )}
          </main>
          {!["messages", "profile", "seller", "downloads", "admin"].includes(
            page,
          ) && (
            <aside className="right-panel">
              <div className="community-card">
                <div className="community-decoration">
                  ✻<span>✧</span>
                </div>
                <span className="eyebrow">BETTER, TOGETHER</span>
                <h2>
                  Your people.
                  <br />
                  Your possibilities.
                </h2>
                <p>
                  A community for the things
                  <br />
                  you love to make.
                </p>
                <button onClick={() => (me ? open("create") : open("auth"))}>
                  {me ? "Share your latest work" : "Find your creative circle"}{" "}
                  <ArrowUpRight size={16} />
                </button>
                <div className="community-avatars">
                  {users.slice(0, 4).map((u) => (
                    <Avatar user={u} key={u.id} size={27} />
                  ))}
                  <span>Room for you, too.</span>
                </div>
              </div>
              <section className="creators-panel">
                <div className="panel-heading">
                  <h3>People to inspire you</h3>
                  <span>✧</span>
                </div>
                {users
                  .filter((u) => u.id !== me?.id)
                  .slice(0, 3)
                  .map((u) => (
                    <div className="suggested-person" key={u.id}>
                      <button className="creator" onClick={() => profile(u.id)}>
                        <Avatar user={u} size={38} />
                        <span>
                          <strong>{u.name}</strong>
                          <small>{u.discipline.split(" & ")[0]}</small>
                        </span>
                      </button>
                      <IconButton
                        label={
                          data.follows.includes(u.id)
                            ? `Unfollow ${u.name}`
                            : `Follow ${u.name}`
                        }
                        className={
                          data.follows.includes(u.id)
                            ? "follow-button following"
                            : "follow-button"
                        }
                        onClick={() => action("follow", { target: u.id })}
                      >
                        {data.follows.includes(u.id) ? (
                          <Check size={15} />
                        ) : (
                          <Plus size={15} />
                        )}
                      </IconButton>
                    </div>
                  ))}
                <button className="panel-link" onClick={() => open("new-chat")}>
                  Discover more creators <ArrowRight size={14} />
                </button>
              </section>
              <section className="trending-panel">
                <h3>A little inspiration</h3>
                {[
                  {
                    name: "# MadeInBlender",
                    text: "Ideas taking shape",
                    tone: "lilac",
                    icon: Grid2X2,
                  },
                  {
                    name: "# BrandNewThinking",
                    text: "A fresh point of view",
                    tone: "peach",
                    icon: Palette,
                  },
                  {
                    name: "# EverydayMagic",
                    text: "Beauty in the ordinary",
                    tone: "sage",
                    icon: Sun,
                  },
                ].map((t) => (
                  <button
                    key={t.name}
                    onClick={() => {
                      setCategory(
                        t.tone === "lilac"
                          ? "3D art"
                          : t.tone === "peach"
                            ? "Graphic design"
                            : "Photography",
                      );
                      setTab("Discover");
                      go("explore");
                    }}
                  >
                    <span className={`trend-icon ${t.tone}`}>
                      <t.icon size={17} />
                    </span>
                    <span>
                      <strong>{t.name}</strong>
                      <small>{t.text}</small>
                    </span>
                    <ArrowUpRight size={14} />
                  </button>
                ))}
              </section>
              <section className="market-teaser">
                <div className="panel-heading">
                  <h3>Made for your next idea</h3>
                  <ArrowUpRight size={16} />
                </div>
                <button
                  className="teaser-image"
                  onClick={() => {
                    setCategory("For you");
                    go("marketplace");
                  }}
                >
                  <img
                    src={image("photo-1600210492486-724fe5c67fb0", 500)}
                    alt="Minimal interior design inspiration"
                  />
                  <span>THE CREATOR’S TOOLKIT</span>
                </button>
                <p>Thoughtful tools. By independent minds.</p>
                <button
                  className="panel-link"
                  onClick={() => {
                    setCategory("For you");
                    go("marketplace");
                  }}
                >
                  Explore the marketplace <ArrowRight size={14} />
                </button>
              </section>
              <footer>
                <div>
                  <button onClick={() => open("about")}>About</button>
                  <button onClick={() => open("guidelines")}>Guidelines</button>
                  <button onClick={() => open("privacy")}>Privacy</button>
                  <button onClick={() => open("help")}>Help</button>
                </div>
                <span>
                  © {new Date().getFullYear()} Nexirel. Made for the makers.
                </span>
                <span className="footer-flower">✻</span>
              </footer>
            </aside>
          )}
        </div>
      </div>
      <nav className="mobile-bottom">
        {navs.slice(0, 4).map((n) => (
          <button
            className={page === n.id ? "active" : ""}
            key={n.id}
            onClick={() => go(n.id)}
          >
            <n.icon size={21} />
            <span>{n.label}</span>
          </button>
        ))}
        <button onClick={() => (me ? open("create") : open("auth"))}>
          <Plus size={23} />
          <span>Create</span>
        </button>
      </nav>
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {modal && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setModal("");
              history.replaceState(null, "", "/");
            }
          }}
        >
          <div
            className={`modal ${["post", "product"].includes(modal) ? "detail-modal" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label={
              modal === "auth"
                ? "Join Nexirel"
                : modal === "post"
                  ? "Post details"
                  : modal === "product"
                    ? "Product details"
                    : modal
            }
            tabIndex={-1}
          >
            <IconButton
              label="Close dialog"
              className="modal-close"
              onClick={() => {
                setModal("");
                history.replaceState(null, "", "/");
              }}
            >
              <X size={20} />
            </IconButton>
            {modal === "auth" && (
              <>
                <span className="modal-flower">✻</span>
                <div className="eyebrow">A HOME FOR YOUR CREATIVE SIDE</div>
                <h2>
                  {authMode === "register"
                    ? "Good things start here."
                    : authMode === "login"
                      ? "Welcome back, creative."
                      : "Let’s get you back in."}
                </h2>
                <p className="muted">
                  {authMode === "register"
                    ? "Find your people. Share your perspective. Make your mark."
                    : authMode === "login"
                      ? "Your creative corner is right where you left it."
                      : "Enter your email to check recovery availability."}
                </p>
                <form onSubmit={submit} ref={formRef} key={authMode}>
                  {authMode === "register" && (
                    <>
                      <label>
                        Your name
                        <input
                          name="name"
                          required
                          maxLength={60}
                          placeholder="Alex Rivera"
                          autoComplete="name"
                        />
                      </label>
                      <label>
                        Username
                        <input
                          name="username"
                          required
                          pattern="[a-zA-Z0-9_]{3,24}"
                          placeholder="alexrivera"
                          autoComplete="username"
                        />
                      </label>
                    </>
                  )}
                  <label>
                    Email address
                    <input
                      name="email"
                      type="email"
                      required
                      placeholder="you@example.com"
                      autoComplete="email"
                    />
                  </label>
                  {authMode !== "recover" && (
                    <label>
                      Password
                      <input
                        name="password"
                        type="password"
                        required
                        minLength={authMode === "register" ? 10 : 1}
                        maxLength={128}
                        placeholder="At least 10 characters"
                        autoComplete={
                          authMode === "register"
                            ? "new-password"
                            : "current-password"
                        }
                      />
                    </label>
                  )}
                  {error && (
                    <div className="error-box" role="alert">
                      {error}
                    </div>
                  )}
                  <button className="button primary full" disabled={busy}>
                    {busy ? (
                      <Loader2 size={18} className="spin" />
                    ) : authMode === "register" ? (
                      "Create your account"
                    ) : authMode === "login" ? (
                      "Sign in"
                    ) : (
                      "Check recovery options"
                    )}
                    <ArrowRight size={16} />
                  </button>
                </form>
                <div className="auth-switch">
                  {authMode === "register"
                    ? "Already part of the circle?"
                    : "New to Nexirel?"}{" "}
                  <button
                    onClick={() => {
                      setAuthMode(
                        authMode === "register" ? "login" : "register",
                      );
                      setError("");
                    }}
                  >
                    {authMode === "register" ? "Sign in" : "Create an account"}
                  </button>
                </div>
                {authMode === "login" && (
                  <button
                    className="text-button recovery"
                    onClick={() => {
                      setAuthMode("recover");
                      setError("");
                    }}
                  >
                    Forgot your password?
                  </button>
                )}
                <p className="fine-print">
                  Use an email address you can access to confirm your account.
                </p>
              </>
            )}
            {modal === "create" && (
              <>
                <div className="eyebrow">LET YOUR WORK DO THE TALKING</div>
                <h2>
                  {selected
                    ? "Refine your post."
                    : "Share a little of your world."}
                </h2>
                <form onSubmit={submit}>
                  {!selected?.productId && (
                    <div
                      className="composer-modes"
                      role="group"
                      aria-label="Post type"
                    >
                      <button
                        type="button"
                        className={!sellDownload ? "active" : ""}
                        aria-pressed={!sellDownload}
                        onClick={() => setSellDownload(false)}
                      >
                        Share a post
                      </button>
                      <button
                        type="button"
                        className={sellDownload ? "active" : ""}
                        aria-pressed={sellDownload}
                        onClick={() => setSellDownload(true)}
                      >
                        Sell a download
                      </button>
                    </div>
                  )}
                  {selected?.productId && (
                    <p className="fine-print">
                      This post has a download listing. Change its price or file
                      in Creator studio.
                    </p>
                  )}
                  <label>
                    Your story
                    <textarea
                      name="caption"
                      required
                      maxLength={3000}
                      rows={5}
                      placeholder="What have you been making? Add a caption, a thought, or a few #hashtags..."
                      defaultValue={selected?.caption}
                    />
                  </label>
                  <label className="upload-zone">
                    <ImagePlus size={28} />
                    <strong>
                      {busy ? "Uploading..." : "Add photos or a video"}
                    </strong>
                    <span>
                      Up to 6 files · JPG, PNG, WebP, GIF, MP4 · 10 MB each
                    </span>
                    <input
                      hidden
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
                      onChange={(e) => handleUpload(e.target.files, "post")}
                    />
                  </label>
                  {media.length > 0 && (
                    <div className="upload-previews">
                      {media.map((m) => (
                        <div key={m}>
                          {data.mediaTypes?.[m]?.startsWith("video/") ? (
                            <video src={m} controls />
                          ) : (
                            <img src={m} alt="Post preview" />
                          )}
                          <button
                            type="button"
                            aria-label="Remove media"
                            onClick={() =>
                              setMedia(media.filter((x) => x !== m))
                            }
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {sellDownload && (
                    <div className="sale-fields">
                      <label>
                        Price (USD)
                        <input
                          name="price"
                          type="number"
                          min="1"
                          max="10000"
                          step="0.01"
                          required
                          placeholder="19.00"
                        />
                      </label>
                      <label className="upload-zone compact">
                        <Upload size={23} />
                        <strong>
                          {fileId
                            ? "Private download uploaded ✓"
                            : "Upload the buyer’s download"}
                        </strong>
                        <span>
                          Original artwork, Artwork, ZIP, PDF or project file ·
                          10 MB maximum
                        </span>
                        <input
                          type="file"
                          hidden
                          accept=".jpg,.jpeg,.png,.webp,.gif,.zip,.pdf,.fig,.blend,.psd,.ai,.aep"
                          onChange={(e) => handleUpload(e.target.files, "file")}
                        />
                      </label>
                      <p className="fine-print">
                        Post images are public previews. The separate download
                        is delivered after purchase. Personal use; no
                        redistribution or resale.
                      </p>
                      <p className="fine-print">
                        Checkout is currently in test mode. No real money is
                        collected.
                      </p>
                    </div>
                  )}
                  {error && (
                    <div className="error-box" role="alert">
                      {error}
                    </div>
                  )}
                  <button disabled={busy} className="button primary full">
                    {busy
                      ? "Working..."
                      : selected
                        ? "Save changes"
                        : sellDownload
                          ? "Publish post & listing"
                          : "Publish your work"}
                    <ArrowUpRight size={17} />
                  </button>
                </form>
              </>
            )}
            {modal === "settings" && (
              <>
                <div className="eyebrow">MAKE YOURSELF AT HOME</div>
                <h2>Your creative identity.</h2>
                <form onSubmit={submit}>
                  <label>
                    Profile picture
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => handleUpload(e.target.files, "preview")}
                    />
                  </label>
                  {preview && (
                    <img
                      className="avatar"
                      src={preview}
                      width={60}
                      height={60}
                      alt="Profile preview"
                    />
                  )}
                  <div className="form-grid">
                    <label>
                      Name
                      <input
                        name="name"
                        required
                        defaultValue={me?.name}
                        maxLength={60}
                      />
                    </label>
                    <label>
                      Creative discipline
                      <input
                        name="discipline"
                        placeholder="Illustration & design"
                        defaultValue={me?.discipline}
                        maxLength={100}
                      />
                    </label>
                  </div>
                  <label>
                    Username
                    <input
                      name="username"
                      required
                      minLength={3}
                      maxLength={24}
                      pattern="[a-zA-Z0-9_]{3,24}"
                      defaultValue={me?.username}
                      autoComplete="username"
                    />
                    <span className="fine-print">
                      3–24 letters, numbers or underscores.
                    </span>
                  </label>
                  <label>
                    A little about you
                    <textarea
                      name="bio"
                      rows={3}
                      defaultValue={me?.bio}
                      maxLength={500}
                      placeholder="Your story, in a few words."
                    />
                  </label>
                  <label>
                    Website
                    <input
                      name="website"
                      type="url"
                      defaultValue={me?.website}
                      placeholder="https://your-portfolio.com"
                    />
                  </label>
                  {error && <div className="error-box">{error}</div>}
                  <button disabled={busy} className="button primary full">
                    Save profile <Check size={17} />
                  </button>
                </form>
                <AccountSettings
                  email={me?.email || ""}
                  api={api}
                  onUpdated={refresh}
                />
                <div className="settings-links">
                  <button
                    onClick={() => {
                      setModal("");
                      go("downloads");
                    }}
                  >
                    <Download size={16} /> Purchases & downloads
                  </button>
                  {me?.role === "admin" && (
                    <button
                      onClick={() => {
                        setModal("");
                        go("admin");
                      }}
                    >
                      <ShieldCheck size={16} /> Administration
                    </button>
                  )}
                  <button
                    className="danger"
                    onClick={async () => {
                      await api("logout");
                      await refresh();
                      setModal("");
                      go("home");
                      tell("You’ve signed out. See you soon.");
                    }}
                  >
                    <LogOut size={16} /> Sign out
                  </button>
                </div>
              </>
            )}
            {modal === "post" &&
              (currentPost ? (
                <>
                  <div className="detail-art">
                    {currentPost.media?.length ? (
                      currentPost.media.map((m: string, i: number) => (
                        <div key={m}>
                          {data.mediaTypes?.[m]?.startsWith("video/") ? (
                            <video src={m} controls />
                          ) : (
                            <img
                              src={m}
                              alt={`${currentPost.title}, image ${i + 1}`}
                            />
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-art">{currentPost.caption}</div>
                    )}
                  </div>
                  <div className="detail-content">
                    <button
                      className="creator"
                      onClick={() => {
                        setModal("");
                        profile(currentPost.userId);
                      }}
                    >
                      <Avatar user={user(currentPost.userId)} />
                      <span>
                        <strong>{user(currentPost.userId)?.name}</strong>
                        <small>@{user(currentPost.userId)?.username}</small>
                      </span>
                    </button>
                    <h2>{currentPost.title}</h2>
                    <p>{currentPost.caption}</p>
                    {productsById.get(currentPost.productId)?.status ===
                      "published" && (
                      <button
                        className="button primary sale-link"
                        onClick={() =>
                          open(
                            "product",
                            productsById.get(currentPost.productId)!,
                          )
                        }
                      >
                        <ShoppingBag size={17} /> View download · $
                        {productsById.get(currentPost.productId)!.price} USD
                      </button>
                    )}
                    <div className="detail-actions">
                      <button
                        className={`button secondary ${data.likes.includes(currentPost.id) ? "liked" : ""}`}
                        onClick={() =>
                          action("like", { target: currentPost.id })
                        }
                      >
                        <Heart size={17} />{" "}
                        {(currentPost.likes || 0) +
                          (data.likes.includes(currentPost.id) ? 1 : 0)}
                      </button>
                      <IconButton
                        label="Save post"
                        onClick={() =>
                          action(
                            "save",
                            { target: currentPost.id },
                            "Saved preference updated",
                          )
                        }
                      >
                        <Bookmark size={18} />
                      </IconButton>
                      <button
                        className="text-button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(
                              `${location.origin}/?post=${currentPost.id}`,
                            );
                            tell("Post link copied.");
                          } catch {
                            tell(
                              "Share this URL: " +
                                location.origin +
                                "/?post=" +
                                currentPost.id,
                            );
                          }
                        }}
                      >
                        Share <ArrowUpRight size={16} />
                      </button>
                    </div>
                    <h4>Conversation</h4>
                    <div className="comments">
                      {data.comments
                        .filter((c: Item) => c.target === currentPost.id)
                        .map((c: Item) => (
                          <div key={c.id}>
                            <Avatar user={user(c.userId)} size={27} />
                            <p>
                              <strong>{user(c.userId)?.name}</strong>
                              {c.text}
                            </p>
                          </div>
                        ))}
                    </div>
                    <form
                      className="comment-form"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const form = e.currentTarget,
                          text = new FormData(form).get("text");
                        const r = await action("comment", {
                          target: currentPost.id,
                          text,
                        });
                        if (r) form.reset();
                      }}
                    >
                      <input
                        name="text"
                        aria-label="Add a comment"
                        placeholder="Leave a little encouragement..."
                        required
                        maxLength={1000}
                      />
                      <button aria-label="Send comment">
                        <ArrowRight size={18} />
                      </button>
                    </form>
                    {currentPost.seed && (
                      <span className="fine-print">
                        Curated sample post · Original sample artwork
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <p>Loading post...</p>
              ))}
            {modal === "options" && selected && (
              <>
                <h2>A little housekeeping.</h2>
                <div className="settings-links">
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(
                        `${location.origin}/?post=${selected.id}`,
                      );
                      tell("Link copied");
                      setModal("");
                    }}
                  >
                    <ArrowUpRight size={17} /> Copy post link
                  </button>
                  {me?.id === selected.userId ? (
                    <>
                      <button onClick={() => open("create", selected)}>
                        <FileText size={17} /> Edit post
                      </button>
                      <button
                        className="danger"
                        onClick={async () => {
                          await action(
                            "post",
                            { id: selected.id, delete: true },
                            "Post deleted",
                          );
                          setModal("");
                        }}
                      >
                        <X size={17} /> Delete post
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() =>
                          me ? open("report", selected) : open("auth")
                        }
                      >
                        <Flag size={17} /> Report this post
                      </button>
                      <button
                        onClick={async () => {
                          await action(
                            "block",
                            { target: selected.userId },
                            "Block preference updated",
                          );
                          setModal("");
                        }}
                      >
                        <ShieldCheck size={17} /> Block / unblock creator
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
            {modal === "report" && (
              <>
                <h2>Help keep this space thoughtful.</h2>
                <form onSubmit={submit}>
                  <label>
                    What should we know?
                    <textarea
                      required
                      name="reason"
                      rows={4}
                      maxLength={1000}
                      placeholder="Describe the concern..."
                    />
                  </label>
                  {error && <div className="error-box">{error}</div>}
                  <button className="button primary full" disabled={busy}>
                    Submit report
                  </button>
                </form>
              </>
            )}
            {modal === "new-chat" && (
              <>
                <div className="eyebrow">FIND YOUR PEOPLE</div>
                <h2>A creative connection.</h2>
                <p className="muted">
                  Start with someone whose perspective you love.
                </p>
                <div className="creator-directory">
                  {users
                    .filter((u) => u.id !== me?.id)
                    .map((u) => (
                      <div key={u.id}>
                        <button
                          className="creator"
                          onClick={() => {
                            setModal("");
                            profile(u.id);
                          }}
                        >
                          <Avatar user={u} size={42} />
                          <span>
                            <strong>{u.name}</strong>
                            <small>{u.discipline}</small>
                          </span>
                        </button>
                        <IconButton
                          label={`Message ${u.name}`}
                          onClick={() => {
                            setModal("");
                            message(u.id);
                          }}
                        >
                          <MessageCircle size={19} />
                        </IconButton>
                      </div>
                    ))}
                </div>
              </>
            )}
            {modal === "product" && selected && (
              <>
                <div className="detail-art product-detail-art">
                  {selected.image ? (
                    <img src={selected.image} alt={selected.title} />
                  ) : (
                    <Palette size={70} />
                  )}
                </div>
                <div className="detail-content">
                  <span className="tag">{selected.category}</span>
                  <h2>{selected.title}</h2>
                  <button
                    className="creator"
                    onClick={() => {
                      setModal("");
                      profile(selected.userId);
                    }}
                  >
                    <Avatar user={user(selected.userId)} size={30} />
                    <span>
                      <strong>By {user(selected.userId)?.name}</strong>
                    </span>
                    <ArrowUpRight size={14} />
                  </button>
                  <p>{selected.description}</p>
                  <div className="product-specs">
                    <div>
                      <span>File formats</span>
                      <strong>{selected.format}</strong>
                    </div>
                    <div>
                      <span>Compatibility</span>
                      <strong>
                        {selected.software || "See documentation"}
                      </strong>
                    </div>
                    <div>
                      <span>Licence</span>
                      <strong>{selected.licence}</strong>
                    </div>
                  </div>
                  <div className="purchase-price">
                    <strong>
                      ${selected.price}
                      <small> USD</small>
                    </strong>
                    <span>One-time purchase</span>
                  </div>
                  <button
                    className="button primary full"
                    onClick={() =>
                      me ? open("checkout", selected) : open("auth")
                    }
                  >
                    Get this resource <ArrowRight size={17} />
                  </button>
                  <p className="fine-print">
                    {data.developmentCheckout
                      ? "Development checkout · No real charge"
                      : "Stripe test checkout · No real charge"}
                    {selected.seed ? " · Sample file only" : ""}
                  </p>
                </div>
              </>
            )}
            {modal === "checkout" && selected && (
              <>
                <div className="eyebrow">A NEW TOOL FOR YOUR TOOLKIT</div>
                <h2>Make something wonderful.</h2>
                <div className="checkout-item">
                  {selected.image && (
                    <img src={selected.image} alt={selected.title} />
                  )}
                  <div>
                    <strong>{selected.title}</strong>
                    <small>By {user(selected.userId)?.name}</small>
                  </div>
                  <b>${selected.price}</b>
                </div>
                <div className="development-notice">
                  <ShieldCheck size={22} />
                  <div>
                    <strong>
                      {data.developmentCheckout
                        ? "Development checkout"
                        : "Stripe test checkout"}
                    </strong>
                    <p>
                      {data.developmentCheckout
                        ? "This is a simulated purchase. No card details are collected and no money is charged."
                        : "Continue to Stripe’s hosted test checkout. Download access is granted after a verified payment webhook."}
                      {selected.seed
                        ? " This seeded resource delivers a demonstration text file."
                        : ""}
                    </p>
                  </div>
                </div>
                <button
                  disabled={busy}
                  className="button primary full"
                  onClick={async () => {
                    setBusy(true);
                    const r = await action("checkout", {
                      productId: selected.id,
                    });
                    setBusy(false);
                    if (r?.url) {
                      location.assign(r.url);
                    } else if (r) {
                      setModal("purchase-success");
                      setSelected(r);
                    }
                  }}
                >
                  {busy
                    ? "Processing..."
                    : data.developmentCheckout
                      ? "Complete test purchase"
                      : "Continue to Stripe test checkout"}{" "}
                  <ArrowRight size={17} />
                </button>
              </>
            )}
            {modal === "purchase-success" && selected && (
              <>
                <div className="success-icon">
                  <Check size={30} />
                </div>
                <h2>Your next idea starts here.</h2>
                <p className="muted">
                  Your development purchase is complete. Your file is ready
                  whenever you are.
                </p>
                <div className="checkout-item">
                  <FileText size={28} />
                  <strong>{selected.title}</strong>
                </div>
                <button
                  className="button primary full"
                  onClick={async () => {
                    const r = await action("download-link", {
                      orderId: selected.id,
                    });
                    if (r) window.location.assign(r.url);
                  }}
                >
                  <Download size={18} /> Download your file
                </button>
                <button
                  className="button secondary full"
                  onClick={() => {
                    setModal("");
                    go("downloads");
                  }}
                >
                  View all purchases
                </button>
                <p className="fine-print">
                  Simulated payment · No money was charged.
                </p>
              </>
            )}
            {modal === "listing" && (
              <>
                <div className="eyebrow">MADE BY YOU</div>
                <h2>
                  {selected
                    ? "Refine your resource."
                    : "Put your craft out there."}
                </h2>
                <form onSubmit={submit}>
                  <label>
                    Product title
                    <input
                      name="title"
                      required
                      defaultValue={selected?.title}
                      maxLength={100}
                      placeholder="A name that tells the story"
                    />
                  </label>
                  <label>
                    Description
                    <textarea
                      name="description"
                      required
                      rows={3}
                      defaultValue={selected?.description}
                      maxLength={5000}
                      placeholder="What’s inside, and who is it for?"
                    />
                  </label>
                  <div className="form-grid">
                    <label>
                      Price (USD)
                      <input
                        name="price"
                        required
                        type="number"
                        min="1"
                        max="10000"
                        step="0.01"
                        defaultValue={selected?.price || 19}
                      />
                    </label>
                    <label>
                      Category
                      <select
                        name="category"
                        defaultValue={selected?.category || "Templates"}
                      >
                        {[
                          "Templates",
                          "Digital art",
                          "3D assets",
                          "Photography",
                          "Illustration",
                          "UI kits",
                          "Project files",
                        ].map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="form-grid">
                    <label>
                      File formats
                      <input
                        name="format"
                        defaultValue={selected?.format}
                        placeholder="FIG, ZIP, PDF"
                      />
                    </label>
                    <label>
                      Software compatibility
                      <input
                        name="software"
                        defaultValue={selected?.software}
                        placeholder="Figma, Blender 4.0..."
                      />
                    </label>
                  </div>
                  <label>
                    Licence
                    <textarea
                      name="licence"
                      rows={2}
                      defaultValue={
                        selected?.licence ||
                        "Personal use. No redistribution or resale."
                      }
                    />
                  </label>
                  <label className="upload-zone compact">
                    <ImagePlus size={23} />
                    <strong>
                      {preview ? "Preview uploaded" : "Public preview image"}
                    </strong>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      hidden
                      onChange={(e) => handleUpload(e.target.files, "preview")}
                    />
                  </label>
                  {preview && (
                    <img
                      className="listing-preview"
                      src={preview}
                      alt="Product preview"
                    />
                  )}
                  <label className="upload-zone compact">
                    <Upload size={23} />
                    <strong>
                      {fileId
                        ? "Private file uploaded ✓"
                        : selected
                          ? "Replace private file (optional)"
                          : "Private downloadable file"}
                    </strong>
                    <span>
                      Artwork, ZIP, PDF or project file · 10 MB maximum
                    </span>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,.gif,.zip,.pdf,.fig,.blend,.psd,.ai,.aep"
                      hidden
                      onChange={(e) => handleUpload(e.target.files, "file")}
                    />
                  </label>
                  <label>
                    Listing status
                    <select
                      name="status"
                      defaultValue={selected?.status || "draft"}
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="archived">Archived</option>
                    </select>
                  </label>
                  {error && <div className="error-box">{error}</div>}
                  <button disabled={busy} className="button primary full">
                    {busy ? "Uploading..." : "Save your resource"}{" "}
                    <ArrowUpRight size={17} />
                  </button>
                </form>
              </>
            )}
            {["about", "guidelines", "privacy", "help"].includes(modal) && (
              <>
                <span className="modal-flower">✻</span>
                <h2>
                  {modal === "about"
                    ? "A home for creative minds."
                    : modal === "guidelines"
                      ? "Make it a good place."
                      : modal === "privacy"
                        ? "Your work. Your privacy."
                        : "A little help along the way."}
                </h2>
                <div className="prose">
                  {modal === "about" ? (
                    <>
                      <p>
                        Nexirel is a place to share what you make, connect with
                        independent creatives, and find tools for your next
                        idea.
                      </p>
                      <p>
                        This development version includes curated sample
                        creators and original sample artwork. Sample content is
                        separate from your own posts and purchases.
                      </p>
                    </>
                  ) : modal === "guidelines" ? (
                    <>
                      <p>
                        Share work you own or have permission to share. Credit
                        collaborators. Give thoughtful feedback, respect
                        boundaries, and keep private conversations private.
                      </p>
                      <p>
                        Use the post options menu to report harmful content or
                        block a creator. Public launch requires active
                        moderation and uploaded-file scanning.
                      </p>
                    </>
                  ) : modal === "privacy" ? (
                    <>
                      <p>
                        This instance stores accounts, posts, conversations, and
                        orders in a local SQLite database. Passwords are salted
                        and hashed; sessions use HTTP-only cookies.
                      </p>
                      <p>
                        Messages are available only to their participants.
                        Product downloads require a purchase and a short-lived
                        authorised link. Never upload sensitive personal
                        documents.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        Use Create something to publish your work. Visit a
                        creator’s profile to follow or message them. Creator
                        studio is where your digital storefront begins.
                      </p>
                      <p>
                        Settings contains your profile, username, email,
                        password, purchases, and sign-out. To sell a file,
                        choose Sell a download when creating a post. Checkout is
                        test-only; no real money is collected.
                        Forgotten-password recovery is not implemented yet.
                      </p>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
