import { ArrowRight, ArrowUpRight, Check, ShoppingBag } from "lucide-react";
import { money } from "@/lib/payment-methods";

type Creator = {
  id: string;
  name: string;
  discipline?: string;
  avatar?: string;
  seed?: boolean;
};
type Work = { id: string; userId: string; image?: string; title: string };
type Product = Work & {
  price: number;
  currency?: string;
  format?: string;
  status?: string;
  seed?: boolean;
};
type Props = {
  users: Creator[];
  posts: Work[];
  products: Product[];
  following: string[];
  currentUserId?: string;
  onProfile: (id: string) => void;
  onFollow: (id: string) => void;
  onProduct: (product: Product) => void;
  onMarketplace: () => void;
};

export default function DiscoveryRail({
  users,
  posts,
  products,
  following,
  currentUserId,
  onProfile,
  onFollow,
  onProduct,
  onMarketplace,
}: Props) {
  const creators = users
    .filter(
      (u) => u.id !== currentUserId && posts.some((p) => p.userId === u.id),
    )
    .sort((a, b) => Number(!!a.seed) - Number(!!b.seed))
    .slice(0, 3);
  const resource =
    products.find((p) => p.status === "published" && !p.seed) ||
    products.find((p) => p.status === "published");
  return (
    <aside
      className="discovery-rail"
      aria-label="Discover creators and resources"
    >
      {creators.length > 0 && (
        <section className="creator-discovery">
          <div className="rail-heading">
            <h2>Creators to watch</h2>
          </div>
          {creators.map((creator) => {
            const works = posts
              .filter((p) => p.userId === creator.id && p.image)
              .slice(0, 3);
            const followed = following.includes(creator.id);
            return (
              <div className="discovery-creator" key={creator.id}>
                <div className="discovery-person">
                  <button
                    className="discovery-person-link"
                    onClick={() => onProfile(creator.id)}
                  >
                    {creator.avatar ? (
                      <img
                        className="avatar"
                        src={creator.avatar}
                        alt=""
                        width={40}
                        height={40}
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <span className="avatar initials">
                        {creator.name.slice(0, 1)}
                      </span>
                    )}
                    <span>
                      <strong>{creator.name}</strong>
                      <small>
                        {creator.discipline?.split(" & ")[0] ||
                          "Independent creator"}
                      </small>
                    </span>
                  </button>
                  <button
                    className={`button ${followed ? "secondary" : "primary"} follow-button`}
                    aria-label={`${followed ? "Unfollow" : "Follow"} ${creator.name}`}
                    aria-pressed={followed}
                    onClick={() => onFollow(creator.id)}
                  >
                    {followed ? <Check size={17} /> : "Follow"}
                  </button>
                </div>
                <button
                  className="creator-work-strip"
                  aria-label={`View ${creator.name}'s work`}
                  onClick={() => onProfile(creator.id)}
                >
                  {works.map((work) => (
                    <img
                      key={work.id}
                      src={work.image}
                      alt={work.title}
                      loading="lazy"
                      decoding="async"
                    />
                  ))}
                  <span>
                    <ArrowUpRight size={20} />
                  </span>
                </button>
                {creator.seed && (
                  <small className="creator-sample">Sample creator</small>
                )}
              </div>
            );
          })}
        </section>
      )}
      {resource && (
        <section className="rail-resource">
          <div className="rail-heading">
            <h2>
              Made for your
              <br />
              next project
            </h2>
            <button aria-label="Browse marketplace" onClick={onMarketplace}>
              <ArrowRight size={20} />
            </button>
          </div>
          <button className="rail-product" onClick={() => onProduct(resource)}>
            {resource.image && (
              <img
                src={resource.image}
                alt=""
                loading="lazy"
                decoding="async"
              />
            )}
            <span>
              <strong>{resource.title}</strong>
              <small>
                {resource.seed ? "Sample resource · " : ""}
                {resource.format || "Digital download"}
              </small>
              <b>{money(resource.price, resource.currency)}</b>
            </span>
            <ShoppingBag size={21} />
          </button>
        </section>
      )}
      <div className="rail-footnote">
        Made by people.
        <br />
        Made for what’s next.
      </div>
    </aside>
  );
}
