# DoorSmith — Bug Fix Verification & Test Cases

## Fixes Applied

### Fix 1: Camera blank screen (Bug 1)
**File:** `src/components/QrScanner.tsx`
- Added `object-cover` to video element className
- Added `cameraStarting` state with loading overlay
- Loading overlay shows spinner + "कैमरा शुरू हो रहा है... Starting camera..." while camera initializes
- Overlay hides once scan loop starts (success) or on error

### Fix 2: Photo upload retake (Bug 4)
**File:** `src/app/register/[token]/RegisterForm.tsx`
- Added `e.target.value = ""` in camera input onChange handler
- Allows re-capturing the same photo after clearing preview

### Fix 3: Khati wrong login page (Bug 5)
**File:** `src/services/users.ts`
- Changed khati creation WA message from `/register/{token}` to `/login/khati`
- Simplified message: direct login link, no confusing dual links
- Bilingual Hindi+English maintained

### Fix 4: WA log visibility (Bug 3)
**Files:** `src/components/WaLogTable.tsx`, `src/app/admin/settings/page.tsx`, `src/services/walog.ts`
- Added status filter buttons (All / Sent / Failed) with count badges to WaLogTable
- Settings page passes `waStatus` filter param to WaLogTable
- Pagination preserves status filter via URL query params
- `listWaLogs()` now accepts optional `status` filter parameter

---

## Test Cases

### TC-01: Camera loading overlay appears
**Preconditions:** User is on `/khati/scan`, camera permission not yet granted
**Steps:**
1. Navigate to `/khati/scan`
2. Observe the camera area
**Expected:** A dark overlay with spinner + "Starting camera..." text appears immediately
**Expected:** Overlay disappears once camera stream is active

### TC-02: Camera video fills container on mobile
**Preconditions:** User is on `/khati/scan` with camera active
**Steps:**
1. Open on mobile browser (Chrome Android or Safari iOS)
2. Point camera at QR code
**Expected:** Video fills the entire camera container (no black bars, no 0x0 rendering)
**Expected:** `object-cover` ensures feed fills aspect-ratio box

### TC-03: QR scan works after overlay disappears
**Preconditions:** Camera active, QR code visible
**Steps:**
1. Point camera at a valid product QR code
2. Wait for scan
**Expected:** Scan result (success or error) is displayed
**Expected:** Points are awarded on success

### TC-04: Photo capture on registration form
**Preconditions:** User opens `/register/{token}` link
**Steps:**
1. Tap "Take photo" button
2. Capture a photo from camera
3. Verify photo preview appears
4. Tap × to clear preview
5. Tap "Take photo" again
6. Capture another photo
**Expected:** Second photo capture works (onChange fires correctly)
**Expected:** Second photo preview replaces the first

### TC-05: Photo upload on form submit
**Preconditions:** Photo captured, form filled
**Steps:**
1. Fill in address, DOB fields
2. Submit the form
**Expected:** Form submits successfully with photo data
**Expected:** No "Photo is required" error

### TC-06: Khati creation sends correct WhatsApp message
**Preconditions:** Admin creates a khati via admin panel
**Steps:**
1. Admin creates khati with phone number
2. Check the khati's WhatsApp
**Expected:** Message says "Welcome to DoorSmith, {name}!"
**Expected:** Link points to `/login/khati` (NOT `/register/{token}`)
**Expected:** Message is bilingual (Hindi + English)
**Expected:** No confusing dual links in the message

### TC-07: Khati login page shows phone OTP (not email/password)
**Preconditions:** Khati taps the link from WhatsApp
**Steps:**
1. Open `/login/khati`
2. Observe the login form
**Expected:** Form shows phone number input + OTP flow
**Expected:** NO email/password fields
**Expected:** Bilingual labels where appropriate

### TC-08: Approved khati still gets access link
**Preconditions:** Admin approves a khati's KYC
**Steps:**
1. Admin approves khati from `/approvals`
2. Check the khati's WhatsApp
**Expected:** Message includes a direct access link (`/carpenter/access/{token}`)
**Expected:** Message explains the link opens the app directly

### TC-09: Admin can view WhatsApp message log
**Preconditions:** Admin logged in, some messages have been sent
**Steps:**
1. Navigate to `/admin/settings?tab=whatsapp`
2. Observe the message log section
**Expected:** Table shows sent/failed messages with phone, preview, type, status, time
**Expected:** Filter buttons show counts (All / Sent / Failed)
**Expected:** Clicking filter buttons filters the list
**Expected:** Pagination works and preserves the selected filter

### TC-10: WaLog counts are accurate
**Preconditions:** Mixed sent/failed messages exist
**Steps:**
1. Go to WhatsApp tab in settings
2. Check the badge counts on filter buttons
**Expected:** "Sent" badge shows count of sent messages
**Expected:** "Failed" badge shows count of failed messages
**Expected:** "All" badge shows total count

### TC-11: Camera error state recovery
**Preconditions:** Camera permission denied
**Steps:**
1. Navigate to `/khati/scan` with camera permission blocked
2. Observe error state
3. Grant permission in settings
4. Tap "Retry camera"
**Expected:** Error overlay shows with helpful message and retry button
**Expected:** After retry, camera initializes and loading overlay appears

### TC-12: Camera retry resets properly
**Preconditions:** Camera was working then disconnected
**Steps:**
1. Start scanning on `/khati/scan`
2. Force-close the browser tab mid-scan
3. Reopen and navigate back to `/khati/scan`
4. Tap "Retry camera" if error appears
**Expected:** Camera restarts fresh
**Expected:** Previous stream is properly cleaned up
**Expected:** No "Camera already in use" error

---

## How to Run Tests

Since no test framework is configured, these are **manual test cases** to be executed:

1. Build and deploy to a staging environment
2. Use a real mobile device (or Chrome DevTools mobile emulation)
3. Execute each test case above in order
4. Record pass/fail for each

For production deployment:
```bash
npm run build
npm run start
```
