"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./page.module.css";
import { emptyAffiliateLink, emptyAutomationRule, type AffiliateLink, type AutomationRule } from "../../lib/automation";

const nextId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 8)}`;

export default function AutomationPanel() {
  const [links, setLinks] = useState<AffiliateLink[]>([]);
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [savedLinks, setSavedLinks] = useState<AffiliateLink[]>([]);
  const [savedRules, setSavedRules] = useState<AutomationRule[]>([]);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
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
        setSavedLinks(loadedLinks);
        setSavedRules(loadedRules);
        setSelectedLinkId((prev) => prev ?? loadedLinks[0]?.id ?? null);
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

  const selectedLink = links.find((l) => l.id === selectedLinkId) ?? null;
  const selectedRule = rules.find((r) => r.id === selectedRuleId) ?? null;

  const accountScopedLinks = useMemo(() => {
    if (!selectedRule) return links;
    return links.filter((l) => l.igAccount === selectedRule.igAccount && l.status === "active");
  }, [links, selectedRule]);

  const upsertLink = (id: string, patch: Partial<AffiliateLink>) => {
    setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch, updatedAt: new Date().toISOString() } : l)));
  };

  const upsertRule = (id: string, patch: Partial<AutomationRule>) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r)));
  };

  const addLink = () => {
    const created = emptyAffiliateLink(nextId("link"));
    setLinks((prev) => [created, ...prev]);
    setSelectedLinkId(created.id);
  };

  const addRule = () => {
    const created = emptyAutomationRule(nextId("rule"));
    setRules((prev) => [created, ...prev]);
    setSelectedRuleId(created.id);
  };

  const saveLink = async (id: string) => {
    const target = links.find((l) => l.id === id);
    if (!target) return;
    const exists = savedLinks.some((l) => l.id === id);

    const res = await fetch(exists ? `/api/automation/links/${id}` : "/api/automation/links", {
      method: exists ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(target),
    });
    if (!res.ok) return;

    const json = await res.json();
    const saved = json.item as AffiliateLink;
    setLinks((prev) => prev.map((l) => (l.id === id ? saved : l)));
    setSavedLinks((prev) => (prev.some((l) => l.id === saved.id) ? prev.map((l) => (l.id === saved.id ? saved : l)) : [saved, ...prev]));
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

  const deleteLink = async (id: string) => {
    if (savedLinks.some((l) => l.id === id)) {
      await fetch(`/api/automation/links/${id}`, { method: "DELETE" });
    }
    setLinks((prev) => prev.filter((l) => l.id !== id));
    setSavedLinks((prev) => prev.filter((l) => l.id !== id));
    if (selectedLinkId === id) setSelectedLinkId(null);
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
        <div className={styles.panelHead}>
          <h3>제휴 링크</h3>
          <button className={styles.secondaryBtn} onClick={addLink}>+ 링크 추가</button>
        </div>
        {loading ? <p>불러오는 중...</p> : (
          <ul className={styles.blockList}>
            {links.map((l) => (
              <li key={l.id} className={`${styles.blockItem} ${selectedLinkId === l.id ? styles.active : ""}`} onClick={() => setSelectedLinkId(l.id)}>
                <div className={styles.blockMain}><strong>{l.label || "(이름 없음)"}</strong><span className={styles.statusPill}>{l.igAccount}</span></div>
                <div className={styles.blockSub}>{l.url}</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles.panel}>
        <div className={styles.panelHead}><h3>링크 편집</h3></div>
        {selectedLink ? (
          <div className={styles.formGrid}>
            <label>계정
              <select value={selectedLink.igAccount} onChange={(e) => upsertLink(selectedLink.id, { igAccount: e.target.value as AffiliateLink["igAccount"] })}>
                <option value="hotbeaverdeals">hotbeaverdeals</option>
                <option value="hotorideals">hotorideals</option>
              </select>
            </label>
            <label>라벨<input value={selectedLink.label} onChange={(e) => upsertLink(selectedLink.id, { label: e.target.value })} /></label>
            <label>URL<input value={selectedLink.url} onChange={(e) => upsertLink(selectedLink.id, { url: e.target.value })} /></label>
            <label>상태
              <select value={selectedLink.status} onChange={(e) => upsertLink(selectedLink.id, { status: e.target.value as AffiliateLink["status"] })}>
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </select>
            </label>
            <div className={styles.rowActions}>
              <button className={styles.productSaveBtn} onClick={() => saveLink(selectedLink.id)}>링크 저장</button>
              <button className={styles.dangerBtn} onClick={() => deleteLink(selectedLink.id)}>삭제</button>
            </div>
          </div>
        ) : <p>왼쪽에서 링크를 선택해줘.</p>}
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

        {selectedRule ? (
          <div className={styles.formGrid} style={{ marginTop: 12 }}>
            <label>계정
              <select value={selectedRule.igAccount} onChange={(e) => upsertRule(selectedRule.id, { igAccount: e.target.value as AutomationRule["igAccount"] })}>
                <option value="hotbeaverdeals">hotbeaverdeals</option>
                <option value="hotorideals">hotorideals</option>
              </select>
            </label>
            <label>게시물 media_id<input value={selectedRule.mediaId} onChange={(e) => upsertRule(selectedRule.id, { mediaId: e.target.value })} /></label>
            <label>트리거
              <select value={selectedRule.triggerMode} onChange={(e) => upsertRule(selectedRule.id, { triggerMode: e.target.value as AutomationRule["triggerMode"] })}>
                <option value="keyword">특정 키워드</option>
                <option value="any">아무 댓글이나</option>
              </select>
            </label>
            {selectedRule.triggerMode === "keyword" ? (
              <label>키워드 정규식<input value={selectedRule.keywordRegex} onChange={(e) => upsertRule(selectedRule.id, { keywordRegex: e.target.value })} placeholder="링크|정보|가격" /></label>
            ) : null}
            <label>DM 문구
              <textarea value={selectedRule.dmTemplate} onChange={(e) => upsertRule(selectedRule.id, { dmTemplate: e.target.value })} placeholder="{{link}} 토큰 사용 가능" />
            </label>
            <label>제휴링크 선택
              <select value={selectedRule.affiliateLinkId} onChange={(e) => upsertRule(selectedRule.id, { affiliateLinkId: e.target.value })}>
                <option value="">선택</option>
                {accountScopedLinks.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
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
        ) : null}
      </div>
    </div>
  );
}
