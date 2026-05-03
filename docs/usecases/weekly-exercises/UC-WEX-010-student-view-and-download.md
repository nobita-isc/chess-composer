# UC-WEX-010: Student Views Assigned Exercise and Downloads PDF

**Module:** weekly-exercises | **Actor:** Student | **Priority:** P0

## Description
Student views their assigned exercise details and downloads the exercise PDF.

## Preconditions
- Student authenticated
- `student_exercise` record exists for this student

## Main Flow
1. Student navigates to exercises section
2. System GETs `/api/student-exercises/:id`
3. Returns assignment with exercise metadata
4. Student clicks "Download PDF"
5. System GETs `/api/exercises/:id/pdf`, streams PDF as attachment

## Alternate Flows
- 2a. Assignment not found → 404
- 5a. PDF generation error → 500

## Postconditions
- Read-only; no state change
- PDF downloaded to student's device

## Related
- API: `GET /api/student-exercises/:id`, `GET /api/exercises/:id/pdf`
- TCs: TC-WEX-010-01..02
