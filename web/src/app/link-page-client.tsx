"use client";

import { useMemo, useState } from "react";
import styles from "./page.module.css";
import ShareButton from "./share-button";
import type { PublicProduct, PublicProfile } from "../lib/public-products";

type Props = {
  profile: PublicProfile;
  products: PublicProduct[];
};

export default function LinkPageClient({ profile, products }: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((product) =>
      [product.title, product.subtitle, product.price, product.discount, String(product.sequenceNo ?? "")]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [products, query]);

  return (
    <main className={styles.page}>
      <section className={styles.heroWrap}>
        <div className={styles.heroSingle}>
          <img src={profile.imageUrl || "/images/profile-main.jpg"} alt="프로필 이미지" />
        </div>

        <div className={styles.profileSection}>
          <h1>{profile.title || "핫비버와 핫도리의 핫딜 모음집"}</h1>
          {profile.intro ? <p>{profile.intro}</p> : null}
          {profile.notice ? <small>{profile.notice}</small> : null}

          <ShareButton className={styles.shareBtn} iconClassName={styles.icon} />
          <div className={styles.searchWrap}>
            <div className={styles.searchField}>
              <input
                className={styles.searchInput}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="핫딜 검색"
                aria-label="핫딜 검색"
              />
              <svg className={styles.searchIcon} viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20L16.6 16.6" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.listWrap}>
        {filtered.map((product) => {
          const displayNo = product.sequenceNo;
          return (
            <article key={product.id} className={`${styles.productCard} ${styles.productCardMedium}`}>
              <img className={styles.thumb} src={product.thumbnailUrl} alt={product.title} />
              <div className={styles.productBody}>
                <h2>{displayNo != null ? `${displayNo}. ${product.title}` : product.title}</h2>
                {product.subtitle ? <p className={styles.subtext}>{product.subtitle}</p> : null}
                {product.discount || product.price ? (
                  <div className={styles.priceRow}>
                    {product.discount ? <span className={styles.discount}>{product.discount}</span> : null}
                    <span className={styles.price}>{product.price}</span>
                  </div>
                ) : null}
              </div>
              {product.url ? (
                <a href={product.url} target="_blank" rel="noopener noreferrer" className={styles.coverLink}>
                  <span className={styles.srOnly}>상품 이동</span>
                </a>
              ) : null}
            </article>
          );
        })}
      </section>
    </main>
  );
}
