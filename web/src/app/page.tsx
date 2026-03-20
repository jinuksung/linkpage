import styles from "./page.module.css";

type Product = {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  badge?: string;
  price?: string;
  discount?: string;
  href: string;
};

const products: Product[] = [
  {
    id: "p1",
    title: "출근길 든든템! 믹서형 텀블러",
    subtitle: "든든템 · 믹서",
    imageUrl: "https://picsum.photos/seed/tumbler/240/240",
    href: "https://example.com/product-1",
  },
  {
    id: "p2",
    title: "화장실 청소 꿀템! 벽 부착 센서형 휴지통",
    imageUrl: "https://picsum.photos/seed/bin/240/240",
    discount: "42%",
    price: "26,400원",
    href: "https://example.com/product-2",
  },
];

export default function LinkPage() {
  return (
    <main className={styles.page}>
      <section className={styles.heroWrap}>
        <button className={`${styles.floatBtn} ${styles.leftBtn}`} aria-label="share">
          ⤴
        </button>
        <button className={`${styles.floatBtn} ${styles.rightBtn}`} aria-label="alert">
          🔔
        </button>

        <div className={styles.heroSplit}>
          <div className={styles.heroHalfLeft}>
            <img src="https://picsum.photos/seed/hamster/380/380" alt="캐릭터 1" />
          </div>
          <div className={styles.heroHalfRight}>
            <img src="https://picsum.photos/seed/otter/380/380" alt="캐릭터 2" />
          </div>
        </div>

        <div className={styles.profileSection}>
          <h1>핫비버와 핫도리의 핫딜 모음집</h1>
          <p>
            본 페이지는 쿠팡 파트너스 활동의 일환으로
            <br />
            수수료를 제공받아요!
          </p>
        </div>
      </section>

      <section className={styles.listWrap}>
        {products.map((product) => (
          <article key={product.id} className={styles.productCard}>
            <img className={styles.thumb} src={product.imageUrl} alt={product.title} />
            <div className={styles.productBody}>
              {product.subtitle ? <div className={styles.chips}>{product.subtitle}</div> : null}
              <h2>{product.title}</h2>
              {product.discount || product.price ? (
                <div className={styles.priceRow}>
                  {product.discount ? <span className={styles.discount}>{product.discount}</span> : null}
                  {product.price ? <span className={styles.price}>{product.price}</span> : null}
                </div>
              ) : null}
            </div>
            <a href={product.href} target="_blank" rel="noopener noreferrer" className={styles.coverLink}>
              <span className={styles.srOnly}>상품 이동</span>
            </a>
          </article>
        ))}
      </section>
    </main>
  );
}
