# BookStoreManager Frontend

API-first React frontend for the BookStoreManager backend.

## Stack

- React 19
- TypeScript
- Vite
- React Router
- TanStack Query
- Socket.IO client

## Local setup

1. Start the backend and database first.
2. Copy env file:

```powershell
Copy-Item .env.example .env
```

3. Install dependencies:

```bash
npm install
```

4. Start the frontend:

```bash
npm run dev
```

Default API base URL:

```env
VITE_API_BASE_URL=http://localhost:4000
```

## Current pages

- `/`: home page backed by `/api/home` and `/api/settings`
- `/catalog`: books + filters backed by catalog endpoints
- `/books/:bookId`: detail + related + reviews + wishlist save action
- `/login`: login/register plus forgot/reset password shell
- `/wishlist`: protected customer wishlist workspace
- `/cart`: protected cart + checkout starter
- `/account`: protected profile/address/order/payment/security view
- `/support`: public contact submission form
- `/admin`: protected backoffice cockpit for staff/admin

## Demo accounts

- `admin@bookstore.com` / `Password123!`
- `staff@bookstore.com` / `Password123!`
- `customer@bookstore.com` / `Password123!`

## Notes

- The UI is intentionally backend-contract-first, not final-product polish.
- This batch focuses on route structure, API integration, auth persistence, wishlist state, password utilities, and order/payment inspection.
- Once Figma is ready, the same data layer can be reused under the real interface.
