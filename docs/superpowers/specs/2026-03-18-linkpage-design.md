# 리틀리나/인포크링크 스타일 자동 DM + 링크 페이지 설계

## 배경 및 목표
인스타그램 댓글에 반응하여 자동 DM과 선택적 대댓글을 보내고, DM에서 공유한 링크를 클릭하면 상품 모음 페이지(이하 링크 페이지)로 이동하도록 연결하는 “리틀리나/인포크링크” 스타일 서비스를 구축한다. 목표는 수동으로 DM 템플릿/링크/댓글 정책을 관리할 수 있는 백오피스를 제공하고, 사용자에게는 단순하지만 집중된 링크 페이지를 보여주며, 메타의 IG Graph API를 통해 DM과 대댓글을 보낼 수 있도록 하는 것이다.

## 요구 사항 요약
1. 게시물 단위로 두 가지 DM 정책 관리(모든 댓글 감지 vs 특정 문자열(대소문자 무시) 정확 일치 감지).
2. 게시물별 템플릿은 본문 텍스트, CTA 버튼 텍스트, CTA 링크(등록된 제휴 링크 또는 수동 URL)를 지정할 수 있어야 하며, 링크는 프론트용 상품 리스트와 공유하거나 별도 입력 가능.
3. “키워드” 대신 댓글 문자열 조건을 단순 비교로 처리하고, 조건을 만족한 댓글에는 DM + 원하는 경우 대댓글(최대 3개, 2개 이상이면 랜덤 선택) 전송.
4. 링크 페이지(front)는 프로필 이미지, 소개 문구, 상품 리스트(이미지+상품명+버튼)만 노출.
5. 상품 리스트, 템플릿, 정책, 링크 등은 모두 백오피스에서 수동으로 CRUD하며, 나중에 n8n/스크립트로 자동화하려는 구조를 남김.
6. IG Graph API 권한(`instagram_manage_messages` 등)은 Meta 리뷰가 필요하며, 정책 문서/동의 과정을 통해 얻을 예정이다.

## 아키텍처
- **수신 흐름:** IG 댓글 Webhook(또는 n8n/스크립트가 메타에서 제공하는 댓글 이벤트를 폴링) → 백엔드 API(`/events/comments`) 수신 → 게시물 정책 조회 → 문자열 비교(불필요한 키워드 파싱 없이 완전 일치, 대소문자 무시) → 템플릿/대댓글 선택.
- **전송 모듈:** IG Graph API 클라이언트가 DM(`/me/messages`)과 대댓글(`/{comment-id}/replies`)을 보냄. 실패는 `delivery_logs`에 기록하고 백오피스에서 확인 가능.
- **백오피스 API:** 게시물 목록, 정책 수정, 템플릿/링크/상품 CRUD, 대댓글 유형 관리, 로그 열람을 제공.
- **프론트 링크 페이지:** 동일 백엔드의 상품 API에서 리스트를 조회하여 `profile`, `intro`, `products`로 구성된 정적 페이지를 렌더링.

## 백오피스 관리 흐름
1. 게시물 리스트: 각 게시물에 대해 DM 정책(모드), 연결 템플릿, 대댓글 설정, 상태(활성/비활성) 표시.
2. 정책 수립: 게시물 선택 → `모드` 토글(`all_comments` or `exact_match`) → 문자열 조건(모드가 `exact_match`일 경우 입력) → 템플릿/CTA 링크/상품 지정.
3. 템플릿 편집: 이름, 본문 텍스트, CTA 버튼 문구, CTA 링크 선택(등록된 `links` 중 선택 또는 수동 `url` 입력) → 프론트 상품 리스트(필요하면 노출 순서/블록) 연계.
4. 상품/링크 관리: 프론트 노출 상품을 이미지/타이틀/링크로 CRUD. 링크 레코드는 제휴사 배송 URL을 포함하고, 템플릿에서 선택 가능한 형태로 유지.
5. 대댓글 관리: 게시물별로 최대 3개 대댓글 템플릿 등록. 1개면 고정 응답, 2~3개면 요청 시 랜덤 선택.
6. 운영 로그: DM/대댓글 성공/실패 기록, 메타 오류 메시지, 응답 지연. 실패 시 재시도 시나리오도 백오피스에서 확인.

## 프론트 링크 페이지
- 최상단: 프로필 이미지 + 소개 텍스트.
- 상품 리스트: 백오피스에서 등록한 `products`를 순서대로 보여주며, 각 항목은 상품 이미지, 상품명, CTA 버튼(백오피스의 `button_text`)만 포함.
- CTA 버튼 클릭 시 템플릿에서 지정한 CTA 링크(제휴 URL 또는 수동 URL)로 이동. 프론트 페이지 자체는 링크 모음 역할만 수행.

## 데이터 모델 (예시)
- `posts`(id, ig_post_id, policy_mode, exact_match_text, template_id, comment_reply_group_id, enabled)
- `templates`(id, name, body, button_text, link_id, manual_url)
- `links`(id, name, affiliate_url, affiliate_partner)
- `products`(id, name, image_url, link_id, display_order)
- `comment_replies`(id, post_id, replies[]) // replies 배열 최대 3개, 랜덤 선택 로직 포함.
- `delivery_logs`(id, post_id, comment_id, destination, status, meta_error, sent_at)

## DM/대댓글 로직 정리
1. Webhook 수신 → `post` 조회 → 정책 모드 판별 (`all_comments` vs `exact_match`).
2. `exact_match`: 댓글 텍스트를 트림 후 소문자로 바꿔 저장된 문자열과 비교. 동일하면 템플릿 호출.
3. `all_comments`: DM 템플릿 고정.
4. DM 전송 후, `comment_replies`에 등록된 항목이 있다면 1개 (고정) 또는 랜덤(2개 이상)으로 대댓글 전송.
5. 촉발 실패 발생 시 `delivery_logs`에 적재하고, 필요한 경우 관리자에게 알림(추후 n8n/슬랙 등으로 확장).
6. 각 DM 템플릿은 하나의 CTA 링크 또는 수동 URL만 허용하므로 CTA 링크 선택 UI는 템플릿 단위.

## IG API 및 권한
- 필요한 권한: `instagram_basic`, `pages_manage_metadata`, `instagram_manage_messages`, `pages_read_engagement` (필요시 대댓글 관련).
- Meta 앱 등록 + 스크립트 테스트 계정/시연 흐름 문서화.
- 자동 DM/댓글 특성상 `instagram_manage_messages` 신청 시 이용 목적, 데이터 보존 정책, 사용자 동의 폼 제출 필요.
- 권한 승인을 받는 동안에는 테스트 계정으로 데모 시나리오만 운영하고, 사용자 요청이 생기면 심사 상황을 설명.

## 차후 고려
1. n8n/자동화 스크립트로 IG Webhook 등록 → 이벤트 전달 → DM 시나리오 자동화.
2. CSV/스프레드시트 기반 상품/템플릿 업로드 기능 (후속 기능).
3. 모니터링: 실패율, DM 응답 시간, 오픈/클릭률 추적 표준화.

이 설계를 바탕으로 구현 계획을 작성하겠습니다.
