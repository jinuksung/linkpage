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

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
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

function extractCommentEvent(change: any): {
  commentId: string;
  fromUserId: string;
  text: string;
} | null {
  // Payload shape can vary by subscription.
  // This parser supports common fields and safely no-ops otherwise.
  const value = change?.value;
  if (!value) return null;

  const commentId = String(value?.id ?? "").trim();
  const fromUserId = String(value?.from?.id ?? "").trim();
  const text = String(value?.text ?? "").trim();

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

        // Simple keyword gate. Replace with DB-driven rule if needed.
        const matched = KEYWORD_REGEX.test(text);
        if (!matched) {
          processed.push({ commentId, action: "skip", reason: "keyword-not-matched" });
          continue;
        }

        // TODO: add dedupe/cooldown check (Supabase table) before sending.
        await replyComment(commentId, AUTO_REPLY_TEXT);
        await sendDm(fromUserId, AUTO_DM_TEXT);

        processed.push({ commentId, fromUserId, action: "replied+dm" });
      }
    }

    return json({ ok: true, processed });
  } catch (err) {
    console.error(err);
    // Meta retries aggressively if non-200. Return 200 with error payload for stability.
    return json({ ok: false, error: String(err) }, 200);
  }
});
