# instagram-webhook (Supabase Edge Function)

Instagram 댓글 이벤트를 받아 자동 대댓글 + DM을 보내는 기본 템플릿.

## 1) 필수 Secrets

```bash
supabase secrets set \
  IG_VERIFY_TOKEN='your-webhook-verify-token' \
  IG_GRAPH_ACCESS_TOKEN='your-long-lived-token-or-page-token' \
  IG_GRAPH_VERSION='v22.0' \
  IG_AUTO_REPLY_TEXT='확인했어요 🙌 DM으로 안내드렸습니다!' \
  IG_AUTO_DM_TEXT='문의 주셔서 감사합니다! 요청하신 정보를 DM으로 보내드려요 🙂' \
  IG_KEYWORD_REGEX='(링크|정보|가격|구매)'
```

## 2) 배포

```bash
supabase functions deploy instagram-webhook --no-verify-jwt
```

`--no-verify-jwt`는 Meta Webhook이 JWT 없이 호출하기 때문에 필요함.

## 3) 로컬 테스트

```bash
supabase functions serve instagram-webhook --no-verify-jwt
```

검증 GET 예시:

```bash
curl "http://127.0.0.1:54321/functions/v1/instagram-webhook?hub.mode=subscribe&hub.verify_token=your-webhook-verify-token&hub.challenge=1234"
```

## 4) Meta Webhook 설정

- Callback URL: `https://<project-ref>.functions.supabase.co/instagram-webhook`
- Verify token: `IG_VERIFY_TOKEN`와 동일 값
- 구독 필드: 댓글 이벤트 관련 항목으로 설정

## 주의

- 현재 버전은 **중복 발송 방지(cooldown/dedupe)** 를 넣지 않았음.
- 실사용 전, Supabase 테이블로 `from_user_id + comment_id` 이력 저장 후 재발송 방지 권장.
- DM 발송은 Meta 정책/허용 창(window) 조건을 따라야 동작함.
