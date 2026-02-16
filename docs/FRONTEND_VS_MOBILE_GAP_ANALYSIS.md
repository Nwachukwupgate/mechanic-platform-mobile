# Frontend vs Mobile – Gap Analysis

This document lists **features, logic, conditions, and important details** that exist in **mechanic-platform-frontend** but are **missing or reduced** in **mechanic-platform-mobile**. No code edits were made; this is identification only.

---

## 1. Auth & onboarding

| Item | Frontend | Mobile | Notes |
|------|----------|--------|--------|
| **Email verification** | Full flow: `VerifyEmail` page, `authAPI.verifyEmail(token, role)`, route `/verify-email`, success/error/invalid-link states. Register success message: "Please check your email to verify your account before logging in." | **Missing**: No VerifyEmail screen, no `verifyEmail` in API, no post-register message about checking email. | Users may try to log in before verifying; backend may reject. |
| **401 handling** | Interceptor: logout + redirect to `/login` only for **non-auth** routes (login, register, **verify-email** excluded). | Interceptor: logout on 401 but **no redirect** (no `window.location`). Verify-email not special-cased. | Mobile must handle "session expired" in-app (e.g. navigate to Login). |
| **Token fallback** | Request interceptor reads token from **localStorage** (`auth-storage`) if not in store. | No localStorage fallback; token only from store. | After app restart, store may be rehydrated from persist; if not, requests can go out without token. |
| **Login validation** | Zod: email format, password min 6 chars, role enum. | Basic: non-empty email/password only; no min length, no email format. | Weaker validation on mobile. |
| **Register success** | Shows "Registration Successful! Please check your email to verify..." then redirects to login after 3s. | Navigates to Login immediately; no "check your email" message. | User may not know they must verify. |

---

## 2. API layer (services/api)

| API / helper | Frontend | Mobile | Notes |
|--------------|----------|--------|--------|
| **getApiErrorMessage** | Handles: `message` (string or array), `data.error`, status 400/401/403/404/5xx, axios message. | Simpler: `data.message` (string/array), 401 only. | No 403/404/500-specific messages; no `data.error` fallback. |
| **isPropertyNotAllowedError** | Present; used for mechanic profile (e.g. retry without `brands`). | **Missing**. | Cannot gracefully handle "property X should not exist" from backend. |
| **authAPI.verifyEmail** | Present. | **Missing**. | Needed for email verification flow. |
| **usersAPI** | getProfile, updateProfile. | Same. | — |
| **mechanicsAPI** | getProfile, updateProfile, updateAvailability, **uploadCertificate**, **uploadAvatar**, listBankAccounts, addBankAccount, **updateBankAccount**, setDefaultBankAccount, deleteBankAccount. **getAll**, **getById** (public mechanic fetch). | getProfile, updateProfile, updateAvailability, listBankAccounts, addBankAccount, setDefaultBankAccount, deleteBankAccount. **No** updateBankAccount, uploadCertificate, uploadAvatar, getAll, getById. | Mechanic profile on mobile cannot upload certificate/avatar; cannot update existing bank account; cannot fetch mechanic list/detail for display. |
| **vehiclesAPI** | getAll, **getById**, create, **update**, delete. | getAll, create, delete. **No** getById, update. | Mobile cannot view/edit a single vehicle; add-only + delete. |
| **faultsAPI** | getAll(**category?**), getById. | getAll() only. | No category filter, no single fault fetch. |
| **bookingsAPI** | create, getAll, getById, findNearbyMechanics, acceptBooking, updateStatus, updateCost, **getOpenRequests**, **getQuotes**, **createQuote**, **updateQuote**, **withdrawQuote**, **rejectQuote**, **acceptQuote**, **updateDescription**, **addClarification**, **answerClarification**. | create, getAll, getById, findNearbyMechanics, acceptBooking, updateStatus, updateCost. **None** of the quote/description/clarification APIs. | Quote flow (post job → mechanics quote → user accepts) and Q&A/clarifications not supported on mobile. |
| **ratingsAPI** | create, **getMechanicRatings**, **getMechanicAverage**. | create only. | Cannot show mechanic rating (e.g. 4.5) on Find Mechanics. |
| **walletAPI** | getBanks, **initializePayment**, **verifyPayment**, **markDirectPaid**, **getTransactions**, getBalance, getOwing, getSummary, withdraw. | getBanks, getSummary, withdraw. **No** initializePayment, verifyPayment, markDirectPaid, getTransactions, getBalance, getOwing. | User cannot pay for booking (Paystack or mark direct) from mobile; no transaction list; mechanic has no getBalance/getOwing on mobile (only getSummary in wallet screen). |

---

## 3. User flows

### 3.1 Find Mechanics

| Item | Frontend | Mobile | Notes |
|------|----------|--------|--------|
| **"Post job & get quotes"** | Second CTA: create booking **without** mechanicId; user gets quotes from multiple mechanics, then accepts one. | **Missing**: Only "Request service" for a chosen mechanic. No "post job" / open-request flow. | Quote-based flow not available on mobile. |
| **Diagnostic notes** | Optional textarea: "Additional details (optional)" (e.g. when it started, sounds, warning lights). Sent as `description` in create. | **Missing**: No description/diagnostic notes when creating booking. | Less context for mechanic. |
| **Mechanic card details** | Avatar, **Verified** badge, **bio**, **rating (e.g. 4.5)**, address (workshopAddress / address+city / lat,lng), **Expertise** tags. | Company name, owner, workshopAddress only. No avatar, verified badge, bio, rating, expertise. | Less trust and info for user. |
| **Map interaction** | MechanicsMap: **selectedMechanicId**, **onSelectMechanic**, **onCloseInfoWindow**, **onRequestService** from map. | Map shows user + mechanics; no select/request from map (request only from list). | Different map UX. |
| **Location retry** | On POSITION_UNAVAILABLE or TIMEOUT, **retries once** after 1.5s. | No automatic retry. | Frontend more resilient to temporary GPS failure. |
| **Location error copy** | Specific messages: permission denied, position unavailable, timeout, generic. | Generic + permission denied; no timeout/unavailable wording. | — |
| **fault.category** | Uses `fault.category` for findNearbyMechanics. | Same. | — |

### 3.2 User dashboard

| Item | Frontend | Mobile | Notes |
|------|----------|--------|--------|
| **Stats** | Active bookings count, total bookings, completed count (with icons). | **Missing**: Only greeting + two cards (Find mechanics, My bookings). No counts. | Less at-a-glance info. |
| **Recent bookings** | List of up to 5 with vehicle, fault, status, link to detail. | **Missing**: No recent list on dashboard. | User must open Bookings tab. |

### 3.3 User booking detail

| Item | Frontend | Mobile | Notes |
|------|----------|--------|--------|
| **Real-time chat** | Socket: join_booking, new_message, send_message. **BookingChat** component; messages update live. | **Missing**: Only displays `booking.messages` from GET; **no socket**, no sending messages. | Chat is read-only / stale on mobile. |
| **Quotes (REQUESTED, no mechanic)** | Section "Quotes from mechanics": list PENDING quotes, **Accept** / **Reject** per quote, real-time updates via socket. | **Missing**: No quotes section, no accept/reject quote. | Quote flow not supported. |
| **Description / job details** | User can **edit description** (updateDescription); shown as "Job details for mechanics" or "Pre-job discussion". | **Missing**: No description edit or display. | — |
| **Clarifications (Q&A)** | Mechanics can ask questions; user sees **answerClarification** UI and can answer. List of Q&A shown. | **Missing**: No clarifications display or answer. | — |
| **Payment** | When status in ACCEPTED/IN_PROGRESS/DONE and !paidAt and estimatedCost > 0: **Pay with Paystack** (initializePayment → redirect), **I paid the mechanic directly** (markDirectPaid). | **Missing**: No payment actions. | User cannot pay from mobile. |
| **Estimated cost** | Displayed. | Displayed in mechanic detail; user detail does not show estimated cost. | Minor. |
| **Job location** | If locationLat/Lng: **locationAddress**, link to **Google Maps** (open in maps). | **Missing**: No location block or map link. | — |
| **Rating** | After DONE: "Rate mechanic" opens modal (stars + optional comment). | Same idea; modal with stars + comment. | Present. |
| **Status styling** | REQUESTED, ACCEPTED, IN_PROGRESS, DONE, PAID, DELIVERED with distinct styles. | Status text only; no PAID/DELIVERED-specific styling. | — |

### 3.4 User vehicles

| Item | Frontend | Mobile | Notes |
|------|----------|--------|--------|
| **Add vehicle form** | **type** (SEDAN/SUV/TRUCK from VEHICLE_TYPES), **brand** (CAR_BRANDS), **model**, **year**, **color**, **licensePlate**. | **Missing**: No add form; only list + delete. Mobile has no way to add a vehicle. | Critical: users cannot add vehicles on mobile. |
| **Edit vehicle** | update(id, data) in API; form can be repurposed for edit. | **Missing**: No update, no edit UI. | — |
| **Vehicle display** | Type label (e.g. Saloon), year, color, license plate. | type, year only; no color, license plate. | — |

### 3.5 User profile

| Item | Frontend | Mobile | Notes |
|------|----------|--------|--------|
| **Fields** | First name, last name, email (read-only), **phone**, **address** (editable). | Same + Sign out. | Aligned. |

### 3.6 User job history

| Item | Frontend | Mobile | Notes |
|------|----------|--------|--------|
| **Screen** | **Job History** page: bookings with status DONE/PAID/DELIVERED only; link to booking detail; mechanic avatar, actualCost, completedAt. | **Missing**: No dedicated Job History; Bookings lists all. | No "completed only" view. |

### 3.7 User wallet

| Item | Frontend | Mobile | Notes |
|------|----------|--------|--------|
| **Screen** | **Wallet** page: getTransactions (with type, limit, offset), verifyPayment(reference) from URL (e.g. Paystack return), type labels (USER_PAYMENT, etc.), status badges (PENDING/SUCCESS/FAILED). | **Missing**: No user wallet screen or tab. | User cannot see payment/transaction history on mobile. |

---

## 4. Mechanic flows

### 4.1 Mechanic dashboard

| Item | Frontend | Mobile | Notes |
|------|----------|--------|--------|
| **Dashboard** | Dedicated dashboard: **Open requests** (getOpenRequests), **Pending** (REQUESTED assigned to me), **Recent bookings**; real-time quote updates (onQuoteAccepted, onQuoteRejected). | **Missing**: No mechanic dashboard; first tab is **Bookings**. | No "open requests" or stats on mobile. |

### 4.2 Mechanic bookings list

| Item | Frontend | Mobile | Notes |
|------|----------|--------|--------|
| **Filter** | ALL, REQUESTED, ACCEPTED, IN_PROGRESS. | **Missing**: All bookings only; no filter. | Harder to find pending vs active. |
| **estimatedCost** | Shown in list. | Not shown in list. | — |

### 4.3 Mechanic booking detail (open request – quote flow)

| Item | Frontend | Mobile | Notes |
|------|----------|--------|--------|
| **Open request** | When status === REQUESTED && !mechanicId: **Submit/update quote** (createQuote / updateQuote), **clarification question** (addClarification). Socket: quote events refresh data. | **Missing**: Mechanic only sees "Accept booking" for REQUESTED **with** mechanicId (assigned). No flow for "open" requests or quoting. | Mechanics cannot bid on open jobs from mobile. |
| **Accept booking** | For **assigned** REQUESTED (mechanicId set after user accepts quote). | Same. | — |
| **Chat** | Socket: join_booking, send_message, new_message; BookingChat. | **Missing**: Messages from GET only; no socket, no send. | Chat not functional. |
| **Job location** | If locationLat/Lng: address + Google Maps link. | **Missing**. | — |
| **Description** | Shown; mechanic can ask clarification. | **Missing**: No description display, no ask clarification. | — |

### 4.4 Mechanic profile

| Item | Frontend | Mobile | Notes |
|------|----------|--------|--------|
| **Availability** | Toggle; updateAvailability. | Same. | — |
| **Company / owner / email** | Read-only. | Same (name/email style). | — |
| **Photo (avatar)** | Upload (uploadAvatar), remove, preview; validation type/size. | **Missing**. | No avatar on mobile. |
| **Phone, experience** | Editable. | **Missing**. | — |
| **Vehicle types** | Multi-select (SALOON, SUV, TRUCK). | **Missing**. | — |
| **Car brands** | Multi-select (CAR_BRANDS). | **Missing**. | — |
| **Workshop location** | workshopAddress text + **Use my location** (getCurrentPosition + reverseGeocode), lat/lng saved; show address. | **Missing**: No workshop location or "use my location" on profile. | Mechanics may not appear in "find nearby" correctly. |
| **Certificate** | Upload (PDF/image), view link, remove; validation type/size. | **Missing**. | — |
| **NIN, guarantor** (name, phone, address) | Editable. | **Missing**. | — |
| **Expertise** | Multi-select (MECHANICAL, ELECTRICAL, AC, OTHER). | **Missing**. | — |
| **Address, city, state, zipCode, bio** | Editable. | **Missing**. | — |
| **isPropertyNotAllowedError** | Retry update without `brands` if backend rejects. | **Missing**. | — |

### 4.5 Mechanic wallet

| Item | Frontend | Mobile | Notes |
|------|----------|--------|--------|
| **Balance / owing** | getBalance, getOwing (separate or in summary). | getSummary only (balance + owing + recentTransactions). | Frontend may show more detail. |
| **Bank accounts** | list, add, **update**, setDefault, delete. | list, add, setDefault, delete; **no updateBankAccount**. | Cannot edit existing bank account on mobile. |
| **Withdraw** | Same. | Same. | — |

### 4.6 Mechanic job history

| Item | Frontend | Mobile | Notes |
|------|----------|--------|--------|
| **Screen** | **Job History**: completed (DONE/PAID/DELIVERED) only, link to detail, actualCost, completedAt. | **Missing**: No Job History tab/screen; only Bookings. | No completed-only view. |

---

## 5. Real-time & infrastructure

| Item | Frontend | Mobile | Notes |
|------|----------|--------|--------|
| **Socket** | **socket.ts**: connectSocket, getSocket, disconnectSocket; join_booking, new_message, send_message; **onQuoteEvents** (quote:created/updated/rejected/accepted). | **Missing**: No socket client; no real-time messages or quote updates. | All real-time features absent on mobile. |
| **BookingChat** | Reusable chat UI; messages + onSend. | **Missing**: Inline bubbles only; no send, no socket. | — |

---

## 6. Public / marketing

| Item | Frontend | Mobile | Notes |
|------|----------|--------|--------|
| **Home** | Public Home page. | **Missing** (app is auth-first). | — |
| **For Users / For Mechanics** | Public landing pages. | **Missing**. | — |

---

## 7. Conditions & validation (summary)

- **Login**: Frontend validates email format and password min length; mobile does not.
- **Register**: Frontend shows "check your email" and has verify-email flow; mobile does not.
- **Find Mechanics**: Frontend validates vehicle + fault + **location** before search and before "Post job"; mobile validates location before search but has no "post job" flow.
- **Booking create**: Frontend can send **description**; mobile does not.
- **Payment**: Frontend shows Paystack + mark direct only when status in ACCEPTED/IN_PROGRESS/DONE and !paidAt and estimatedCost > 0; mobile has no payment.
- **Mechanic profile**: Frontend validates file type/size for certificate and avatar; mobile has no uploads.
- **API errors**: Frontend handles 403, 404, 5xx and property-not-allowed; mobile has simpler error handling.

---

## 8. Summary table (screens / features)

| Area | Frontend | Mobile |
|------|----------|--------|
| Verify email | ✅ Page + API | ❌ |
| User dashboard stats + recent | ✅ | ❌ (greeting + 2 cards only) |
| Add vehicle | ✅ Full form (type, brand, model, year, color, plate) | ❌ |
| Edit vehicle | ✅ | ❌ |
| Job history (user) | ✅ | ❌ |
| User wallet | ✅ Transactions + verify payment | ❌ |
| Find Mechanics: post job & quotes | ✅ | ❌ |
| Find Mechanics: diagnostic notes | ✅ | ❌ |
| Find Mechanics: mechanic rating/bio/expertise/verified | ✅ | ❌ |
| User booking: quotes accept/reject | ✅ | ❌ |
| User booking: description + clarifications | ✅ | ❌ |
| User booking: payment (Paystack + direct) | ✅ | ❌ |
| User booking: job location + map link | ✅ | ❌ |
| User booking: real-time chat | ✅ Socket + send | ❌ (display only) |
| Mechanic dashboard + open requests | ✅ | ❌ |
| Mechanic booking: quote submit/update | ✅ | ❌ |
| Mechanic booking: clarification ask | ✅ | ❌ |
| Mechanic booking: real-time chat | ✅ Socket + send | ❌ (display only) |
| Mechanic profile: avatar, certificate, workshop location, NIN, guarantor, expertise, brands, bio, etc. | ✅ | ❌ (availability + name only) |
| Mechanic job history | ✅ | ❌ |
| Mechanic bank account update | ✅ | ❌ |
| Socket (messages + quote events) | ✅ | ❌ |
| Public Home / For Users / For Mechanics | ✅ | ❌ |

---

*End of gap analysis. No code was modified; this document is for planning only.*
