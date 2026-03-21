"use client";

import { useMemo, useState } from "react";
import styles from "./page.module.css";
import { initialBlocks, type Block, type SingleLinkBlock } from "../../lib/page-data";

type SaveState = "saved" | "dirty" | "saving" | "error";

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
    if (!block.title.trim() || !block.buttonText.trim()) return "필수값 누락";
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
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [selectedId, setSelectedId] = useState(initialBlocks[0].id);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [viewport, setViewport] = useState("390px");
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);
  const [dragBlockId, setDragBlockId] = useState<string | null>(null);

  const selected = blocks.find((b) => b.id === selectedId) ?? blocks[0];

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
    if (hasError) {
      setSaveState("error");
      return;
    }
    setSaveState("saving");
    await new Promise((r) => setTimeout(r, 700));
    setSaveState("saved");
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
        버튼 문구
        <input value={block.buttonText} onChange={(e) => updateBlock(block.id, { buttonText: e.target.value })} />
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
        <div className={styles.addMenu}>
          <button onClick={() => addBlock("profile")}>+ 프로필</button>
          <button onClick={() => addBlock("single")}>+ 단일링크</button>
          <button onClick={() => addBlock("group")}>+ 그룹링크</button>
        </div>
      </div>

      <ul className={styles.blockList}>
        {blocks.map((b) => {
          const error = blockError(b);
          return (
            <li
              key={b.id}
              className={`${styles.blockItem} ${selectedId === b.id ? styles.active : ""}`}
              onClick={() => setSelectedId(b.id)}
              draggable
              onDragStart={() => setDragBlockId(b.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
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
                {b.type === "single" ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedId(b.id);
                      setExpandedBlockId((prev) => (prev === b.id ? null : b.id));
                    }}
                  >
                    {expandedBlockId === b.id ? "접기" : "카드 편집"}
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedId(b.id);
                    }}
                  >
                    선택
                  </button>
                )}
                <button onClick={(e) => { e.stopPropagation(); duplicate(b.id); }}>복제</button>
                {b.type !== "profile" ? (
                  <button onClick={(e) => { e.stopPropagation(); remove(b.id); }}>삭제</button>
                ) : null}
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
          {visibleBlocks.map((b) =>
            b.type === "profile" ? (
              <section key={b.id} className={styles.previewProfile}>
                <img src={b.imageUrl} alt={b.title} />
                <h4>{b.title}</h4>
                <p>{b.intro}</p>
                {b.notice ? <small>{b.notice}</small> : null}
              </section>
            ) : b.type === "single" ? (
              <article key={b.id} className={styles.previewCard}>
                <img src={b.thumbnailUrl} alt={b.title} />
                <div>
                  {b.badge ? <em>{b.badge}</em> : null}
                  <strong>{b.title}</strong>
                  {b.subtext ? <p>{b.subtext}</p> : null}
                  <div className={styles.priceLine}>
                    {b.discount ? <span>{b.discount}</span> : null}
                    {b.price ? <b>{b.price}</b> : null}
                  </div>
                </div>
              </article>
            ) : (
              <section key={b.id} className={styles.previewGroup}>
                <h4>{b.title}</h4>
                {b.description ? <p>{b.description}</p> : null}
                <ul>
                  {b.links.map((l) => (
                    <li key={l.id}>{l.title || "(제목 없음)"}</li>
                  ))}
                </ul>
              </section>
            ),
          )}
        </div>
      </div>
    </div>
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

      <div className={styles.desktopGrid}>
        {panelBlockList}
        {panelEditor}
        {panelPreview}
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
              draggable
              onDragStart={() => setDragBlockId(b.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragBlockId) reorderBlocks(dragBlockId, b.id);
                setDragBlockId(null);
              }}
              onDragEnd={() => setDragBlockId(null)}
            >
              <button
                className={styles.mobileBlockHead}
                onClick={() => {
                  setSelectedId(b.id);
                  setExpandedBlockId((prev) => (prev === b.id ? null : b.id));
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
              </button>

              <div className={styles.mobileCardActions}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const idx = blocks.findIndex((x) => x.id === b.id);
                    if (idx > 0) reorderBlocks(b.id, blocks[idx - 1].id);
                  }}
                >
                  위로
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const idx = blocks.findIndex((x) => x.id === b.id);
                    if (idx >= 0 && idx < blocks.length - 1) reorderBlocks(b.id, blocks[idx + 1].id);
                  }}
                >
                  아래로
                </button>
                {b.type !== "profile" ? (
                  <button
                    className={styles.dangerBtn}
                    onClick={(e) => {
                      e.stopPropagation();
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
          <button className={styles.addFab} onClick={() => addBlock("single")}>＋ 블록 추가</button>
        </div>

        {mobilePreviewOpen ? (
          <div className={styles.mobilePreviewOverlay}>
            <button className={styles.previewCloseFab} onClick={() => setMobilePreviewOpen(false)}>✕ 미리보기 닫기</button>
            <div className={styles.mobilePreviewWrap}>{panelPreview}</div>
          </div>
        ) : null}
      </div>

      <footer className={styles.footerBar}>
        <span>{saveState === "dirty" ? "변경사항 있음" : statusText}</span>
        <div>
          <button className={styles.secondaryBtn} onClick={() => addBlock("single")}>+ 블록 추가</button>
          <button className={styles.primaryBtn} onClick={save}>저장</button>
        </div>
      </footer>
    </main>
  );
}
