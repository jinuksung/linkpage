"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./page.module.css";
import { emptyAutomationRule, type AffiliateLink, type AutomationRule } from "../../lib/automation";

type IgPost = {
  id: string;
  caption: string;
  mediaType: string;
  mediaUrl: string;
  thumbnailUrl: string;
  permalink: string;
  timestamp: string;
};

const nextId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 8)}`;

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const keywordCsvToRegex = (value: string) => {
  const parts = value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, 10)
    .map(escapeRegex);
  return parts.join("|");
};

const regexToKeywordCsv = (value: string) =>
  value
    .split("|")
    .map((v) => v.replace(/\\([.*+?^${}()|[\]\\])/g, "$1").trim())
    .filter(Boolean)
    .join(", ");

export default function AutomationPanel() {
  const [links, setLinks] = useState<AffiliateLink[]>([]);
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [savedRules, setSavedRules] = useState<AutomationRule[]>([]);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [posts, setPosts] = useState<IgPost[]>([]);
  const [postLoading, setPostLoading] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const [linksRes, rulesRes] = await Promise.all([
          fetch("/api/automation/links", { cache: "no-store" }),
          fetch("/api/automation/rules", { cache: "no-store" }),
        ]);
        const [linksJson, rulesJson] = await Promise.all([linksRes.json(), rulesRes.json()]);
        if (!alive) return;

        const loadedLinks: AffiliateLink[] = Array.isArray(linksJson?.items) ? linksJson.items : [];
        const loadedRules: AutomationRule[] = Array.isArray(rulesJson?.items) ? rulesJson.items : [];
        setLinks(loadedLinks);
        setRules(loadedRules);
        setSavedRules(loadedRules);
        setSelectedRuleId((prev) => prev ?? loadedRules[0]?.id ?? null);
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, []);

  const selectedRule = rules.find((r) => r.id === selectedRuleId) ?? null;

  const activeLinks = useMemo(() => links.filter((l) => l.status === "active"), [links]);

  const loadPosts = async (igAccount: AutomationRule["igAccount"]) => {
    setPostLoading(true);
    setPostError(null);
    try {
      const res = await fetch(`/api/automation/posts?igAccount=${igAccount}&limit=20`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        setPosts([]);
        setPostError(String(json?.error ?? "게시물 조회 실패"));
        return;
      }
      const items: IgPost[] = Array.isArray(json?.items) ? json.items : [];
      setPosts(items);
      if (!items.length) {
        setPostError("게시물이 없거나 접근 권한이 없습니다.");
      }
    } catch (e) {
      setPosts([]);
      setPostError(e instanceof Error ? e.message : "게시물 조회 실패");
    } finally {
      setPostLoading(false);
    }
  };

  const upsertRule = (id: string, patch: Partial<AutomationRule>) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r)));
  };

  useEffect(() => {
    if (!selectedRule) {
      setPosts([]);
      return;
    }
    loadPosts(selectedRule.igAccount);
  }, [selectedRule?.id, selectedRule?.igAccount]);

  const addRule = () => {
    const created = emptyAutomationRule(nextId("rule"));
    setRules((prev) => [created, ...prev]);
    setSelectedRuleId(created.id);
  };

  const saveRule = async (id: string) => {
    const target = rules.find((r) => r.id === id);
    if (!target) return;
    const exists = savedRules.some((r) => r.id === id);

    const payload = {
      ...target,
      replyVariants: target.replyVariants.map((v) => v.trim()).filter(Boolean).slice(0, 3),
    };

    const res = await fetch(exists ? `/api/automation/rules/${id}` : "/api/automation/rules", {
      method: exists ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return;

    const json = await res.json();
    const saved = json.item as AutomationRule;
    setRules((prev) => prev.map((r) => (r.id === id ? saved : r)));
    setSavedRules((prev) => (prev.some((r) => r.id === saved.id) ? prev.map((r) => (r.id === saved.id ? saved : r)) : [saved, ...prev]));
  };

  const deleteRule = async (id: string) => {
    if (savedRules.some((r) => r.id === id)) {
      await fetch(`/api/automation/rules/${id}`, { method: "DELETE" });
    }
    setRules((prev) => prev.filter((r) => r.id !== id));
    setSavedRules((prev) => prev.filter((r) => r.id !== id));
    if (selectedRuleId === id) setSelectedRuleId(null);
  };

  return (
    <div className={styles.productsGrid}>
      <div className={styles.panel}>
        <div className={styles.panelHead}><h3>DM 링크 후보 (affiliate_links 현재값)</h3></div>
        <p className={styles.summaryHint}>여긴 읽기 전용. 상품 링크 갱신은 기존 affiliate_links 파이프라인을 사용.</p>
        {loading ? <p>불러오는 중...</p> : (
          <ul className={styles.blockList}>
            {activeLinks.map((l) => (
              <li key={l.id} className={styles.blockItem}>
                <div className={styles.blockMain}><strong>{l.label || "(이름 없음)"}</strong></div>
                <div className={styles.blockSub}>{l.url}</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles.panel}>
        <div className={styles.panelHead}>
          <h3>자동화 룰</h3>
          <button className={styles.secondaryBtn} onClick={addRule}>+ 룰 추가</button>
        </div>
        <ul className={styles.blockList}>
          {rules.map((r) => (
            <li key={r.id} className={`${styles.blockItem} ${selectedRuleId === r.id ? styles.active : ""}`} onClick={() => setSelectedRuleId(r.id)}>
              <div className={styles.blockMain}><strong>{r.mediaId || "(media_id 없음)"}</strong><span className={styles.statusPill}>{r.triggerMode}</span></div>
              <div className={styles.blockSub}>{r.igAccount}</div>
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.panel}>
        <div className={styles.panelHead}><h3>룰 편집</h3></div>
        {selectedRule ? (
          <div className={styles.formGrid}>
            <label>계정
              <select value={selectedRule.igAccount} onChange={(e) => upsertRule(selectedRule.id, { igAccount: e.target.value as AutomationRule["igAccount"] })}>
                <option value="hotbeaverdeals">hotbeaverdeals</option>
                <option value="hotorideals">hotorideals</option>
              </select>
            </label>
            <label>게시물 media_id<input value={selectedRule.mediaId} onChange={(e) => upsertRule(selectedRule.id, { mediaId: e.target.value })} /></label>
            <div className={styles.rowActions}>
              <button type="button" onClick={() => loadPosts(selectedRule.igAccount)} className={styles.secondaryBtn}>최근 게시물 불러오기</button>
            </div>
            {postLoading ? <p className={styles.summaryHint}>게시물 불러오는 중...</p> : (
              <div className={styles.groupLinks}>
                <strong>게시물 선택</strong>
                {postError ? <p className={styles.errorBadge}>{postError}</p> : null}
                <div className={styles.blockList}>
                  {posts.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`${styles.blockItem} ${selectedRule.mediaId === p.id ? styles.active : ""}`}
                      onClick={() => upsertRule(selectedRule.id, { mediaId: p.id })}
                    >
                      <div className={styles.blockMain}>
                        <span>{new Date(p.timestamp).toLocaleDateString()}</span>
                        <span className={styles.statusPill}>{p.mediaType}</span>
                      </div>
                      <div className={styles.blockSub}>{p.caption ? p.caption.slice(0, 90) : "(캡션 없음)"}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <label>트리거
              <select value={selectedRule.triggerMode} onChange={(e) => upsertRule(selectedRule.id, { triggerMode: e.target.value as AutomationRule["triggerMode"] })}>
                <option value="keyword">특정 키워드</option>
                <option value="any">아무 댓글이나</option>
              </select>
            </label>
            {selectedRule.triggerMode === "keyword" ? (
              <>
                <label>자동 DM 키워드(쉼표 구분)
                  <input
                    value={regexToKeywordCsv(selectedRule.keywordRegex)}
                    onChange={(e) => upsertRule(selectedRule.id, { keywordRegex: keywordCsvToRegex(e.target.value) })}
                    placeholder="링크, 정보, 가격"
                  />
                </label>
                <label>키워드 정규식(고급)
                  <input
                    value={selectedRule.keywordRegex}
                    onChange={(e) => upsertRule(selectedRule.id, { keywordRegex: e.target.value })}
                    placeholder="링크|정보|가격"
                  />
                </label>
              </>
            ) : null}
            <label>DM 문구
              <textarea value={selectedRule.dmTemplate} onChange={(e) => upsertRule(selectedRule.id, { dmTemplate: e.target.value })} placeholder="{{link}} 토큰 사용 가능" />
            </label>
            <label>DM 버튼 문구
              <input value={selectedRule.dmButtonText ?? ""} onChange={(e) => upsertRule(selectedRule.id, { dmButtonText: e.target.value })} placeholder="지금 보러가기" />
              <span className={styles.summaryHint}>버튼 클릭 시 선택한 제휴 링크로 이동</span>
            </label>
            <label>제휴링크 선택
              <select value={selectedRule.affiliateLinkId} onChange={(e) => upsertRule(selectedRule.id, { affiliateLinkId: e.target.value })}>
                <option value="">선택</option>
                {activeLinks.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
              </select>
            </label>
            <label>대댓글 문구 1
              <input value={selectedRule.replyVariants[0] ?? ""} onChange={(e) => upsertRule(selectedRule.id, { replyVariants: [e.target.value, selectedRule.replyVariants[1] ?? "", selectedRule.replyVariants[2] ?? ""] })} />
            </label>
            <label>대댓글 문구 2
              <input value={selectedRule.replyVariants[1] ?? ""} onChange={(e) => upsertRule(selectedRule.id, { replyVariants: [selectedRule.replyVariants[0] ?? "", e.target.value, selectedRule.replyVariants[2] ?? ""] })} />
            </label>
            <label>대댓글 문구 3
              <input value={selectedRule.replyVariants[2] ?? ""} onChange={(e) => upsertRule(selectedRule.id, { replyVariants: [selectedRule.replyVariants[0] ?? "", selectedRule.replyVariants[1] ?? "", e.target.value] })} />
            </label>
            <label>상태
              <select value={selectedRule.status} onChange={(e) => upsertRule(selectedRule.id, { status: e.target.value as AutomationRule["status"] })}>
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </select>
            </label>
            <div className={styles.rowActions}>
              <button className={styles.productSaveBtn} onClick={() => saveRule(selectedRule.id)}>룰 저장</button>
              <button className={styles.dangerBtn} onClick={() => deleteRule(selectedRule.id)}>삭제</button>
            </div>
          </div>
        ) : <p>룰을 선택해줘.</p>}
      </div>
    </div>
  );
}
