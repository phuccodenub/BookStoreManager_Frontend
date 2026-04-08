# KẾ HOẠCH TÁI CẤU TRÚC GIAO DIỆN - MMT BookStore Frontend

> **Mục tiêu**: Redesign toàn bộ giao diện theo Figma: Đơn giản, dễ sử dụng, dễ nhìn, bố cục sạch sẽ, màu sắc cơ bản.
> **Figma screenshots**: `docs/figma-screenshots/`

---

## 📋 TỔNG QUAN HIỆN TRẠNG

### Giao diện hiện tại (CẦN THAY ĐỔI)
| Yếu tố | Hiện tại | Figma (Mục tiêu) |
|---------|----------|-------------------|
| **Màu nền** | #f6f0e3 (kem vintage) | #FFFFFF / #F9FBFE (trắng sạch) |
| **Màu chữ chính** | #162022 (đậm) | #000000 / #0F172A (đen tiêu chuẩn) |
| **Accent** | #b7853d gold, #7e4c54 berry | #0F2854 navy, #EC5B13 orange CTA |
| **Font heading** | Fraunces (serif sang trọng) | Roboto Bold / Inter |
| **Font body** | Manrope (san-serif) | Roboto / Inter / Public Sans |
| **Border radius** | 14-30px (bo tròn mạnh) | 6-12px (bo nhẹ, sạch) |
| **Button style** | Gradient gold→berry, pill shape | Solid color, rectangular |
| **Card style** | Semi-transparent, shadow lớn | White bg, border nhẹ, shadow nhẹ |
| **Cảm giác** | Premium/vintage bookstore | Clean/modern e-commerce |

### Figma có gì (7 frames đã screenshot)
**User (5 frames):**
1. **Homepage** (53:30) - Header + banner + categories + book grid sections
2. **Product Detail** (192:725) - Ảnh lớn + thông tin + specs + reviews
3. **Login** (9:62) - Form trái + ảnh phải, nền kem nhạt
4. **Register** (9:5) - Form trái + ảnh phải, tương tự login
5. **Wishlist** (101:3257) - Header + banner + book grid + footer

**Admin (2 frames):**
6. **Dashboard** (257:501) - Sidebar navy + stats cards + chart doanh thu + bảng đơn hàng
7. **Book Management** (268:603) - Sidebar navy + table sách + filter + pagination

### Backend modules CHƯA có frontend page
| Module Backend | Trạng thái Frontend | Ưu tiên |
|----------------|---------------------|---------|
| Authors (detail) | ❌ Thiếu | P2 |
| Publishers (detail) | ❌ Thiếu | P2 |
| Vouchers (admin) | ❌ Thiếu | P2 |
| Inventory (admin full) | ❌ Thiếu | P2 |
| Reports (admin full) | ⚠️ Một phần trong AdminPage | P2 |
| Activity Logs | ❌ Thiếu | P3 |
| Settings (admin) | ❌ Thiếu | P3 |
| Contacts (admin full) | ⚠️ Một phần | P3 |

---

## 🎯 NGUYÊN TẮC THIẾT KẾ (theo Figma)

1. **Đơn giản, không rối mắt** - Loại bỏ gradient, hiệu ứng phức tạp
2. **Nền trắng sạch** - Background #FFFFFF hoặc #F9FBFE
3. **Sidebar cố định** (Admin) - Navy #0F2854 bên trái, content bên phải
4. **Header đơn giản** (User) - Logo + Search + Cart + User avatar
5. **Typography rõ ràng** - Roboto/Inter, kích thước chuẩn
6. **Màu sắc tối thiểu** - Navy, trắng, xám, orange cho CTA, đỏ/xanh cho status
7. **Border-radius nhỏ** - 6-12px thay vì 14-30px
8. **Shadow nhẹ** - Gần như flat design

---

## 🏗️ KẾ HOẠCH THỰC HIỆN (7 PHASE)

### PHASE 1: DESIGN TOKENS & CSS FOUNDATION
> **Ưu tiên**: 🔴 Cao nhất | **Ảnh hưởng**: Toàn bộ dự án

**Mục tiêu**: Thay đổi toàn bộ hệ thống design tokens (màu, font, spacing) - ảnh hưởng mọi page

**Công việc:**
- [ ] 1.1 Tạo file CSS variables mới (`src/styles/tokens.css`) với palette theo Figma
  ```css
  :root {
    /* Backgrounds */
    --bg-primary: #FFFFFF;
    --bg-secondary: #F9FBFE;
    --bg-sidebar: #0F2854;
    --bg-input: #F7F9FF;
    
    /* Text */
    --text-primary: #000000;
    --text-secondary: #64748B;
    --text-muted: #94A3B8;
    --text-on-dark: #EAEFFF;
    
    /* Accent */
    --accent-navy: #0F2854;
    --accent-orange: #EC5B13;
    --accent-gold: #D2A810;
    --accent-blue: #0EA5E9;
    
    /* Status */
    --status-success: #22C55E;
    --status-warning: #F59E0B;
    --status-error: #FF4242;
    --status-info: #38BDF8;

    /* Borders */
    --border-light: #E2E8F0;
    --border-medium: #CBD5E1;
    
    /* Shadows */
    --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
    --shadow-md: 0 4px 6px rgba(0,0,0,0.07);
    --shadow-lg: 0 10px 25px rgba(0,0,0,0.1);
    
    /* Radius */
    --radius-sm: 6px;
    --radius-md: 8px;
    --radius-lg: 12px;
    
    /* Spacing */
    --space-xs: 4px;
    --space-sm: 8px;
    --space-md: 16px;
    --space-lg: 24px;
    --space-xl: 32px;
    --space-2xl: 48px;
  }
  ```
- [ ] 1.2 Thay đổi Google Fonts: bỏ Fraunces, thêm **Roboto** + **Inter** + **Public Sans**
- [ ] 1.3 Viết lại `app.css` sử dụng CSS variables thay vì hardcoded values
- [ ] 1.4 Xóa `figma-refresh.css` (merge vào app.css mới)
- [ ] 1.5 Xóa `style.css` (legacy Vite template, không dùng)
- [ ] 1.6 Cập nhật base styles: typography scale, button styles, card styles, form inputs

**Check**: Mở tất cả page → tất cả đều dùng palette mới, không còn màu gold/berry vintage

---

### PHASE 2: LAYOUT STRUCTURE - USER SHELL
> **Ưu tiên**: 🔴 Cao | **Ảnh hưởng**: Mọi user page

**Mục tiêu**: Redesign AppShell (Header + Footer) theo Figma

**Figma reference**: Header trong frame Wishlist (101:3257) - đơn giản nhất

**Công việc:**
- [ ] 2.1 Redesign **Header** (`AppShell.tsx`):
  - Logo "MMT bookstore" (icon + text) bên trái
  - Search bar ở giữa (rounded, border nhẹ)
  - Cart icon + User avatar bên phải
  - Background trắng, border-bottom nhẹ
  - **Bỏ**: Navigation links phức tạp, mega dropdown
- [ ] 2.2 Redesign **Footer** (`AppShell.tsx`):
  - Mô tả MMT Bookstore bên trái
  - Bản đồ/info bên phải (nếu cần)
  - Đơn giản, không nhiều cột
- [ ] 2.3 Cập nhật container width: `max-width: 1440px` (theo Figma)
- [ ] 2.4 Breadcrumb navigation (vd: "Trang chủ / Yêu thích")

**Check**: Header/Footer khớp Figma, tất cả page đều đồng nhất

---

### PHASE 3: USER PAGES REDESIGN - AUTH
> **Ưu tiên**: 🟡 Trung bình | **Ảnh hưởng**: Login/Register

**Figma reference**: user-login.png, user-register.png

**Công việc:**
- [ ] 3.1 Redesign **LoginPage.tsx**:
  - Layout 2 cột: Form bên trái, Ảnh bookshelf bên phải
  - Background: #FAF6F6 (kem rất nhạt)
  - "WELCOME" heading đen bold phía trên
  - Input fields: icon + text, nền xám nhạt, rounded
  - Button "Login": nền đen, chữ trắng, rectangular
  - "Login with others": Google + Facebook buttons
  - **Giữ nguyên logic**: 4 mode (login/register/forgot/reset) nhưng redesign UI
- [ ] 3.2 Redesign **Register mode**:
  - "ĐĂNG KÝ TÀI KHOẢN" heading
  - Fields: Họ tên, Email, Số điện thoại, Mật khẩu
  - Button "Đăng ký ngay" đen
  - Social login icons (Facebook + Google) phía dưới

**Check**: Login + Register khớp hoàn toàn với Figma screenshot

---

### PHASE 4: USER PAGES REDESIGN - CORE
> **Ưu tiên**: 🔴 Cao | **Ảnh hưởng**: Homepage, Catalog, Product Detail, Wishlist

**a) HomePage (53:30)**
- [ ] 4.1 Hero banner section (full-width slideshow)
- [ ] 4.2 Category navigation row (Thể loại nổi bật)
- [ ] 4.3 Book grid sections ("Sách bán chạy", "Mới nhất", etc.)
  - Card: ảnh bìa + tên + giá gốc (gạch ngang) + giá sale (đỏ) + rating
  - Grid 4-5 cột trên desktop
- [ ] 4.4 "Xem tất cả" links cho mỗi section
- [ ] 4.5 Footer section

**b) CatalogPage (Product Listing)**
- [ ] 4.6 Filter bar: Thể loại, Tác giả, Trạng thái (dropdown)
- [ ] 4.7 Book grid: tương tự homepage nhưng full page
- [ ] 4.8 Pagination rõ ràng

**c) BookDetailPage (192:725)**
- [ ] 4.9 Layout: Ảnh lớn bên trái + thumbnails nhỏ bên dưới
- [ ] 4.10 Thông tin bên phải: Tên, giá sale (đỏ), giá gốc (gạch), tiết kiệm
- [ ] 4.11 Thông số sách (ISBN, tác giả, khổ, số trang, etc.) dạng bảng
- [ ] 4.12 Nút: "Thêm vào giỏ hàng" + "Mua ngay" (đỏ + đen)
- [ ] 4.13 Icons: Yêu thích (heart), Chia sẻ
- [ ] 4.14 Mô tả sách tab
- [ ] 4.15 Reviews section
- [ ] 4.16 Related books section

**d) WishlistPage (101:3257)**
- [ ] 4.17 Banner "Yêu thích" full-width (nền navy)
- [ ] 4.18 "Danh mục yêu thích của tôi" heading
- [ ] 4.19 Book cards grid (heart icon, giá sale/gốc)
- [ ] 4.20 Nút "Xóa tất cả"

**Check**: Mỗi page match với Figma screenshot tương ứng

---

### PHASE 5: ADMIN LAYOUT & PAGES
> **Ưu tiên**: 🔴 Cao | **Ảnh hưởng**: Toàn bộ admin

**Figma reference**: admin-dashboard.png, admin-book-management.png

**a) Admin Layout**
- [ ] 5.1 Tạo **AdminLayout** component mới (hoặc refactor phần admin trong router):
  - **Sidebar cố định** bên trái (width ~287px):
    - Background: #0F2854 (navy đậm)
    - Logo "MMT bookstore" (gold icon + text trắng) on top
    - Menu items: Bảng điều khiển, Đơn hàng, Sách, Khách hàng, Khuyến mãi, Báo cáo
    - Item active: highlight background nhạt hơn
    - "Cài đặt" ở bottom sidebar
  - **Top bar** bên phải:
    - Page title (vd: "Bảng điều khiển")
    - Search bar ở giữa
    - Bell notification icon
    - User name + avatar bên phải
  - **Content area**: nền #F9FBFE

**b) Admin Dashboard (257:501)**
- [ ] 5.2 **4 Stats cards** ngang: Tổng đơn hàng, Doanh thu, Sách đang bán, Khách hàng
  - Mỗi card: icon + số lớn + label + "% so với tháng trước"
  - Border nhẹ, bo 12px
- [ ] 5.3 **Chart Doanh thu** (bar chart): 4 tuần, filter "30 ngày"
- [ ] 5.4 **Đơn hàng theo danh mục** (progress bars + %)
- [ ] 5.5 **Bảng "Đơn hàng gần đây"**: Mã, Khách hàng, Ngày, Trạng thái, Tổng tiền
- [ ] 5.6 **Cảnh báo sắp hết hàng**: Danh sách sách + số lượng còn

**c) Admin Book Management (268:603)**
- [ ] 5.7 Filter bar: Thể loại, Tác giả, Trạng thái (dropdown)
- [ ] 5.8 Button "Thêm sách" (phải)
- [ ] 5.9 **Table**: Bìa, Tên sách, Tác giả/NXB, Giá bán, Tồn kho, Trạng thái, Nổi bật, Thao tác
  - Trạng thái badges: "Còn hàng" (xanh), "Sắp hết hàng" (cam), "Hết hàng" (đỏ nhạt)
  - Thao tác: Edit + Delete icons
- [ ] 5.10 Pagination (1, 2, 3, ... với controls)

**Check**: Admin layout + Dashboard + Book Management khớp Figma

---

### PHASE 6: REMAINING USER PAGES
> **Ưu tiên**: 🟡 Trung bình | **Ảnh hưởng**: Cart, Orders, Account, Support

**Lưu ý**: Các page này CHƯA có trong Figma. Áp dụng design system mới, giữ đơn giản.

- [ ] 6.1 **CartPage**: Redesign với palette mới, layout sạch
- [ ] 6.2 **OrderSuccessPage**: Redesign confirmation page
- [ ] 6.3 **AccountPage**: Profile + Orders + Addresses với style mới
- [ ] 6.4 **SupportPage**: Contact form đơn giản, sạch

**Check**: Tất cả page nhất quán với design system mới

---

### PHASE 7: ADMIN PAGES BỔ SUNG (Backend Coverage)
> **Ưu tiên**: 🟡 Trung bình (sau khi core xong)

**Các page admin mới cần tạo** (theo layout admin đã thiết kế ở Phase 5):

- [ ] 7.1 **Admin Orders Page** - Quản lý đơn hàng: table + filter + status management
- [ ] 7.2 **Admin Customers Page** - Quản lý khách hàng: table + detail
- [ ] 7.3 **Admin Vouchers Page** - Quản lý khuyến mãi: CRUD voucher
- [ ] 7.4 **Admin Inventory Page** - Quản lý tồn kho: import/export, stock alerts
- [ ] 7.5 **Admin Reports Page** - Báo cáo: revenue, best-sellers, top customers
- [ ] 7.6 **Admin Settings Page** - Cài đặt hệ thống
- [ ] 7.7 **Admin Activity Logs** - Nhật ký hoạt động
- [ ] 7.8 **Admin Contacts Page** - Quản lý liên hệ/hỗ trợ

---

## 📐 FIGMA ↔ CODE MAPPING

| Figma Frame | File hiện tại | Thay đổi |
|-------------|---------------|----------|
| Homepage (53:30) | `features/home/HomePage.tsx` | Redesign layout |
| Product Detail (192:725) | `features/book/BookDetailPage.tsx` | Redesign layout |
| Login (9:62) | `features/auth/LoginPage.tsx` | Redesign UI |
| Register (9:5) | `features/auth/LoginPage.tsx` (mode) | Redesign UI |
| Wishlist (101:3257) | `features/wishlist/WishlistPage.tsx` | Redesign layout |
| Admin Dashboard (257:501) | `features/admin/AdminPage.tsx` | Tách thành Dashboard |
| Admin Books (268:603) | Chưa có | Tạo mới |
| Admin Orders | Chưa có (Figma cũng chưa) | Tạo mới theo style |
| Admin Customers | Chưa có (Figma cũng chưa) | Tạo mới theo style |

---

## ⚠️ LƯU Ý QUAN TRỌNG

1. **KHÔNG thay đổi logic/functionality** - Chỉ thay đổi giao diện
2. **KHÔNG thay đổi API calls** - Giữ nguyên tất cả `*-api.ts` files
3. **KHÔNG thay đổi router structure** - Chỉ thêm route mới cho admin pages
4. **KHÔNG thay đổi state management** - React Query, AuthContext giữ nguyên
5. **Figma chưa hoàn chỉnh** - Chỉ có 7 frames, các page còn lại tự thiết kế theo design system
6. **Responsive**: Figma thiết kế cho desktop 1440px, cần bổ sung responsive cho mobile/tablet

---

## 📊 THỨ TỰ ƯU TIÊN THỰC HIỆN

```
Phase 1 (Design Tokens) ──→ Phase 2 (User Shell) ──→ Phase 3 (Auth Pages)
                                    │
                                    ├──→ Phase 4 (Core User Pages)
                                    │
                                    └──→ Phase 5 (Admin Layout + Pages)
                                              │
                                              ├──→ Phase 6 (Remaining User Pages)
                                              │
                                              └──→ Phase 7 (New Admin Pages)
```

**Phase 1 → 2 phải làm trước** (ảnh hưởng toàn bộ).
**Phase 3, 4, 5 có thể song song** sau khi Phase 2 xong.
**Phase 6, 7 làm sau cùng.**

---

## 📝 DESIGN TOKEN REFERENCE (từ Figma)

### Color System
```
Navy (Sidebar/Primary):  #0F2854
White (Bg):              #FFFFFF  
Off-white (Content bg):  #F9FBFE
Light input bg:          #F7F9FF
Black (Text):            #000000
Gray secondary:          #64748B
Gray muted:              #94A3B8
Gold accent:             #D2A810
Orange CTA:              #EC5B13
Green success:           #22C55E, #157A33
Yellow warning:          #FFCE1B, #F59E0B
Red error:               #FF4242
Blue info:               #38BDF8, #0EA5E9
Purple accent:           #BE84FF
Border light:            #E2E8F0
Border medium:           #CBD5E1
```

### Typography Scale
```
Logo:       Roboto 800 / 30px
H1:         Roboto 700 / 25px
H2:         Roboto 700 / 23px
H3:         Roboto 700 / 18px
Body:       Roboto 400 / 16px
Body sm:    Roboto 400 / 14px
Caption:    Roboto 300-400 / 12px
Small:      Roboto 300 / 11px
Table head: Public Sans 700 / 13px (UPPERCASE)
```

### Spacing & Layout
```
Sidebar width:   287px
Content padding: 24px - 32px
Card gap:        16px - 24px
Card radius:     6px - 12px
Button radius:   6px
Input radius:    6px
```
