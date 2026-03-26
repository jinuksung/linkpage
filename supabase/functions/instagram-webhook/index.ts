// Supabase Edge Function: instagram-webhook
// Handles Meta webhook verification (GET) + comment events (POST)
// Deploy: supabase functions deploy instagram-webhook --no-verify-jwt

const VERIFY_TOKEN = Deno.env.get("IG_VERIFY_TOKEN") ?? "";
const GRAPH_VERSION = Deno.env.get("IG_GRAPH_VERSION") ?? "v22.0";
const GRAPH_ACCESS_TOKEN = Deno.env.get("IG_GRAPH_ACCESS_TOKEN") ?? "";
const AUTO_REPLY_TEXT =
  Deno.env.get("IG_AUTO_REPLY_TEXT") ?? "확인했어요 🙌 DM으로 안내드렸습니다!";
const AUTO_DM_TEXT =
  Deno.env.get("IG_AUTO_DM_TEXT") ?? "문의 주셔서 감사합니다! 요청하신 정보를 DM으로 보내드려요 🙂";
const KEYWORD_REGEX = new RegExp(
  Deno.env.get("IG_KEYWORD_REGEX") ?? "(링크|정보|가격|구매)",
  "i",
);
const DEBUG = (Deno.env.get("IG_WEBHOOK_DEBUG") ?? "false") === "true";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

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
    // no-op
  }
}

async function graphPost(path: string, body: Record<string, unknown>) {
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${path}`);

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...body, access_token: GRAPH_ACCESS_TOKEN }),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Graph API error (${res.status}): ${JSON.stringify(payload)}`);
  }
  return payload;
}

async function replyComment(commentId: string, message: string) {
  // POST /{comment-id}/replies
  return graphPost(`${commentId}/replies`, { message });
}

async function sendDm(igScopedUserId: string, text: string) {
  // POST /me/messages (Instagram Messaging)
  // NOTE: This only works within Meta policy windows/eligibility.
  return graphPost("me/messages", {
    recipient: { id: igScopedUserId },
    message: { text },
    messaging_type: "RESPONSE",
  });
}

async function sendPrivateReply(commentId: string, text: string) {
  // POST /{comment-id}/private_replies
  return graphPost(`${commentId}/private_replies`, { message: text });
}

function extractCommentEvent(change: any): {
  commentId: string;
  fromUserId: string;
  text: string;
} | null {
  const value = change?.value;
  if (!value) return null;

  const field = String(change?.field ?? "");
  if (field && !["comments", "mentions", "messages"].includes(field)) return null;

  const commentId = String(value?.id ?? value?.comment_id ?? "").trim();
  const fromUserId = String(value?.from?.id ?? value?.sender?.id ?? "").trim();
  const text = String(value?.text ?? value?.message ?? "").trim();

  if (!commentId || !fromUserId) return null;
  return { commentId, fromUserId, text };
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);

    // 1) Webhook verification (Meta sends GET with challenge)
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

    // 2) Event receive
    const body = await req.json().catch(() => null);
    if (!body) return json({ ok: false, error: "invalid-json" }, 400);

    // Always ack quickly to avoid webhook retries.
    // We still process inline here for simplicity.
    const entries = Array.isArray(body?.entry) ? body.entry : [];
    const processed: Array<Record<string, unknown>> = [];

    if (DEBUG) {
      console.log("[instagram-webhook] body", JSON.stringify(body));
    }
    await logWebhook("received", body);

    // Guardrails
    if (!GRAPH_ACCESS_TOKEN) {
      return json({ ok: false, error: "missing IG_GRAPH_ACCESS_TOKEN" }, 500);
    }

    for (const entry of entries) {
      const changes = Array.isArray(entry?.changes) ? entry.changes : [];
      for (const change of changes) {
        const parsed = extractCommentEvent(change);
        if (!parsed) continue;

        const { commentId, fromUserId, text } = parsed;
        const entryAccountId = String(entry?.id ?? "").trim();

        // Ignore comments/replies authored by the same IG account to avoid loop.
        if (entryAccountId && fromUserId === entryAccountId) {
          processed.push({ commentId, action: "skip", reason: "self-comment" });
          continue;
        }

        const matched = KEYWORD_REGEX.test(text);
        if (!matched) {
          processed.push({ commentId, action: "skip", reason: "keyword-not-matched", text });
          continue;
        }

        const errors: string[] = [];

        try {
          await replyComment(commentId, AUTO_REPLY_TEXT);
        } catch (e) {
          errors.push(`reply:${String(e)}`);
        }

        try {
          await sendPrivateReply(commentId, AUTO_DM_TEXT);
        } catch (e) {
          errors.push(`private_reply:${String(e)}`);
          try {
            await sendDm(fromUserId, AUTO_DM_TEXT);
          } catch (dmErr) {
            errors.push(`dm:${String(dmErr)}`);
          }
        }

        if (errors.length) {
          await logWebhook("delivery_error", { commentId, fromUserId, text }, errors.join(" | "));
        }

        processed.push({ commentId, fromUserId, action: errors.length ? "attempted-with-errors" : "replied+dm", errors });
      }
    }

    return json({ ok: true, processed });
  } catch (err) {
    console.error(err);
    await logWebhook("handler_exception", { ok: false }, String(err));
    // Meta retries aggressively if non-200. Return 200 with error payload for stability.
    return json({ ok: false, error: String(err) }, 200);
  }
});
