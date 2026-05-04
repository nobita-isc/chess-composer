# UC-LSN-007: Edit Video URL Inline

**Module:** lessons | **Actor:** Admin | **Priority:** P1

## Description
Admin edits the URL for a video content item inline; only http/https URLs accepted.

## Preconditions
- Admin authenticated
- Video content item exists in lesson

## Main Flow
1. Admin clicks video URL field in content-item-video component
2. Admin enters/pastes URL
3. On blur or Enter, system PUTs `/api/content/:id` with `video_url`
4. Server validates protocol is http or https
5. Success → URL saved, preview updated

## Alternate Flows
- 3a. URL uses `javascript:` scheme → 400 "video_url must be a valid http or https URL"
- 3b. URL is malformed (not parseable) → 400 same message
- 3c. Empty URL → cleared/nulled (allowed)

## Postconditions
- `lesson_content.video_url` updated (or cleared)

## Related
- API: `PUT /api/content/:id`
- UI: `content-item-video.js`
- TCs: TC-LSN-007-01..03
