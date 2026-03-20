import styles from "./page.module.css";

const products = [
  { id: 1, name: "데일리 이너케어 유산균", buttonText: "자세히 보기", order: 1 },
  { id: 2, name: "피부 탄력 콜라겐 스틱", buttonText: "구매하러 가기", order: 2 },
  { id: 3, name: "모닝 루틴 비타민 패키지", buttonText: "할인 링크 열기", order: 3 },
];

export default function AdminPage() {
  return (
    <main className={styles.page}>
      <aside className={styles.sidebar}>
        <h1>Back Office</h1>
        <nav>
          <a className={styles.active}>상품 관리</a>
          <a>프로필/소개</a>
          <a>링크 관리</a>
          <a>정책 (예정)</a>
        </nav>
      </aside>

      <section className={styles.content}>
        <header className={styles.header}>
          <div>
            <h2>상품 관리</h2>
            <p>링크 페이지에 노출될 상품을 관리합니다.</p>
          </div>
          <button className={styles.addButton}>+ 상품 추가</button>
        </header>

        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>순서</th>
                <th>상품명</th>
                <th>버튼 문구</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>{p.order}</td>
                  <td>{p.name}</td>
                  <td>{p.buttonText}</td>
                  <td>
                    <button>수정</button>
                    <button>삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
