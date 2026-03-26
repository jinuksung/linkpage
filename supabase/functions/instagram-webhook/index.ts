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
  return graphPost(`${commentId}/replies`, { message });
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

    const processed: Array<Record<string, unknown>> = [];
    const entries = Array.isArray(body?.entry) ? body.entry : [];

    for (const entry of entries) {
      const entryAccountId = String(entry?.id ?? "").trim();
      const changes = Array.isArray(entry?.changes) ? entry.changes : [];

      for (const change of changes) {
        if (String(change?.field ?? "") !== "comments") continue;

        const value = change?.value;
        const commentId = String(value?.id ?? "").trim();
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

        try {
          await replyComment(commentId, AUTO_REPLY_TEXT);
          processed.push({ commentId, fromUserId, action: "replied" });
        } catch (e) {
          processed.push({ commentId, fromUserId, action: "reply-failed", error: String(e) });
        }
      }
    }

    return json({ ok: true, processed });
  } catch (err) {
    console.error(err);
    return json({ ok: false, error: String(err) }, 200);
  }
});
