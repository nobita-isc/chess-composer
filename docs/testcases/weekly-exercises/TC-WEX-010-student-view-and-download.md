# TC-WEX-010: Student Views Assigned Exercise and Downloads PDF

**UC:** [UC-WEX-010](../../usecases/weekly-exercises/UC-WEX-010-student-view-and-download.md)
**Module:** weekly-exercises | **Last Updated:** 2026-05-03

---

## TC-WEX-010-01: Student views assignment details

- **Type:** Functional
- **Priority:** Critical
- **Method:** API
- **Precondition:** Student assigned to exercise
- **Steps:**
  1. `GET /api/student-exercises/:id`
- **Expected Result:**
  - Status 200, `success: true`
  - Response includes exercise metadata, `score`, `is_final`, `notes`
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-WEX-010-02: Student downloads exercise PDF

- **Type:** Functional
- **Priority:** High
- **Method:** API
- **Precondition:** Exercise has valid puzzle data for PDF generation
- **Steps:**
  1. `GET /api/exercises/:id/pdf`
- **Expected Result:**
  - Status 200
  - `Content-Type: application/pdf`
  - `Content-Disposition: attachment; filename="exercise-{week_start}.pdf"`
  - Non-empty binary body
- **Actual Result:** __ fill on execution __
- **Status:** Pending
