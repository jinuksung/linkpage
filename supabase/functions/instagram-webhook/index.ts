// Supabase Edge Function: instagram-webhook (minimal stable mode)
// - GET: webhook verify
// - POST: on comment event, send public reply only

const VERIFY_TOKEN = Deno.env.get("IG_VERIFY_TOKEN") ?? "";
const GRAPH_VERSION = Deno.env.get("IG_GRAPH_VERSION") ?? "v22.0";
const GRAPH_ACCESS_TOKEN = Deno.env.get("IG_GRAPH_ACCESS_TOKEN") ?? "";
const AUTO_REPLY_TEXT =
  Deno.env.get("IG_AUTO_REPLY_TEXT") ?? "확인했어요 🙌";
const KEYWORD_REGEX = new RegExp(
  Deno.env.get("IG_KEYWORD_REGEX") ?? ".*",
  "i",
);
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

type RuleRow = {
  id: string;
  trigger_mode: "keyword" | "any";
  keyword_regex: string | null;
  reply_variants: string[] | null;
  dm_template: string | null;
  dm_button_link_mode: "affiliate" | "manual" | null;
  dm_button_url: string | null;
  affiliate_link_id: string | null;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

async function logWebhook(stage: string, payload: unknown, error?: string) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/ig_webhook_events`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ stage, payload, error: error ?? null }),
    });
  } catch {
    // ignore
  }
}

async function claimCommentForReply(commentId: string, mediaId: string | null, ruleId?: string): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return true;
  try {
    const url = new URL(`${SUPABASE_URL}/rest/v1/ig_comment_reply_logs`);
    url.searchParams.set("on_conflict", "comment_id");

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        Prefer: "resolution=ignore-duplicates,return=representation",
      },
      body: JSON.stringify([{ comment_id: commentId, media_id: mediaId, rule_id: ruleId ?? null }]),
    });

    const data = await res.json().catch(() => []);
    return Array.isArray(data) && data.length > 0;
  } catch {
    return true;
  }
}

async function sendDm(igScopedUserId: string, text: string) {
  return graphPost("me/messages", {
    recipient: JSON.stringify({ id: igScopedUserId }),
    message: JSON.stringify({ text }),
    messaging_type: "RESPONSE",
  });
}

async function resolveAffiliateUrl(affiliateLinkId: string | null): Promise<string | null> {
  if (!affiliateLinkId || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  try {
    const url = new URL(`${SUPABASE_URL}/rest/v1/affiliate_links`);
    url.searchParams.set("select", "url");
    url.searchParams.set("id", `eq.${affiliateLinkId}`);
    url.searchParams.set("limit", "1");
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });
    const rows = await res.json().catch(() => []);
    if (!Array.isArray(rows) || !rows.length) return null;
    const found = String(rows[0]?.url ?? "").trim();
    return found || null;
  } catch {
    return null;
  }
}

async function pickRuleReply(mediaId: string | null, text: string): Promise<{ replyText: string; rule?: RuleRow }> {
  if (!mediaId || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return { replyText: AUTO_REPLY_TEXT };
  }

  try {
    const url = new URL(`${SUPABASE_URL}/rest/v1/ig_automation_rules`);
    url.searchParams.set("select", "id,trigger_mode,keyword_regex,reply_variants,dm_template,dm_button_link_mode,dm_button_url,affiliate_link_id");
    url.searchParams.set("media_id", `eq.${mediaId}`);
    url.searchParams.set("status", "eq.active");
    url.searchParams.set("limit", "20");

    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });

    const rows = (await res.json().catch(() => [])) as RuleRow[];
    if (!Array.isArray(rows) || !rows.length) return { replyText: AUTO_REPLY_TEXT };

    const matched = rows.find((r) => {
      if (r.trigger_mode === "any") return true;
      const pattern = String(r.keyword_regex ?? "").trim();
      if (!pattern) return false;
      try {
        return new RegExp(pattern, "i").test(text);
      } catch {
        return false;
      }
    });

    if (!matched) return { replyText: AUTO_REPLY_TEXT };

    const variants = Array.isArray(matched.reply_variants)
      ? matched.reply_variants.map((v) => String(v ?? "").trim()).filter(Boolean)
      : [];

    if (!variants.length) return { replyText: AUTO_REPLY_TEXT, rule: matched };

    const replyText = variants[Math.floor(Math.random() * variants.length)];
    return { replyText, rule: matched };
  } catch {
    return { replyText: AUTO_REPLY_TEXT };
  }
}

async function graphPost(path: string, body: Record<string, unknown>) {
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${path}`);
  const form = new URLSearchParams();
  for (const [k, v] of Object.entries(body)) {
    form.set(k, String(v ?? ""));
  }
  form.set("access_token", GRAPH_ACCESS_TOKEN);

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Graph API error (${res.status}): ${JSON.stringify(payload)}`);
  }
  return payload;
}

async function replyComment(mediaId: string | null, commentId: string, message: string) {
  // Try comment replies endpoint first.
  try {
    return await graphPost(`${commentId}/replies`, { message });
  } catch {
    // Fallback for IG media comments endpoint.
    if (!mediaId) throw new Error("missing mediaId for fallback reply");
    return graphPost(`${mediaId}/comments`, { message, reply_to_comment_id: commentId });
  }
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);

    if (req.method === "GET") {
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");

      if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
        return new Response(challenge, { status: 200 });
      }
      return new Response("Forbidden", { status: 403 });
    }

    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    if (!GRAPH_ACCESS_TOKEN) {
      return json({ ok: false, error: "missing IG_GRAPH_ACCESS_TOKEN" }, 500);
    }

    const body = await req.json().catch(() => null);
    if (!body) return json({ ok: false, error: "invalid-json" }, 400);
    await logWebhook("received", body);

    const processed: Array<Record<string, unknown>> = [];
    const entries = Array.isArray(body?.entry) ? body.entry : [];

    for (const entry of entries) {
      const entryAccountId = String(entry?.id ?? "").trim();
      const changes = Array.isArray(entry?.changes) ? entry.changes : [];

      for (const change of changes) {
        if (String(change?.field ?? "") !== "comments") continue;

        const value = change?.value;
        const commentId = String(value?.id ?? "").trim();
        const mediaIdRaw = String(value?.media?.id ?? "").trim();
        const mediaId = mediaIdRaw || null;
        const fromUserId = String(value?.from?.id ?? "").trim();
        const text = String(value?.text ?? "").trim();

        if (!commentId || !fromUserId) continue;
        if (entryAccountId && fromUserId === entryAccountId) {
          processed.push({ commentId, action: "skip", reason: "self-comment" });
          continue;
        }
        if (!KEYWORD_REGEX.test(text)) {
          processed.push({ commentId, action: "skip", reason: "keyword-not-matched" });
          continue;
        }

        const { replyText, rule } = await pickRuleReply(mediaId, text);
        const claimed = await claimCommentForReply(commentId, mediaId, rule?.id);
        if (!claimed) {
          processed.push({ commentId, action: "skip", reason: "duplicate-comment" });
          continue;
        }

        try {
          await replyComment(mediaId, commentId, replyText);

          if (rule) {
            const link = rule.dm_button_link_mode === "manual"
              ? String(rule.dm_button_url ?? "").trim() || null
              : await resolveAffiliateUrl(rule.affiliate_link_id ?? null);
            const dmTemplate = String(rule.dm_template ?? "").trim();
            const dmText = (dmTemplate || "문의 주셔서 감사합니다! {{link}}")
              .replaceAll("{{link}}", link ?? "")
              .trim();

            if (dmText) {
              try {
                await sendDm(fromUserId, dmText);
              } catch (dmErr) {
                await logWebhook("delivery_error", { commentId, mediaId, fromUserId, step: "dm", ruleId: rule.id }, String(dmErr));
              }
            }
          }

          await logWebhook("replied", { commentId, mediaId, fromUserId, text, ruleId: rule?.id ?? null, replyText });
          processed.push({ commentId, mediaId, fromUserId, ruleId: rule?.id ?? null, action: "replied" });
        } catch (e) {
          const err = String(e);
          await logWebhook("delivery_error", { commentId, mediaId, fromUserId, text }, err);
          processed.push({ commentId, fromUserId, action: "reply-failed", error: err });
        }
      }
    }

    return json({ ok: true, processed });
  } catch (err) {
    console.error(err);
    return json({ ok: false, error: String(err) }, 200);
  }
});
