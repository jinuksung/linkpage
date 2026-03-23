import styles from "./page.module.css";
import { initialBlocks } from "../lib/page-data";

export default function LinkPage() {
  const profile = initialBlocks.find((b): b is Extract<(typeof initialBlocks)[number], { type: "profile" }> => b.type === "profile" && b.visible);
  const singles = initialBlocks.filter((b): b is Extract<(typeof initialBlocks)[number], { type: "single" }> => b.type === "single" && b.visible);

  return (
    <main className={styles.page}>
      <section className={styles.heroWrap}>
        <div className={styles.heroSingle}>
          <img src={profile?.imageUrl ?? "/images/profile-main.jpg"} alt="프로필 이미지" />
        </div>

        <div className={styles.profileSection}>
          <h1>{profile?.title ?? "핫비버와 핫도리의 핫딜 모음집"}</h1>
          {profile?.intro ? <p>{profile.intro}</p> : null}
          {profile?.notice ? <small>{profile.notice}</small> : null}

          <button className={styles.shareBtn} aria-label="공유하기">
            <svg className={styles.icon} viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M14 4H20V10" />
              <path d="M20 4L11 13" />
              <path d="M20 14V18C20 19.1 19.1 20 18 20H6C4.9 20 4 19.1 4 18V6C4 4.9 4.9 4 6 4H10" />
            </svg>
            공유하기
          </button>
        </div>
      </section>

      <section className={styles.listWrap}>
        {singles.map((product) => (
          <article
            key={product.id}
            className={`${styles.productCard} ${
              product.size === "small" ? styles.productCardSmall : product.size === "large" ? styles.productCardLarge : styles.productCardMedium
            }`}
          >
            <img className={styles.thumb} src={product.thumbnailUrl} alt={product.title} />
            <div className={styles.productBody}>
              <h2>{product.title}</h2>
              {product.subtext ? <p className={styles.subtext}>{product.subtext}</p> : null}
              {product.discount || product.price ? (
                <div className={styles.priceRow}>
                  {product.discount ? <span className={styles.discount}>{product.discount}</span> : null}
                  {product.price ? <span className={styles.price}>{product.price}</span> : null}
                </div>
              ) : null}
            </div>
            <a href={product.url} target="_blank" rel="noopener noreferrer" className={styles.coverLink}>
              <span className={styles.srOnly}>상품 이동</span>
            </a>
          </article>
        ))}
      </section>
    </main>
  );
}
