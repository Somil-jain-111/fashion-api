/* One-off generator for postman/Fashion-API.postman_collection.json — run with `node build-collection.js`. */
const fs = require('fs');
const path = require('path');

const uid = (() => {
  let i = 0;
  return () => `00000000-0000-4000-8000-${String(++i).padStart(12, '0')}`;
})();

function body(obj) {
  return {
    mode: 'raw',
    raw: JSON.stringify(obj, null, 2),
    options: { raw: { language: 'json' } },
  };
}

function req({ name, method, path: p, body: b, query, auth, description, tests, prerequest }) {
  const url = {
    raw: `{{baseUrl}}${p}${query ? '?' + query.map((q) => `${q.key}=${q.value}`).join('&') : ''}`,
    host: ['{{baseUrl}}'],
    path: p.replace(/^\//, '').split('/'),
  };
  if (query) url.query = query.map((q) => ({ ...q, disabled: !!q.disabled }));

  const item = {
    name,
    request: {
      method,
      header: b ? [{ key: 'Content-Type', value: 'application/json' }] : [],
      ...(b ? { body: body(b) } : {}),
      url,
      ...(description ? { description } : {}),
    },
    response: [],
  };
  if (auth === 'noauth') item.request.auth = { type: 'noauth' };
  if (auth === 'superadmin')
    item.request.auth = { type: 'bearer', bearer: [{ key: 'token', value: '{{superAdminAccessToken}}', type: 'string' }] };
  const events = [];
  if (prerequest) events.push({ listen: 'prerequest', script: { type: 'text/javascript', exec: prerequest.split('\n') } });
  if (tests) events.push({ listen: 'test', script: { type: 'text/javascript', exec: tests.split('\n') } });
  if (events.length) item.event = events;
  return item;
}

function folder(name, items, description) {
  return { name, item: items, ...(description ? { description } : {}) };
}

// ---------- Auth ----------
const auth = folder(
  'Auth',
  [
    req({
      name: 'Send OTP',
      method: 'POST',
      path: '/auth/send-otp',
      auth: 'noauth',
      body: { mobile: '9876543210' },
      description: 'Provide either `mobile` or `email`, not both.',
    }),
    req({
      name: 'Verify OTP',
      method: 'POST',
      path: '/auth/verify-otp',
      auth: 'noauth',
      body: { mobile: '9876543210', otp: '123456' },
    }),
    req({
      name: 'Set Password',
      method: 'POST',
      path: '/auth/set-password',
      auth: 'noauth',
      body: { setPasswordTicket: '{{setPasswordTicket}}', password: 'Passw0rd!', confirmPassword: 'Passw0rd!' },
      description: '`setPasswordTicket` comes back from Verify OTP on first-time signup.',
    }),
    req({
      name: 'Login',
      method: 'POST',
      path: '/auth/login',
      auth: 'noauth',
      body: { mobile: '9876543210', password: 'Passw0rd!' },
      tests: [
        'const res = pm.response.json();',
        'if (res && res.data && res.data.accessToken) {',
        "    pm.collectionVariables.set('accessToken', res.data.accessToken);",
        "    pm.collectionVariables.set('refreshToken', res.data.refreshToken);",
        '}',
      ].join('\n'),
    }),
    req({
      name: 'Refresh Token',
      method: 'POST',
      path: '/auth/refresh-token',
      auth: 'noauth',
      body: { refreshToken: '{{refreshToken}}' },
      tests: [
        'const res = pm.response.json();',
        'if (res && res.data && res.data.accessToken) {',
        "    pm.collectionVariables.set('accessToken', res.data.accessToken);",
        '}',
      ].join('\n'),
    }),
    req({
      name: 'Forgot Password',
      method: 'POST',
      path: '/auth/forgot-password',
      auth: 'noauth',
      body: { mobile: '9876543210' },
    }),
    req({
      name: 'Reset Password',
      method: 'POST',
      path: '/auth/reset-password',
      auth: 'noauth',
      body: { resetPasswordTicket: '{{resetPasswordTicket}}', password: 'NewPassw0rd!', confirmPassword: 'NewPassw0rd!' },
    }),
    req({ name: 'Get Profile', method: 'GET', path: '/auth/profile' }),
    req({ name: 'Logout', method: 'POST', path: '/auth/logout' }),
  ],
  'Signup/login is OTP-first: Send OTP -> Verify OTP (new users get a setPasswordTicket) -> Set Password, then Login with mobile/email + password. Login and Refresh Token auto-save {{accessToken}}/{{refreshToken}} via their Tests scripts.'
);

// ---------- Seller Onboarding ----------
const onboarding = folder('Seller Onboarding', [
  req({
    name: 'Onboard as Seller',
    method: 'POST',
    path: '/sellers/onboard',
    body: { storeName: 'My Fashion Store' },
    description:
      'Any authenticated account (customer or otherwise) can call this once. Grants the seller_admin role on top of whatever roles the account already holds — no re-login needed, {{accessToken}} works immediately after. PAN/GST/Aadhaar are submitted separately via the Seller KYC folder.',
  }),
]);

// ---------- Seller KYC ----------
const sellerKyc = folder(
  'Seller KYC',
  [
    req({
      name: 'Verify PAN',
      method: 'POST',
      path: '/sellers/kyc/pan/verify',
      body: { panCard: 'ABCDE1234F', panImage: 'https://example.com/uploads/pan.jpg' },
    }),
    req({
      name: 'Verify GST',
      method: 'POST',
      path: '/sellers/kyc/gst/verify',
      body: { gstNumber: '27ABCDE1234F1Z5' },
    }),
    req({
      name: 'Generate Aadhaar OTP',
      method: 'POST',
      path: '/sellers/kyc/aadhaar/generate-otp',
      body: {
        aadharNumber: '234567890123',
        aadharFrontImage: 'https://example.com/uploads/aadhaar-front.jpg',
        aadharBackImage: 'https://example.com/uploads/aadhaar-back.jpg',
      },
      tests: [
        'const res = pm.response.json();',
        'if (res && res.data && res.data.referenceId) {',
        "    pm.collectionVariables.set('aadhaarReferenceId', res.data.referenceId);",
        '}',
      ].join('\n'),
    }),
    req({
      name: 'Verify Aadhaar OTP',
      method: 'POST',
      path: '/sellers/kyc/aadhaar/verify-otp',
      body: { referenceId: '{{aadhaarReferenceId}}', referenceIdOtp: '{{aadhaarReferenceId}}', otp: '123456' },
    }),
    req({ name: 'Get My KYC Profile', method: 'GET', path: '/sellers/kyc/profile' }),
  ],
  'Requires seller_admin role (onboard first). Product creation and category creation are both gated on all three (PAN/GST/Aadhaar) being VERIFIED here, or a Super Admin override via Admin > Seller KYC Review.'
);

// ---------- Categories ----------
const categories = folder(
  'Categories',
  [
    req({
      name: 'Get Category Tree',
      method: 'GET',
      path: '/categories',
      auth: 'noauth',
      query: [{ key: 'flat', value: 'false' }],
    }),
    req({
      name: 'Get Category By Id',
      method: 'GET',
      path: '/categories/{{categoryId}}',
      auth: 'noauth',
    }),
    req({
      name: 'Create Category',
      method: 'POST',
      path: '/categories',
      body: { name: 'Running Shoes', slug: 'running-shoes', parentId: 1, imageUrl: null, isActive: true, sortOrder: 0 },
      description:
        'Default body creates a subcategory (parentId: 1) — the case a Seller Admin is allowed to do. Super Admin/Admin may also omit parentId (or send null) to create a top-level category; Seller Admin may not and must have approved KYC.',
      tests: [
        'const res = pm.response.json();',
        'if (res && res.data && res.data.id) {',
        "    pm.collectionVariables.set('categoryId', res.data.id);",
        '}',
      ].join('\n'),
    }),
    req({
      name: 'Update Category',
      method: 'POST',
      path: '/categories/{{categoryId}}',
      body: { name: 'Running Shoes (Updated)', isActive: true },
    }),
    req({
      name: 'Delete Category',
      method: 'POST',
      path: '/categories/delete/{{categoryId}}',
    }),
  ],
  'GET routes are public. Create/Update/Delete require Super Admin, Admin, or (create-only, subcategory-only, KYC-approved) Seller Admin.'
);

// ---------- Seller Products ----------
const products = folder(
  'Seller Products',
  [
    req({
      name: 'Create Product',
      method: 'POST',
      path: '/sellers/products',
      body: {
        categoryId: '{{categoryId}}',
        name: 'Classic Running Shoe',
        description: 'Lightweight everyday running shoe.',
        basePrice: 1999,
        wholesalePrice: 1499,
        mrp: 2499,
        discountPercentage: 20,
        zone: 'RETAIL',
        variants: [
          { size: 'UK7', sku: 'RUN-SHOE-UK7', stockQuantity: 25 },
          { size: 'UK8', sku: 'RUN-SHOE-UK8', stockQuantity: 30 },
        ],
        images: [{ url: 'https://example.com/uploads/shoe-1.jpg', variantIndex: 0, isPrimary: true, sortOrder: 0 }],
      },
      description:
        'Requires approved seller KYC (see Seller KYC folder). basePrice/wholesalePrice/mrp/discountPercentage: currentPrice is always server-derived, never sent. zone: RETAIL | WHOLESALE | BOTH. Created with status PENDING_APPROVAL, pending Super Admin review.',
      tests: [
        'const res = pm.response.json();',
        'if (res && res.data && res.data.id) {',
        "    pm.collectionVariables.set('productId', res.data.id);",
        '}',
      ].join('\n'),
    }),
    req({
      name: 'List My Products',
      method: 'GET',
      path: '/sellers/products',
      query: [
        { key: 'status', value: 'PENDING_APPROVAL', disabled: true },
        { key: 'page', value: '1' },
        { key: 'limit', value: '20' },
      ],
    }),
    req({ name: 'Get My Product By Id', method: 'GET', path: '/sellers/products/{{productId}}' }),
    req({
      name: 'Update Product',
      method: 'POST',
      path: '/sellers/products/{{productId}}',
      body: { name: 'Classic Running Shoe (Updated)', basePrice: 1899 },
      description: 'If `variants` or `images` are sent, they fully replace the existing set (not a diff).',
    }),
    req({
      name: 'Update Product Status (Activate/Deactivate)',
      method: 'POST',
      path: '/sellers/products/{{productId}}/status',
      body: { status: 'APPROVED' },
      description: 'Seller may only toggle between APPROVED and INACTIVE post-approval; initial approval is Super Admin-only (see Admin > Products Review).',
    }),
    req({ name: 'Delete Product', method: 'POST', path: '/sellers/products/delete/{{productId}}' }),
  ],
  'All routes require seller_admin role. GET :id / Update / Delete are also reachable by Admin/Super Admin.'
);

// ---------- Catalog (Public) ----------
const catalog = folder(
  'Catalog (Public)',
  [
    req({
      name: 'List Products',
      method: 'GET',
      path: '/catalog/products',
      auth: 'noauth',
      query: [
        { key: 'q', value: 'running', disabled: true },
        { key: 'categoryId', value: '{{categoryId}}', disabled: true },
        { key: 'sellerId', value: '', disabled: true },
        { key: 'minPrice', value: '', disabled: true },
        { key: 'maxPrice', value: '', disabled: true },
        { key: 'size', value: 'UK8', disabled: true },
        { key: 'minRating', value: '', disabled: true },
        { key: 'inStock', value: 'true', disabled: true },
        { key: 'zone', value: 'RETAIL', disabled: true },
        { key: 'sortBy', value: 'newest', disabled: true },
        { key: 'page', value: '1' },
        { key: 'limit', value: '20' },
      ],
      description: 'sortBy: price_asc | price_desc | newest | rating | popularity. Only APPROVED products are returned.',
    }),
    req({ name: 'Get Product Detail', method: 'GET', path: '/catalog/products/{{productId}}', auth: 'noauth' }),
    req({
      name: 'Get Categories',
      method: 'GET',
      path: '/catalog/categories',
      auth: 'noauth',
      query: [{ key: 'flat', value: 'false' }],
    }),
    req({ name: 'Get Seller Profile', method: 'GET', path: '/catalog/sellers/{{sellerId}}', auth: 'noauth' }),
  ],
  'No auth required — this is the public browse/search surface consumed by the website and apps.'
);

// ---------- Admin: Seller KYC Review ----------
const adminKyc = folder(
  'Admin - Seller KYC Review',
  [
    req({
      name: 'List Sellers for KYC Review',
      method: 'GET',
      path: '/super-admin/kyc',
      auth: 'superadmin',
      query: [
        { key: 'status', value: 'USER_PROFILE_APPROVAL' },
        { key: 'page', value: '1' },
        { key: 'limit', value: '20' },
      ],
      description:
        'status: NOT_STARTED | PENDING | USER_PROFILE_APPROVAL | APPROVED | REJECTED. ' +
        'USER_PROFILE_APPROVAL = all three of PAN/GST/Aadhaar verified but not yet explicitly approved — this is the queue Approve/Reject act on. Completing KYC alone never auto-approves a seller.',
      tests: [
        'const res = pm.response.json();',
        'if (res && res.data && res.data.items && res.data.items.length) {',
        "    pm.collectionVariables.set('kycSellerId', res.data.items[0].sellerId);",
        '}',
      ].join('\n'),
    }),
    req({ name: 'Get Seller KYC Detail', method: 'GET', path: '/super-admin/kyc/{{kycSellerId}}', auth: 'superadmin' }),
    req({
      name: 'Approve Seller KYC (Manual Override)',
      method: 'POST',
      path: '/super-admin/kyc/{{kycSellerId}}/approve',
      auth: 'superadmin',
    }),
    req({
      name: 'Reject Seller KYC (Manual Override)',
      method: 'POST',
      path: '/super-admin/kyc/{{kycSellerId}}/reject',
      auth: 'superadmin',
      body: { reason: 'Document mismatch on submitted PAN.' },
    }),
  ],
  'Super Admin only. `:id` here is the seller/user id (from List). Approve/Reject are a manual override — status is otherwise auto-derived once all three of PAN/GST/Aadhaar verify.'
);

// ---------- Admin: Products Review ----------
const adminProducts = folder(
  'Admin - Products Review',
  [
    req({
      name: 'List Products for Review',
      method: 'GET',
      path: '/super-admin/products',
      auth: 'superadmin',
      query: [
        { key: 'status', value: 'PENDING_APPROVAL' },
        { key: 'sellerId', value: '', disabled: true },
        { key: 'categoryId', value: '', disabled: true },
        { key: 'page', value: '1' },
        { key: 'limit', value: '20' },
      ],
      description: 'Reachable by Super Admin or Admin.',
    }),
    req({ name: 'Get Product Detail', method: 'GET', path: '/super-admin/products/{{productId}}', auth: 'superadmin' }),
    req({
      name: 'Approve Product',
      method: 'POST',
      path: '/super-admin/products/{{productId}}/approve',
      auth: 'superadmin',
      description: 'Super Admin only.',
    }),
    req({
      name: 'Reject Product',
      method: 'POST',
      path: '/super-admin/products/{{productId}}/reject',
      auth: 'superadmin',
      body: { reason: 'Images do not match the listed variants.' },
      description: 'Super Admin only.',
    }),
  ],
  'List/Detail: Super Admin or Admin. Approve/Reject: Super Admin only.'
);

// ---------- Admin: Reports ----------
const adminReports = folder(
  'Admin - Reports',
  [req({ name: 'Overview', method: 'GET', path: '/admin/reports/overview', auth: 'superadmin' })],
  'Super Admin or Admin. Aggregate counts: total sellers, KYC status breakdown, product status breakdown, etc.'
);

const collection = {
  info: {
    _postman_id: uid(),
    name: 'Fashion API',
    description:
      'NestJS + MySQL fashion/e-commerce marketplace API — Super Admin/Admin/Seller/Customer roles.\n\n' +
      'Setup:\n' +
      '1. Set `baseUrl` (defaults to http://localhost:4050/api/v1).\n' +
      '2. Auth folder: Send OTP -> Verify OTP -> (first time) Set Password -> Login. Login auto-saves {{accessToken}}/{{refreshToken}} to collection variables.\n' +
      '3. For a seller flow: Login as the seller account, then run Seller Onboarding -> Seller KYC -> Categories/Seller Products in order. {{accessToken}} is reused everywhere automatically — roles are re-derived from the DB on every request, so no re-login is needed after onboarding or KYC approval.\n' +
      '4. For admin/review flows: log in as a super_admin account separately and paste its accessToken into the `superAdminAccessToken` collection variable (the Admin folders use that variable, not {{accessToken}}, so you can hold both a seller session and an admin session at once).\n' +
      '5. Catalog folder is public, no token needed.\n\n' +
      'Requests that return an id (Create Category, Create Product, Login, List Sellers for KYC Review, Generate Aadhaar OTP) auto-populate the matching collection variable via their Tests tab, so downstream requests in the same folder work without manual copy-pasting.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  auth: {
    type: 'bearer',
    bearer: [{ key: 'token', value: '{{accessToken}}', type: 'string' }],
  },
  event: [],
  variable: [
    { key: 'baseUrl', value: 'http://localhost:4050/api/v1', type: 'string' },
    { key: 'accessToken', value: '', type: 'string' },
    { key: 'refreshToken', value: '', type: 'string' },
    { key: 'superAdminAccessToken', value: '', type: 'string' },
    { key: 'setPasswordTicket', value: '', type: 'string' },
    { key: 'resetPasswordTicket', value: '', type: 'string' },
    { key: 'aadhaarReferenceId', value: '', type: 'string' },
    { key: 'categoryId', value: '', type: 'string' },
    { key: 'productId', value: '', type: 'string' },
    { key: 'sellerId', value: '', type: 'string' },
    { key: 'kycSellerId', value: '', type: 'string' },
  ],
  item: [auth, onboarding, sellerKyc, categories, products, catalog, adminKyc, adminProducts, adminReports],
};

const outPath = path.join(__dirname, 'Fashion-API.postman_collection.json');
fs.writeFileSync(outPath, JSON.stringify(collection, null, 2) + '\n');
console.log('Wrote', outPath);
