"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./page.module.css";
import { cloneBlocks, initialBlocks, normalizeBlocks, type Block, type SingleLinkBlock } from "../../lib/page-data";
import { emptyProduct, type ProductMaster } from "../../lib/product-master";
import AutomationPanel from "./automation-panel";

type SaveState = "saved" | "dirty" | "saving" | "error";
type AdminTab = "blocks" | "products" | "automation";
type HotdealBlock = {
  id: string;
  sequenceNo: number | null;
  title: string;
  subtitle: string;
  linkUrl: string;
  imageUrl: string;
  priceText: string;
  discountText: string;
  sortOrder: number;
  isActive: boolean;
};

const profileDefaults = cloneBlocks(initialBlocks).filter(
  (b): b is Extract<Block, { type: "profile" }> => b.type === "profile",
);

const nextId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 8)}`;

const urlError = (url?: string) => {
  if (!url) return "URL 필수";
  const ok = /^https?:\/\//.test(url);
  return ok ? null : "URL 형식 오류";
};

const blockError = (block: Block) => {
  if (!block.visible) return null;
  if (block.type === "profile") {
    if (!block.title.trim()) return "필수값 누락";
    return null;
  }
  if (block.type === "single") {
    if (!block.title.trim()) return "필수값 누락";
    return urlError(block.url);
  }
  if (!block.title.trim()) return "필수값 누락";
  const bad = block.links.find((l) => !l.title.trim() || urlError(l.url));
  if (!bad) return null;
  if (!bad.title.trim()) return "필수값 누락";
  return urlError(bad.url);
};

export default function AdminPage() {
  const [slug] = useState("/hotdeals");
  const [activeTab, setActiveTab] = useState<AdminTab>("blocks");
  const [blocks, setBlocks] = useState<Block[]>(profileDefaults);
  const [products, setProducts] = useState<ProductMaster[]>([]);
  const [savedProducts, setSavedProducts] = useState<ProductMaster[]>([]);
  const [productLoading, setProductLoading] = useState(true);
  const [hotdealLoading, setHotdealLoading] = useState(true);
  const [hotdealBlocks, setHotdealBlocks] = useState<HotdealBlock[]>([]);
  const [collapsedHotdealIds, setCollapsedHotdealIds] = useState<Record<string, boolean>>({});
  const [blockLoading, setBlockLoading] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [productQuery, setProductQuery] = useState("");
  const [selectedId, setSelectedId] = useState(profileDefaults[0]?.id ?? "b_profile");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [viewport, setViewport] = useState("390px");
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);
  const [dragBlockId, setDragBlockId] = useState<string | null>(null);

  const selected = blocks.find((b) => b.id === selectedId) ?? blocks[0];

  useEffect(() => {
    let alive = true;
    const loadBlocks = async () => {
      try {
        const res = await fetch(`/api/page-config?slug=${encodeURIComponent(slug)}`, { cache: "no-store" });
        const json = await res.json();
        if (!alive) return;
        const fetched = (normalizeBlocks(json?.blocks) ?? profileDefaults).filter((b) => b.type === "profile");
        setBlocks(fetched);
        setSelectedId((prev) => (fetched.some((b) => b.id === prev) ? prev : fetched[0]?.id ?? profileDefaults[0]?.id ?? "b_profile"));
      } catch {
        if (!alive) return;
        setBlocks(profileDefaults);
      } finally {
        if (alive) setBlockLoading(false);
      }
    };
    loadBlocks();
    return () => {
      alive = false;
    };
  }, [slug]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/products", { cache: "no-store" });
        const json = await res.json();
        if (!alive) return;
        const list: ProductMaster[] = Array.isArray(json?.items) ? json.items : [];
        setProducts(list);
        setSavedProducts(list);
        setSelectedProductId((prev) => prev ?? list[0]?.id ?? null);
      } catch {
        if (!alive) return;
        setProducts([]);
        setSavedProducts([]);
      } finally {
        if (alive) setProductLoading(false);
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    const loadHotdeals = async () => {
      try {
        const res = await fetch("/api/content-blocks", { cache: "no-store" });
        const json = await res.json();
        if (!alive) return;
        const list: HotdealBlock[] = Array.isArray(json?.items) ? json.items : [];
        setHotdealBlocks(list.sort((a, b) => a.sortOrder - b.sortOrder));
      } catch {
        if (!alive) return;
        setHotdealBlocks([]);
      } finally {
        if (alive) setHotdealLoading(false);
      }
    };
    loadHotdeals();
    return () => {
      alive = false;
    };
  }, []);

  const withDirty = (updater: (prev: Block[]) => Block[]) => {
    setBlocks((prev) => updater(prev));
    setSaveState("dirty");
  };

  const updateBlock = (id: string, patch: Partial<Block>) => {
    withDirty((prev) => prev.map((b) => (b.id === id ? ({ ...b, ...patch } as Block) : b)));
  };

  const addBlock = (type: Block["type"]) => {
    const block: Block =
      type === "profile"
        ? {
            id: nextId("b_profile"),
            type,
            visible: true,
            title: "새 프로필",
            intro: "소개 문구",
            notice: "",
            imageUrl: "/images/profile-main.jpg",
          }
        : type === "single"
          ? {
              id: nextId("b_single"),
              type,
              visible: true,
              title: "새 단일 링크",
              url: "https://",
              thumbnailUrl: "https://picsum.photos/seed/new-product/240/240",
              badge: "",
              subtext: "",
              price: "",
              discount: "",
              buttonText: "보러가기",
              size: "medium",
            }
          : {
              id: nextId("b_group"),
              type,
              visible: true,
              title: "새 그룹",
              description: "",
              expandedByDefault: true,
              links: [{ id: nextId("gl"), title: "새 링크", url: "https://" }],
            };

    withDirty((prev) => [...prev, block]);
    setSelectedId(block.id);
  };

  const duplicate = (id: string) => {
    withDirty((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      if (idx < 0) return prev;
      const original = prev[idx];
      const clone: Block = { ...original, id: nextId(original.type === "single" ? "b_single" : original.type === "group" ? "b_group" : "b_profile") } as Block;
      const copied = [...prev];
      copied.splice(idx + 1, 0, clone);
      return copied;
    });
  };

  const reorderBlocks = (fromId: string, toId: string) => {
    if (!fromId || !toId || fromId === toId) return;
    withDirty((prev) => {
      const from = prev.findIndex((b) => b.id === fromId);
      const to = prev.findIndex((b) => b.id === toId);
      if (from < 0 || to < 0) return prev;
      const copied = [...prev];
      const [picked] = copied.splice(from, 1);
      copied.splice(to, 0, picked);
      return copied;
    });
  };

  const remove = (id: string) => {
    withDirty((prev) => prev.filter((b) => b.id !== id));
    if (expandedBlockId === id) setExpandedBlockId(null);
    if (selectedId === id) {
      const remain = blocks.filter((b) => b.id !== id);
      if (remain[0]) setSelectedId(remain[0].id);
    }
  };

  const save = async () => {
    const hasError = blocks.some((b) => !!blockError(b));
    const hasHotdealError = hotdealBlocks.some((b) => !/^https?:\/\//.test((b.linkUrl || "").trim()));
    if (hasError || hasHotdealError) {
      setSaveState("error");
      return;
    }

    setSaveState("saving");
    try {
      const res = await fetch("/api/page-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, blocks }),
      });
      if (!res.ok) {
        setSaveState("error");
        return;
      }
      const json = await res.json();
      const saved = (normalizeBlocks(json?.blocks) ?? cloneBlocks(initialBlocks)).filter((b) => b.type === "profile");
      setBlocks(saved);
      setSelectedId((prev) => (saved.some((b) => b.id === prev) ? prev : saved[0]?.id ?? initialBlocks[0].id));

      const hotdealRes = await fetch("/api/content-blocks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: hotdealBlocks.map((b, index) => ({
            ...b,
            sortOrder: index,
          })),
        }),
      });
      if (!hotdealRes.ok) {
        setSaveState("error");
        return;
      }
      const hotdealJson = await hotdealRes.json();
      const refreshed: HotdealBlock[] = Array.isArray(hotdealJson?.items) ? hotdealJson.items : [];
      setHotdealBlocks(refreshed.sort((a, b) => a.sortOrder - b.sortOrder));
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  };

  const statusText =
    saveState === "saved"
      ? "저장됨"
      : saveState === "saving"
        ? "저장 중..."
        : saveState === "dirty"
          ? "미저장 변경사항"
          : "저장 실패(재시도)";

  const visibleBlocks = useMemo(() => blocks.filter((b) => b.visible), [blocks]);

  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => [p.name, p.seedKeyword, p.brand, p.modelNo].join(" ").toLowerCase().includes(q));
  }, [products, productQuery]);

  const selectedProduct = products.find((p) => p.id === selectedProductId) ?? null;
  const previewProducts = useMemo(
    () => {
      return hotdealBlocks
        .filter((b) => b.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((b) => {
          return {
            id: b.id,
            title: b.title || "(이름 없음)",
            subtitle: b.subtitle,
            sequenceNo: b.sequenceNo ?? null,
            thumbAnchor: b.imageUrl || "",
            priceText: b.priceText || "",
            discountText: b.discountText || "",
          };
        })
        .filter((item): item is NonNullable<typeof item> => !!item);
    },
    [hotdealBlocks],
  );

  const hotdealBlocksBySequenceDesc = useMemo(() => {
    return hotdealBlocks
      .slice()
      .sort((a, b) => {
        const aSeq = a.sequenceNo;
        const bSeq = b.sequenceNo;
        const aHas = aSeq != null;
        const bHas = bSeq != null;
        if (aHas && bHas && aSeq !== bSeq) return bSeq - aSeq;
        if (aHas !== bHas) return aHas ? -1 : 1;
        return a.sortOrder - b.sortOrder;
      });
  }, [hotdealBlocks]);

  const formatPrice = (value: string | number) => {
    const raw = String(value ?? "").trim();
    if (!raw) return "";
    const num = Number(raw);
    if (!Number.isFinite(num)) return raw;
    const int = Number.isInteger(num);
    return `${int ? num.toLocaleString("ko-KR") : num.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}원`;
  };

  const addHotdealBlock = () => {
    const id = nextId("cb");
    setHotdealBlocks((prev) => [
      ...prev,
      {
        id,
        sequenceNo: null,
        title: "",
        subtitle: "",
        linkUrl: "https://",
        imageUrl: "",
        priceText: "",
        discountText: "",
        sortOrder: prev.length,
        isActive: true,
      },
    ]);
    setCollapsedHotdealIds((prev) => ({ ...prev, [id]: true }));
    setSaveState("dirty");
  };

  const updateHotdealBlock = (id: string, patch: Partial<HotdealBlock>) => {
    setHotdealBlocks((prev) =>
      prev.map((b, idx) => (b.id === id ? { ...b, ...patch, sortOrder: idx } : { ...b, sortOrder: idx })),
    );
    setSaveState("dirty");
  };

  const removeHotdealBlock = (id: string) => {
    if (!id.startsWith("cb_")) {
      fetch(`/api/content-blocks/${id}`, { method: "DELETE" }).catch(() => undefined);
    }
    setHotdealBlocks((prev) => prev.filter((b) => b.id !== id).map((b, idx) => ({ ...b, sortOrder: idx })));
    setCollapsedHotdealIds((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setSaveState("dirty");
  };

  const saveHotdealBlock = async (id: string) => {
    const target = hotdealBlocks.find((b) => b.id === id);
    if (!target) return;
    if (!/^https?:\/\//.test((target.linkUrl || "").trim())) {
      setSaveState("error");
      return;
    }

    setSaveState("saving");
    try {
      const isTemp = target.id.startsWith("cb_");
      const endpoint = isTemp ? "/api/content-blocks" : `/api/content-blocks/${target.id}`;
      const method = isTemp ? "POST" : "PATCH";
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...target,
          sortOrder:
            hotdealBlocks
              .slice()
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .findIndex((b) => b.id === id) ?? target.sortOrder,
        }),
      });
      if (!res.ok) {
        setSaveState("error");
        return;
      }
      const json = await res.json();
      const saved = json?.item as HotdealBlock;
      if (!saved?.id) {
        setSaveState("error");
        return;
      }
      setHotdealBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...saved } : b)));
      setCollapsedHotdealIds((prev) => {
        if (saved.id === id) return prev;
        const next = { ...prev };
        if (id in next) {
          next[saved.id] = next[id];
          delete next[id];
        }
        return next;
      });
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  };

  const moveHotdealBlock = (id: string, dir: -1 | 1) => {
    setHotdealBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      const to = idx + dir;
      if (idx < 0 || to < 0 || to >= prev.length) return prev;
      const copied = [...prev];
      const [picked] = copied.splice(idx, 1);
      copied.splice(to, 0, picked);
      return copied.map((b, order) => ({ ...b, sortOrder: order }));
    });
    setSaveState("dirty");
  };

  const uploadHotdealImage = async (id: string, file: File | null) => {
    if (!file) return;
    try {
      setSaveState("saving");
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/content-block-image", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        setSaveState("error");
        return;
      }
      const json = await res.json();
      const url = String(json?.url ?? "").trim();
      if (!url) {
        setSaveState("error");
        return;
      }
      updateHotdealBlock(id, { imageUrl: url });
      setSaveState("dirty");
    } catch {
      setSaveState("error");
    }
  };

  const upsertProduct = (id: string, patch: Partial<ProductMaster>) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              ...patch,
              updatedAt: new Date().toISOString(),
            }
          : p,
      ),
    );
    setSaveState("dirty");
  };

  const addProduct = () => {
    const created: ProductMaster = emptyProduct(nextId("p"));
    setProducts((prev) => [created, ...prev]);
    setSelectedProductId(created.id);
    setSaveState("dirty");
  };

  const saveProduct = async (id: string) => {
    const target = products.find((p) => p.id === id);
    if (!target) return;

    setSaveState("saving");
    const exists = savedProducts.some((p) => p.id === id);

    const res = await fetch(exists ? `/api/products/${id}` : "/api/products", {
      method: exists ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(target),
    });

    if (!res.ok) {
      setSaveState("error");
      return;
    }

    const json = await res.json();
    const saved = json?.item as ProductMaster;

    setSavedProducts((prev) => {
      const has = prev.some((p) => p.id === saved.id);
      if (has) return prev.map((p) => (p.id === saved.id ? saved : p));
      return [saved, ...prev];
    });

    setProducts((prev) => prev.map((p) => (p.id === id ? saved : p)));
    setSaveState("saved");
  };

  const removeProduct = async (id: string) => {
    const existedInSaved = savedProducts.some((p) => p.id === id);

    if (existedInSaved) {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (!res.ok) {
        setSaveState("error");
        return;
      }
    }

    setProducts((prev) => prev.filter((p) => p.id !== id));
    setSavedProducts((prev) => prev.filter((p) => p.id !== id));
    if (selectedProductId === id) setSelectedProductId(null);
    setSaveState("dirty");
  };

  const renderSingleForm = (block: SingleLinkBlock) => (
    <div className={styles.formGrid}>
      <label>
        제목
        <input value={block.title} onChange={(e) => updateBlock(block.id, { title: e.target.value })} />
      </label>
      <label>
        URL
        <input value={block.url} onChange={(e) => updateBlock(block.id, { url: e.target.value })} />
      </label>
      <label>
        썸네일 URL
        <input value={block.thumbnailUrl} onChange={(e) => updateBlock(block.id, { thumbnailUrl: e.target.value })} />
      </label>
      <label>
        배지
        <input value={block.badge ?? ""} onChange={(e) => updateBlock(block.id, { badge: e.target.value })} />
      </label>
      <label>
        서브텍스트
        <input value={block.subtext ?? ""} onChange={(e) => updateBlock(block.id, { subtext: e.target.value })} />
      </label>
      <label>
        가격
        <input value={block.price ?? ""} onChange={(e) => updateBlock(block.id, { price: e.target.value })} />
      </label>
      <label>
        할인
        <input value={block.discount ?? ""} onChange={(e) => updateBlock(block.id, { discount: e.target.value })} />
      </label>
      <label>
        카드 크기
        <select value={block.size} onChange={(e) => updateBlock(block.id, { size: e.target.value as SingleLinkBlock["size"] })}>
          <option value="small">small</option>
          <option value="medium">medium</option>
          <option value="large">large</option>
        </select>
      </label>
    </div>
  );

  const renderEditor = () => {
    if (!selected) return null;

    if (selected.type === "profile") {
      return (
        <div className={styles.formGrid}>
          <label>
            프로필 이미지 URL
            <input value={selected.imageUrl} onChange={(e) => updateBlock(selected.id, { imageUrl: e.target.value })} />
          </label>
          <label>
            페이지 타이틀
            <input value={selected.title} onChange={(e) => updateBlock(selected.id, { title: e.target.value })} />
          </label>
          <label>
            소개 문구
            <textarea value={selected.intro} onChange={(e) => updateBlock(selected.id, { intro: e.target.value })} />
          </label>
          <label>
            공지 문구
            <textarea value={selected.notice ?? ""} onChange={(e) => updateBlock(selected.id, { notice: e.target.value })} />
          </label>
        </div>
      );
    }

    if (selected.type === "single") {
      return renderSingleForm(selected);
    }

    return (
      <div className={styles.formGrid}>
        <label>
          그룹 제목
          <input value={selected.title} onChange={(e) => updateBlock(selected.id, { title: e.target.value })} />
        </label>
        <label>
          그룹 설명
          <input value={selected.description ?? ""} onChange={(e) => updateBlock(selected.id, { description: e.target.value })} />
        </label>
        <label className={styles.checkLabel}>
          <input type="checkbox" checked={selected.expandedByDefault} onChange={(e) => updateBlock(selected.id, { expandedByDefault: e.target.checked })} />
          기본 펼침
        </label>
        <div className={styles.groupLinks}>
          <strong>하위 링크</strong>
          {selected.links.map((l) => (
            <div key={l.id} className={styles.groupRow}>
              <input
                value={l.title}
                placeholder="링크 제목"
                onChange={(e) =>
                  updateBlock(selected.id, {
                    links: selected.links.map((item) => (item.id === l.id ? { ...item, title: e.target.value } : item)),
                  })
                }
              />
              <input
                value={l.url}
                placeholder="https://..."
                onChange={(e) =>
                  updateBlock(selected.id, {
                    links: selected.links.map((item) => (item.id === l.id ? { ...item, url: e.target.value } : item)),
                  })
                }
              />
              <button
                type="button"
                onClick={() =>
                  updateBlock(selected.id, {
                    links: selected.links.filter((item) => item.id !== l.id),
                  })
                }
              >
                삭제
              </button>
            </div>
          ))}
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() =>
              updateBlock(selected.id, {
                links: [...selected.links, { id: nextId("gl"), title: "", url: "https://" }],
              })
            }
          >
            + 하위 링크 추가
          </button>
        </div>
      </div>
    );
  };

  const panelBlockList = (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <h3>블록 리스트</h3>
        <span className={styles.summaryHint}>프로필 블록만 사용</span>
      </div>

      <ul className={styles.blockList}>
        {blockLoading ? <li className={styles.blockItem}>불러오는 중...</li> : null}
        {!blockLoading && blocks.map((b) => {
          const error = blockError(b);
          const canReorder = b.type !== "profile";
          return (
            <li
              key={b.id}
              className={`${styles.blockItem} ${selectedId === b.id ? styles.active : ""}`}
              onClick={() => setSelectedId(b.id)}
              draggable={canReorder}
              onDragStart={() => {
                if (!canReorder) return;
                setDragBlockId(b.id);
              }}
              onDragOver={(e) => {
                if (!canReorder) return;
                e.preventDefault();
              }}
              onDrop={() => {
                if (!canReorder) return;
                if (dragBlockId) reorderBlocks(dragBlockId, b.id);
                setDragBlockId(null);
              }}
              onDragEnd={() => setDragBlockId(null)}
            >
              <div className={styles.blockMain}>
                <span>☰ {b.type === "profile" ? "프로필" : b.type === "single" ? "단일링크" : "그룹링크"}</span>
                <button
                  className={styles.eyeBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    updateBlock(b.id, { visible: !b.visible });
                  }}
                >
                  {b.visible ? "👁" : "🙈"}
                </button>
              </div>
              <div className={styles.blockSub}>{b.title || "(제목 없음)"}</div>
              {error ? <span className={styles.errorBadge}>{error}</span> : null}
              <div className={styles.rowActions}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedId(b.id);
                  }}
                >
                  선택
                </button>
              </div>
              {expandedBlockId === b.id ? (
                <div className={styles.inlineEditor} onClick={(e) => e.stopPropagation()}>
                  {b.type === "single" ? renderSingleForm(b) : b.type === "profile" ? (
                    <div className={styles.formGrid}>
                      <label>
                        프로필 이미지 URL
                        <input value={b.imageUrl} onChange={(e) => updateBlock(b.id, { imageUrl: e.target.value })} />
                      </label>
                      <label>
                        페이지 타이틀
                        <input value={b.title} onChange={(e) => updateBlock(b.id, { title: e.target.value })} />
                      </label>
                      <label>
                        소개 문구
                        <textarea value={b.intro} onChange={(e) => updateBlock(b.id, { intro: e.target.value })} />
                      </label>
                      <label>
                        공지 문구
                        <textarea value={b.notice ?? ""} onChange={(e) => updateBlock(b.id, { notice: e.target.value })} />
                      </label>
                    </div>
                  ) : (
                    <div className={styles.formGrid}>
                      <label>
                        그룹 제목
                        <input value={b.title} onChange={(e) => updateBlock(b.id, { title: e.target.value })} />
                      </label>
                      <label>
                        그룹 설명
                        <input value={b.description ?? ""} onChange={(e) => updateBlock(b.id, { description: e.target.value })} />
                      </label>
                    </div>
                  )}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );

  const panelEditor = (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <h3>블록 편집</h3>
        <span>{selected?.type ?? "-"}</span>
      </div>
      {selected ? renderEditor() : <p>블록을 선택해줘.</p>}
    </div>
  );

  const panelPreview = (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <h3>모바일 미리보기</h3>
        <select value={viewport} onChange={(e) => setViewport(e.target.value)}>
          <option value="390px">390px</option>
          <option value="430px">430px</option>
        </select>
      </div>
      <div className={styles.previewShell} style={{ width: viewport }}>
        <div className={styles.previewInner}>
          {visibleBlocks
            .filter((b): b is Extract<Block, { type: "profile" }> => b.type === "profile")
            .map((b) => (
              <section key={b.id} className={styles.previewProfile}>
                <img src={b.imageUrl} alt={b.title} />
                <h4>{b.title}</h4>
                <p>{b.intro}</p>
                {b.notice ? <small>{b.notice}</small> : null}
              </section>
            ))}

          {previewProducts.map((p) => (
            <article key={p.id} className={`${styles.previewCard} ${styles.previewCardMedium}`}>
              <img src={p.thumbAnchor || "https://picsum.photos/seed/new-product/240/240"} alt={p.title || "(이름 없음)"} />
              <div>
                <strong>{`${p.sequenceNo ?? "-"}. ${p.title || "(이름 없음)"}`}</strong>
                {p.subtitle ? <p>{p.subtitle}</p> : null}
                <div className={styles.priceLine}>
                  {p.discountText ? <span>{p.discountText}</span> : null}
                  {p.priceText ? <b>{formatPrice(p.priceText)}</b> : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );

  const panelHotdealBlocks = (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <h3>핫딜 블록</h3>
        <button className={styles.secondaryBtn} onClick={addHotdealBlock}>
          + 핫딜 추가
        </button>
      </div>
      {hotdealLoading ? (
        <p>불러오는 중...</p>
      ) : hotdealBlocks.length === 0 ? (
        <p>등록된 핫딜 블록이 없습니다.</p>
      ) : (
        <ul className={styles.blockList}>
          {hotdealBlocksBySequenceDesc.map((b) => {
            const collapsed = collapsedHotdealIds[b.id] ?? true;
            return (
              <li key={b.id} className={styles.blockItem}>
                <div className={styles.blockMain}>
                  <button
                    type="button"
                    className={styles.hotdealToggleBtn}
                    onClick={() =>
                      setCollapsedHotdealIds((prev) => ({
                        ...prev,
                        [b.id]: !prev[b.id],
                      }))
                    }
                  >
                    <span className={styles.hotdealToggleTitleRow}>
                      <span className={styles.statusPill}>{b.isActive ? "active" : "inactive"}</span>
                      <strong>{b.sequenceNo ?? "-"}. {b.title || "(제목 없음)"}</strong>
                    </span>
                    <span className={styles.hotdealToggleIcon}>{collapsed ? "▸" : "▾"}</span>
                  </button>
                </div>
                {!collapsed ? <div className={styles.formGrid}>
                  <label>
                    제휴 링크(URL)
                    <input value={b.linkUrl} onChange={(e) => updateHotdealBlock(b.id, { linkUrl: e.target.value })} />
                  </label>
                  <label>
                    노출 제목
                    <input value={b.title} onChange={(e) => updateHotdealBlock(b.id, { title: e.target.value })} />
                  </label>
                  <label>
                    서브텍스트
                    <input value={b.subtitle} onChange={(e) => updateHotdealBlock(b.id, { subtitle: e.target.value })} />
                  </label>
                  <div className={styles.thumbInline}>
                    <label>
                      썸네일 업로드
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => uploadHotdealImage(b.id, e.target.files?.[0] ?? null)}
                      />
                    </label>
                    {b.imageUrl ? (
                      <button className={styles.dangerBtn} type="button" onClick={() => updateHotdealBlock(b.id, { imageUrl: "" })}>제거</button>
                    ) : null}
                    {b.imageUrl ? (
                      <div className={styles.thumbPreview}>
                        <img src={b.imageUrl} alt="업로드 썸네일 미리보기" />
                      </div>
                    ) : null}
                  </div>
                  <label>
                    가격 텍스트
                    <input value={b.priceText} onChange={(e) => updateHotdealBlock(b.id, { priceText: e.target.value })} />
                  </label>
                  <label>
                    할인 텍스트
                    <input value={b.discountText} onChange={(e) => updateHotdealBlock(b.id, { discountText: e.target.value })} />
                  </label>
                  <label className={styles.checkLabel}>
                    <input type="checkbox" checked={b.isActive} onChange={(e) => updateHotdealBlock(b.id, { isActive: e.target.checked })} />
                    활성화
                  </label>
                </div> : null}
                {!collapsed ? <div className={styles.rowActions}>
                  <button className={styles.productSaveBtn} onClick={() => saveHotdealBlock(b.id)}>저장</button>
                  <button onClick={() => moveHotdealBlock(b.id, -1)}>위로</button>
                  <button onClick={() => moveHotdealBlock(b.id, 1)}>아래로</button>
                  <button className={styles.dangerBtn} onClick={() => removeHotdealBlock(b.id)}>삭제</button>
                </div> : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  const productsView = (
    <>
      <div className={styles.productsGrid}>
        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <h3>상품 마스터</h3>
            <button className={styles.secondaryBtn} onClick={addProduct}>+ 상품 추가</button>
          </div>
          <input
            className={styles.searchInput}
            placeholder="상품명/키워드 검색"
            value={productQuery}
            onChange={(e) => setProductQuery(e.target.value)}
          />
          {productLoading ? (
            <p>불러오는 중...</p>
          ) : (
            <ul className={styles.blockList}>
              {filteredProducts.map((p) => (
                <li
                  key={p.id}
                  className={`${styles.blockItem} ${selectedProductId === p.id ? styles.active : ""}`}
                  onClick={() => setSelectedProductId(p.id)}
                >
                  <div className={styles.blockMain}>
                    <strong>{p.sequenceNo ? `${p.sequenceNo}. ${p.name || "(이름 없음)"}` : p.name || "(이름 없음)"}</strong>
                    <span className={styles.statusPill}>{p.status}</span>
                  </div>
                  <div className={styles.blockSub}>{p.seedKeyword || "seed_keyword 미입력"}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHead}><h3>상품 편집</h3></div>
          {selectedProduct ? (
            <div className={styles.formGrid}>
              <label>시퀀스 번호<input value={selectedProduct.sequenceNo ?? ""} readOnly /></label>
              <label>상품명<input value={selectedProduct.name} onChange={(e) => upsertProduct(selectedProduct.id, { name: e.target.value })} /></label>
              <label>seed_keyword<input value={selectedProduct.seedKeyword} onChange={(e) => upsertProduct(selectedProduct.id, { seedKeyword: e.target.value })} /></label>
              <label>price_anchor
                <input type="number" inputMode="decimal" step="0.01" value={selectedProduct.priceAnchor} onChange={(e) => upsertProduct(selectedProduct.id, { priceAnchor: e.target.value })} />
              </label>
              <label>thumb_anchor<input value={selectedProduct.thumbAnchor} onChange={(e) => upsertProduct(selectedProduct.id, { thumbAnchor: e.target.value })} /></label>
              <label>브랜드<input value={selectedProduct.brand} onChange={(e) => upsertProduct(selectedProduct.id, { brand: e.target.value })} /></label>
              <label>모델번호<input value={selectedProduct.modelNo} onChange={(e) => upsertProduct(selectedProduct.id, { modelNo: e.target.value })} /></label>
              <label>상태
                <select value={selectedProduct.status} onChange={(e) => upsertProduct(selectedProduct.id, { status: e.target.value as ProductMaster["status"] })}>
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                </select>
              </label>
              <div className={styles.rowActions}>
                <button className={styles.productSaveBtn} onClick={() => saveProduct(selectedProduct.id)}>상품 저장</button>
                <button className={styles.dangerBtn} onClick={() => removeProduct(selectedProduct.id)}>상품 삭제</button>
              </div>
            </div>
          ) : (
            <p>왼쪽에서 상품을 선택하거나 새로 추가해줘.</p>
          )}
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHead}><h3>요약</h3></div>
          <p className={styles.summaryHint}>※ 상품 저장 버튼을 누른 항목만 집계</p>
          <div className={styles.summaryCard}>
            <p>총 상품: <strong>{savedProducts.length}</strong></p>
            <p>활성 상품: <strong>{savedProducts.filter((p) => p.status === "active").length}</strong></p>
            <p>seed 미입력: <strong>{savedProducts.filter((p) => !p.seedKeyword.trim()).length}</strong></p>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <div>
          <strong>{slug}</strong>
          <span className={`${styles.stateBadge} ${styles[saveState]}`}>{statusText}</span>
        </div>
        <div className={styles.topActions}>
          <button className={styles.secondaryBtn} onClick={save}>저장</button>
          <button className={styles.primaryBtn}>발행</button>
        </div>
      </header>

      <div className={styles.tabBar}>
        <button className={activeTab === "blocks" ? styles.tabActive : ""} onClick={() => setActiveTab("blocks")}>블록 편집</button>
        <button className={activeTab === "products" ? styles.tabActive : ""} onClick={() => setActiveTab("products")}>상품 마스터</button>
        <button className={activeTab === "automation" ? styles.tabActive : ""} onClick={() => setActiveTab("automation")}>인스타 자동화</button>
      </div>

      {activeTab === "blocks" ? (
        <>
          <div className={styles.desktopGrid}>
            {panelBlockList}
            {panelEditor}
            {panelPreview}
          </div>
          <div className={styles.desktopGrid}>
            {panelHotdealBlocks}
          </div>

          <div className={styles.mobileOnly}>
            <header className={styles.mobileHeader}>
              <div className={styles.mobileBrand}>링크페이지 편집</div>
            </header>

            <div className={styles.mobileBlockList}>
              {blocks.map((b) => (
                <article
                  key={b.id}
                  className={styles.mobileBlockCard}
                >
                  {b.type !== "profile" ? (
                    <div className={styles.mobileDragRow}>
                      <button
                        type="button"
                        className={styles.mobileMoveBtn}
                        onClick={() => {
                          const idx = blocks.findIndex((x) => x.id === b.id);
                          if (idx > 0) reorderBlocks(b.id, blocks[idx - 1].id);
                        }}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className={styles.mobileMoveBtn}
                        onClick={() => {
                          const idx = blocks.findIndex((x) => x.id === b.id);
                          if (idx >= 0 && idx < blocks.length - 1) reorderBlocks(b.id, blocks[idx + 1].id);
                        }}
                      >
                        ↓
                      </button>
                    </div>
                  ) : null}

                  <div
                    className={styles.mobileBlockHead}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setSelectedId(b.id);
                      setExpandedBlockId((prev) => (prev === b.id ? null : b.id));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedId(b.id);
                        setExpandedBlockId((prev) => (prev === b.id ? null : b.id));
                      }
                    }}
                  >
                    <span className={styles.mobileDrag}>⋮⋮</span>
                    <strong>{b.type === "profile" ? "프로필" : b.type === "single" ? "단일 링크" : "그룹 링크"}</strong>
                    <em>{b.title}</em>
                    <svg
                      className={`${styles.mobileChevron} ${expandedBlockId === b.id ? styles.mobileChevronExpanded : ""}`}
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path d="M7 10l5 5 5-5" />
                    </svg>
                  </div>

                  <div className={styles.mobileCardActions}>
                    {b.type !== "profile" ? (
                      <button
                        type="button"
                        className={styles.dangerBtn}
                        onClick={() => {
                          remove(b.id);
                        }}
                      >
                        삭제
                      </button>
                    ) : null}
                  </div>

                  {expandedBlockId === b.id ? (
                    <div className={styles.mobileInlineForm}>
                      {b.type === "single" ? renderSingleForm(b) : b.type === "profile" ? (
                        <div className={styles.formGrid}>
                          <label>
                            프로필 이미지 URL
                            <input value={b.imageUrl} onChange={(e) => updateBlock(b.id, { imageUrl: e.target.value })} />
                          </label>
                          <label>
                            페이지 타이틀
                            <input value={b.title} onChange={(e) => updateBlock(b.id, { title: e.target.value })} />
                          </label>
                          <label>
                            소개 문구
                            <textarea value={b.intro} onChange={(e) => updateBlock(b.id, { intro: e.target.value })} />
                          </label>
                          <label>
                            공지 문구
                            <textarea value={b.notice ?? ""} onChange={(e) => updateBlock(b.id, { notice: e.target.value })} />
                          </label>
                        </div>
                      ) : (
                        <div className={styles.formGrid}>
                          <label>
                            그룹 제목
                            <input value={b.title} onChange={(e) => updateBlock(b.id, { title: e.target.value })} />
                          </label>
                          <label>
                            그룹 설명
                            <input value={b.description ?? ""} onChange={(e) => updateBlock(b.id, { description: e.target.value })} />
                          </label>
                        </div>
                      )}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>

            <div className={`${styles.mobileBottomActions} ${mobilePreviewOpen ? styles.hiddenOnPreview : ""}`}>
              <button className={styles.previewFab} onClick={() => setMobilePreviewOpen((v) => !v)}>
                👁 미리보기
              </button>
            </div>

            {mobilePreviewOpen ? (
              <div className={styles.mobilePreviewOverlay}>
                <button className={styles.previewCloseFab} onClick={() => setMobilePreviewOpen(false)}>✕ 미리보기 닫기</button>
                <div className={styles.mobilePreviewWrap}>{panelPreview}</div>
              </div>
            ) : null}

            {panelHotdealBlocks}
          </div>

          <footer className={styles.footerBar}>
            <span>{saveState === "dirty" ? "변경사항 있음" : statusText}</span>
            <div>
              <button className={styles.primaryBtn} onClick={save}>저장</button>
            </div>
          </footer>
        </>
      ) : activeTab === "products" ? (
        productsView
      ) : (
        <AutomationPanel />
      )}
    </main>
  );
}
