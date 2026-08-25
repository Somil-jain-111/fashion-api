# Fashion API — Postman Collection

Import [`Fashion-API.postman_collection.json`](./Fashion-API.postman_collection.json) into Postman. No separate environment file is needed — all variables live on the collection itself (Collection > Variables tab).

## Setup

1. **`baseUrl`** defaults to `http://localhost:4050/api/v1` — change it if your dev server runs elsewhere.
2. **Auth** folder: `Send OTP` → `Verify OTP` → (first-time signup only) `Set Password` → `Login`. `Login` and `Refresh Token` auto-save `accessToken`/`refreshToken` to the collection variables via their **Tests** tab — nothing to copy by hand.
3. **Seller flow**: log in as the seller account, then run `Seller Onboarding` → `Seller KYC` → `Categories`/`Seller Products` in order. `accessToken` is reused everywhere — roles are re-derived from the DB on every request, so no re-login is needed after onboarding or after KYC gets approved.
4. **Admin/review flow**: log in as a `super_admin` (or `admin`) account separately and paste its access token into the `superAdminAccessToken` collection variable. The `Admin - *` folders use that variable instead of `accessToken`, so you can hold a seller session and an admin session at the same time.
5. **Catalog (Public)** folder needs no token.

Requests that hand off an id to later requests (`Create Category`, `Create Product`, `Login`, `List Sellers for KYC Review`, `Generate Aadhaar OTP`) auto-populate the matching collection variable from the response, so a folder can be run top-to-bottom without manual copy-pasting.

## Structure

| Folder | Auth | Notes |
|---|---|---|
| Auth | mixed | OTP-based signup/login; profile/logout need `accessToken` |
| Seller Onboarding | `accessToken` | Grants `seller_admin` on the logged-in account |
| Seller KYC | `accessToken` | PAN / GST / Aadhaar, per-type endpoints |
| Categories | mixed | GETs public; create needs KYC-approved seller or admin |
| Seller Products | `accessToken` | Gated on approved seller KYC |
| Catalog (Public) | none | Public browse/search surface |
| Admin - Seller KYC Review | `superAdminAccessToken` | Manual override + review |
| Admin - Products Review | `superAdminAccessToken` | Approve/reject seller-submitted products |
| Admin - Reports | `superAdminAccessToken` | Overview counts |

## Regenerating

The collection is generated from [`build-collection.js`](./build-collection.js) rather than hand-edited, since Postman's JSON is verbose and error-prone by hand. If routes/DTOs change:

```bash
cd postman && node build-collection.js
```

This was verified against a live boot of the app (Newman, folder-by-folder) — routes resolve, auth headers apply correctly, and the `categoryId`/`productId` variable hand-off between `Categories` → `Seller Products` → `Admin - Products Review` works end to end.

## Known pre-existing bug found while verifying this

`POST /sellers/products/delete/:id` (and likely the same `:id` parsing path elsewhere) returns a raw `500` with a leaked DB error (`Unknown column 'NaN' in 'where clause'`) instead of a clean `400`/`404` when `id` isn't a valid number — e.g. an empty or non-numeric path segment. Not something this collection work introduced; flagging it since it surfaced during verification. Happy to fix on request.
