# UC-WEX-012: Student Uploads Work File

**Module:** weekly-exercises | **Actor:** Student | **Priority:** P1

## Description
Student uploads a PDF of their handwritten/scanned work for admin review. Max 10MB, PDF only.

## Preconditions
- Student authenticated
- `student_exercise` assignment exists

## Main Flow
1. Student clicks "Upload Work" and selects a PDF file
2. System POSTs multipart form to `/api/student-exercises/:id/upload` with `file` field
3. Server checks: file present, `.pdf` extension, size ≤ 10MB, magic bytes `%PDF`
4. Saves to `uploads/` as `answer_{id}_{timestamp}.pdf`
5. Updates `student_exercises.answer_pdf_path`
6. Returns 200 with `{ filename, ... }`

## Alternate Flows
- 3a. No file → 400 "PDF file is required"
- 3b. Non-PDF extension → 400 "Only PDF files are allowed"
- 3c. File > 10MB → 400 "File size exceeds maximum allowed (10MB)"
- 3d. Invalid PDF magic bytes (disguised file) → 400 "Invalid PDF file format"
- 3e. Assignment not found → 404

## Postconditions
- File stored on server; path recorded in DB

## Related
- API: `POST /api/student-exercises/:id/upload`
- TCs: TC-WEX-012-01..04
