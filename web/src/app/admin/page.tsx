"use client";

import { useMemo, useState } from "react";
import styles from "./page.module.css";

type Product = {
  id: number;
  name: string;
  buttonText: string;
  order: number;
};

const initialProducts: Product[] = [
  { id: 1, name: "데일리 이너케어 유산균", buttonText: "자세히 보기", order: 1 },
  { id: 2, name: "피부 탄력 콜라겐 스틱", buttonText: "구매하러 가기", order: 2 },
  { id: 3, name: "모닝 루틴 비타민 패키지", buttonText: "할인 링크 열기", order: 3 },
];

export default function AdminPage() {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftButtonText, setDraftButtonText] = useState("");

  const editingProduct = useMemo(
    () => products.find((p) => p.id === editingId) ?? null,
    [products, editingId],
  );

  const startEdit = (product: Product) => {
    setEditingId(product.id);
    setDraftName(product.name);
    setDraftButtonText(product.buttonText);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraftName("");
    setDraftButtonText("");
  };

  const saveEdit = () => {
    if (!editingProduct) return;

    const name = draftName.trim();
    const buttonText = draftButtonText.trim();

    if (!name || !buttonText) {
      alert("상품명과 버튼 문구를 모두 입력해줘.");
      return;
    }

    setProducts((prev) =>
      prev.map((p) =>
        p.id === editingProduct.id ? { ...p, name, buttonText } : p,
      ),
    );
    cancelEdit();
  };

  const removeProduct = (id: number) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    if (editingId === id) cancelEdit();
  };

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
                    <button onClick={() => startEdit(p)}>수정</button>
                    <button onClick={() => removeProduct(p.id)}>삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {editingProduct && (
          <section className={styles.editor}>
            <h3>상품 수정 #{editingProduct.id}</h3>
            <label>
              상품명
              <input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="상품명을 입력하세요"
              />
            </label>
            <label>
              버튼 문구
              <input
                value={draftButtonText}
                onChange={(e) => setDraftButtonText(e.target.value)}
                placeholder="버튼 문구를 입력하세요"
              />
            </label>
            <div className={styles.editorActions}>
              <button className={styles.saveButton} onClick={saveEdit}>
                저장
              </button>
              <button className={styles.cancelButton} onClick={cancelEdit}>
                취소
              </button>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
