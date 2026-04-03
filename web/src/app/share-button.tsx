"use client";

import { useState } from "react";

export default function ShareButton({ className, iconClassName }: { className?: string; iconClassName?: string }) {
  const [label, setLabel] = useState("공유하기");
  const [busy, setBusy] = useState(false);

  const resetLabelSoon = (nextLabel: string) => {
    setLabel(nextLabel);
    window.setTimeout(() => setLabel("공유하기"), 1800);
  };

  const onShare = async () => {
    if (busy) return;
    setBusy(true);
    const url = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({ title: document.title, url });
        resetLabelSoon("공유 완료");
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        resetLabelSoon("링크 복사됨");
        return;
      }

      window.prompt("이 링크를 복사해 공유하세요", url);
      resetLabelSoon("링크 준비됨");
    } catch {
      resetLabelSoon("공유 취소됨");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button className={className} aria-label="공유하기" onClick={onShare} type="button">
      <svg className={iconClassName} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M14 4H20V10" />
        <path d="M20 4L11 13" />
        <path d="M20 14V18C20 19.1 19.1 20 18 20H6C4.9 20 4 19.1 4 18V6C4 4.9 4.9 4 6 4H10" />
      </svg>
      {label}
    </button>
  );
}
