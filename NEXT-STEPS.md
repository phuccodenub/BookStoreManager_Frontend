# CÁC BƯỚC TIẾP THEO - UI REFACTOR

## ✅ ĐÃ HOÀN THÀNH (Phase 1-2)

1. **Design Tokens** - `src/styles/tokens.css` ✅
2. **CSS Foundation** - `src/styles/app.css` ✅  
3. **Header & Footer** - `src/components/AppShell.tsx` ✅

**Kết quả:** Giao diện đã có design system mới theo Figma (Navy, White, Roboto fonts)

---

## 🚀 TIẾP THEO - PHASE 3-7

### Phase 3: Auth Pages (PRIORITY: HIGH)
**Mục tiêu:** Redesign Login/Register theo Figma

**File cần sửa:**
- `src/features/auth/LoginPage.tsx`

**Figma reference:**
- `docs/figma-screenshots/user-login.png`
- `docs/figma-screenshots/user-register.png`

**Layout theo Figma:**
```
┌─────────────────────────────────────┐
│  2 CỘT: Form (50%) | Image (50%)   │
│                                     │
│  Background: #FAF6F6 (kem nhạt)    │
│                                     │
│  Form container:                    │
│  - Nền trắng                        │
│  - Bo tròn 12px                     │
│  - Shadow nhẹ                       │
│  - Padding: 32px                    │
│                                     │
│  Heading: "WELCOME"                 │
│  - Roboto 700 / 25px                │
│  - Color: #000000                   │
│                                     │
│  Input fields:                      │
│  - Icon + text input                │
│  - Nền: #F7F9FF                     │
│  - Border: 1px #CBD5E1              │
│  - Border-radius: 6px               │
│  - Padding: 12px 16px               │
│                                     │
│  Button "Đăng nhập":                │
│  - Nền: #000000                     │
│  - Chữ: #FFFFFF                     │
│  - Border-radius: 6px               │
│  - Full-width                       │
│                                     │
│  Social login: Google + Facebook    │
└─────────────────────────────────────┘
```

**CSS classes cần tạo:**
```css
.auth-page {
  display: grid;
  grid-template-columns: 1fr 1fr;
  min-height: 100vh;
  background: #FAF6F6;
}

.auth-form-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-2xl);
}

.auth-form {
  width: 100%;
  max-width: 480px;
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  padding: var(--space-2xl);
  box-shadow: var(--shadow-lg);
}

.auth-heading {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--text-primary);
  margin-bottom: var(--space-md);
}

.auth-subheading {
  font-size: var(--text-base);
  color: var(--text-secondary);
  margin-bottom: var(--space-xl);
}

.auth-input-group {
  margin-bottom: var(--space-md);
}

.auth-label {
  display: block;
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
  margin-bottom: var(--space-xs);
}

.auth-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.auth-input-icon {
  position: absolute;
  left: var(--space-md);
  width: 20px;
  height: 20px;
  color: var(--text-muted);
}

.auth-input {
  width: 100%;
  padding: var(--space-sm) var(--space-md) var(--space-sm) 48px;
  background: var(--bg-input);
  border: 1px solid var(--border-medium);
  border-radius: var(--radius-sm);
  font-size: var(--text-base);
  color: var(--text-primary);
  transition: all var(--transition-fast);
}

.auth-input:focus {
  outline: none;
  border-color: var(--accent-navy);
  box-shadow: 0 0 0 3px rgba(15, 40, 84, 0.1);
}

.auth-button {
  width: 100%;
  padding: var(--space-sm) var(--space-lg);
  background: #000000;
  color: #FFFFFF;
  border: none;
  border-radius: var(--radius-sm);
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  cursor: pointer;
  transition: all var(--transition-fast);
  margin-top: var(--space-lg);
}

.auth-button:hover {
  background: #1a1a1a;
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.auth-link {
  color: var(--accent-blue);
  font-size: var(--text-sm);
  text-decoration: none;
  transition: color var(--transition-fast);
}

.auth-link:hover {
  color: #0284c7;
  text-decoration: underline;
}

.auth-divider {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin: var(--space-xl) 0;
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.auth-divider::before,
.auth-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border-light);
}

.auth-social-buttons {
  display: flex;
  gap: var(--space-sm);
}

.auth-social-button {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-primary);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.auth-social-button:hover {
  background: var(--bg-hover);
  border-color: var(--border-medium);
}

.auth-image-container {
  background: linear-gradient(135deg, #f5f3f0 0%, #e8e4df 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.auth-image-container img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

@media (max-width: 1024px) {
  .auth-page {
    grid-template-columns: 1fr;
  }

  .auth-image-container {
    display: none;
  }
}
```

**Các bước thực hiện:**
1. Mở `src/features/auth/LoginPage.tsx`
2. Xem screenshot `docs/figma-screenshots/user-login.png`
3. Thêm CSS classes trên vào `app.css`
4. Redesign JSX theo layout 2 cột
5. Giữ nguyên logic (4 modes: login/register/forgot/reset)
6. Test responsive

---

### Phase 4: Core User Pages (PRIORITY: HIGH)

**4.1 Homepage** - `src/features/home/HomePage.tsx`
- Hero banner slideshow
- Category navigation
- Book grid sections
- Figma: `user-homepage.png`

**4.2 Catalog** - `src/features/catalog/CatalogPage.tsx`
- Filter bar
- Book grid
- Pagination
- Figma: `user-catalog.png`

**4.3 Product Detail** - `src/features/book/BookDetailPage.tsx`
- Image gallery
- Product info
- Specs table
- Reviews
- Figma: `user-product-detail.png`

**4.4 Wishlist** - `src/features/wishlist/WishlistPage.tsx`
- Banner navy
- Book grid
- Figma: `user-wishlist.png`

---

### Phase 5: Admin Layout & Pages (PRIORITY: HIGH)

**5.1 Admin Layout** - Tạo `src/components/AdminLayout.tsx`
```tsx
// Layout structure:
// ┌─────────────────────────────────┐
// │ Sidebar │ Top Bar               │
// │ (Navy)  ├───────────────────────┤
// │         │                       │
// │         │ Content Area          │
// │         │ (Background: #F9FBFE) │
// │         │                       │
// └─────────────────────────────────┘
```

**5.2 Admin Dashboard** - `src/features/admin/AdminPage.tsx`
- 4 Stats cards
- Revenue chart
- Recent orders table
- Low stock alerts
- Figma: `admin-dashboard.png`

**5.3 Admin Book Management** - Tạo mới
- Filter bar
- Books table
- Pagination
- Figma: `admin-book-management.png`

---

### Phase 6: Remaining User Pages (PRIORITY: MEDIUM)

- Cart: `user-cart.png`
- Checkout: `user-checkout.png`
- Order Success: `user-order-success.png`
- Order History: `user-order-history.png`
- Order Detail: `user-order-detail.png`
- Profile: `user-profile.png`

---

### Phase 7: Admin Pages Bổ Sung (PRIORITY: LOW)

- Orders Management
- Customers Management
- Vouchers Management
- Inventory Management
- Reports
- Settings

---

## 📝 NGUYÊN TẮC KHI REFACTOR

1. **XEM KỸ FIGMA SCREENSHOT** trước khi code
2. **KHÔNG thay đổi logic/API calls** - chỉ thay đổi UI
3. **SỬ DỤNG CSS VARIABLES** từ tokens.css
4. **GIỮ NGUYÊN functionality** - chỉ redesign giao diện
5. **TEST RESPONSIVE** sau mỗi page
6. **SO SÁNH VỚI FIGMA** để đảm bảo giống y hệt

---

## 🎨 DESIGN TOKENS REFERENCE

```css
/* Colors */
--accent-navy: #0F2854
--bg-primary: #FFFFFF
--bg-secondary: #F9FBFE
--bg-input: #F7F9FF
--text-primary: #000000
--text-secondary: #64748B
--text-muted: #94A3B8
--border-light: #E2E8F0
--border-medium: #CBD5E1

/* Typography */
--font-sans: 'Roboto', 'Inter', 'Public Sans'
--text-sm: 12px
--text-base: 14px
--text-md: 16px
--text-lg: 18px
--text-xl: 23px
--text-2xl: 25px
--text-3xl: 30px

/* Spacing */
--space-xs: 4px
--space-sm: 8px
--space-md: 16px
--space-lg: 24px
--space-xl: 32px
--space-2xl: 48px
--space-3xl: 64px

/* Radius */
--radius-sm: 6px
--radius-md: 8px
--radius-lg: 12px

/* Shadows */
--shadow-sm: 0 1px 2px rgba(0,0,0,0.05)
--shadow-md: 0 4px 6px rgba(0,0,0,0.07)
--shadow-lg: 0 10px 25px rgba(0,0,0,0.1)
```

---

**Bắt đầu với Phase 3 (Auth Pages) - File: `src/features/auth/LoginPage.tsx`**
