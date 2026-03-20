"use client";

import { useState } from "react";
import styles from "./page.module.css";

type Product = {
  id: number;
  name: string;
  buttonText: string;
  linkUrl: string;
  order: number;
};

const initialProducts: Product[] = [
  {
    id: 1,
    name: "데일리 이너케어 유산균",
    buttonText: "자세히 보기",
    linkUrl: "https://example.com/product-1",
    order: 1,
  },
  {
    id: 2,
    name: "피부 탄력 콜라겐 스틱",
    buttonText: "구매하러 가기",
    linkUrl: "https://example.com/product-2",
    order: 2,
  },
  {
    id: 3,
    name: "모닝 루틴 비타민 패키지",
    buttonText: "할인 링크 열기",
    linkUrl: "https://example.com/product-3",
    order: 3,
  },
];

export default function AdminPage() {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftButtonText, setDraftButtonText] = useState("");
  const [draftLinkUrl, setDraftLinkUrl] = useState("");

  const startEdit = (product: Product) => {
    setEditingId(product.id);
    setDraftName(product.name);
    setDraftButtonText(product.buttonText);
    setDraftLinkUrl(product.linkUrl);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraftName("");
    setDraftButtonText("");
    setDraftLinkUrl("");
  };

  const saveEdit = (id: number) => {
    const name = draftName.trim();
    const buttonText = draftButtonText.trim();
    const linkUrl = draftLinkUrl.trim();

    if (!name || !buttonText || !linkUrl) {
      alert("상품명, 버튼 문구, 상품 링크를 모두 입력해줘.");
      return;
    }

    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name, buttonText, linkUrl } : p)),
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
                <th>상품 링크</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tbody key={p.id}>
                  <tr>
                    <td>{p.order}</td>
                    <td>{p.name}</td>
                    <td>{p.buttonText}</td>
                    <td className={styles.urlCell}>{p.linkUrl}</td>
                    <td>
                      <button onClick={() => startEdit(p)}>수정</button>
                      <button onClick={() => removeProduct(p.id)}>삭제</button>
                    </td>
                  </tr>

                  {editingId === p.id && (
                    <tr className={styles.editRow}>
                      <td colSpan={5}>
                        <section className={styles.editorInline}>
                          <h3>상품 수정 #{p.id}</h3>
                          <div className={styles.editorGrid}>
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
                            <label className={styles.linkField}>
                              상품 링크 URL
                              <input
                                value={draftLinkUrl}
                                onChange={(e) => setDraftLinkUrl(e.target.value)}
                                placeholder="https://..."
                              />
                            </label>
                          </div>
                          <div className={styles.editorActions}>
                            <button className={styles.saveButton} onClick={() => saveEdit(p.id)}>
                              저장
                            </button>
                            <button className={styles.cancelButton} onClick={cancelEdit}>
                              취소
                            </button>
                          </div>
                        </section>
                      </td>
                    </tr>
                  )}
                </tbody>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
