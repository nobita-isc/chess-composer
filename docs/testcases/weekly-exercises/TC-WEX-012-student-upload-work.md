# TC-WEX-012: Student Uploads Work File

**UC:** [UC-WEX-012](../../usecases/weekly-exercises/UC-WEX-012-student-upload-work.md)
**Module:** weekly-exercises | **Last Updated:** 2026-05-03

---

## TC-WEX-012-01: Upload valid PDF — happy path

- **Type:** Functional
- **Priority:** High
- **Method:** API
- **Precondition:** `student_exercise` exists; valid PDF file < 10MB
- **Steps:**
  1. `POST /api/student-exercises/:id/upload` multipart, field `file` = valid PDF
- **Expected Result:**
  - Status 200, `success: true`, `filename` in response
  - File saved under `uploads/`; `answer_pdf_path` updated in DB
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-WEX-012-02: Upload non-PDF extension rejected

- **Type:** Negative
- **Priority:** High
- **Method:** API
- **Test Data:** file with `.jpg` extension
- **Steps:**
  1. `POST /api/student-exercises/:id/upload` with a `.jpg` file
- **Expected Result:**
  - Status 400, `{ error: "Only PDF files are allowed" }`
  - No file saved
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-WEX-012-03: Upload PDF > 10MB rejected

- **Type:** Boundary
- **Priority:** High
- **Method:** API
- **Test Data:** PDF file of 10MB + 1 byte
- **Steps:**
  1. `POST /api/student-exercises/:id/upload` with oversized file
- **Expected Result:**
  - Status 400, `{ error: "File size exceeds maximum allowed (10MB)" }`
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-WEX-012-04: Upload disguised file (wrong magic bytes) rejected

- **Type:** Security
- **Priority:** High
- **Method:** API
- **Test Data:** file named `malware.pdf` but content is not a PDF (wrong magic bytes)
- **Steps:**
  1. `POST /api/student-exercises/:id/upload` with file that has `.pdf` extension but non-PDF content
- **Expected Result:**
  - Status 400, `{ error: "Invalid PDF file format" }`
  - File not persisted
- **Actual Result:** __ fill on execution __
- **Status:** Pending
