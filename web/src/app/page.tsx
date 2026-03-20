import styles from "./page.module.css";

type Product = {
  id: string;
  title: string;
  imageUrl: string;
  ctaText: string;
  href: string;
};

const products: Product[] = [
  {
    id: "p1",
    title: "데일리 이너케어 유산균",
    imageUrl: "https://picsum.photos/seed/prod1/600/600",
    ctaText: "자세히 보기",
    href: "https://example.com/product-1",
  },
  {
    id: "p2",
    title: "피부 탄력 콜라겐 스틱",
    imageUrl: "https://picsum.photos/seed/prod2/600/600",
    ctaText: "구매하러 가기",
    href: "https://example.com/product-2",
  },
  {
    id: "p3",
    title: "모닝 루틴 비타민 패키지",
    imageUrl: "https://picsum.photos/seed/prod3/600/600",
    ctaText: "할인 링크 열기",
    href: "https://example.com/product-3",
  },
];

export default function LinkPage() {
  return (
    <main className={styles.page}>
      <section className={styles.profileCard}>
        <img
          className={styles.avatar}
          src="https://picsum.photos/seed/profile/220/220"
          alt="프로필"
        />
        <h1 className={styles.title}>Jinuk&apos;s Picks</h1>
        <p className={styles.description}>
          매일 써보고 진짜 좋았던 것만 모아둔 링크야. 광고만 많은 목록 말고,
          바로 도움 되는 제품만 빠르게 확인해.
        </p>

      </section>

      <section className={styles.grid}>
        {products.map((product) => (
          <article key={product.id} className={styles.card}>
            <img src={product.imageUrl} alt={product.title} className={styles.cardImage} />
            <h2 className={styles.cardTitle}>{product.title}</h2>
            <a
              href={product.href}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.primaryButton}
            >
              {product.ctaText}
            </a>
          </article>
        ))}
      </section>
    </main>
  );
}
