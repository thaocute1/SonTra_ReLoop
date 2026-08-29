# Son Tra Trail Quest

Nền tảng đặt tour trekking + marketplace sản phẩm tái chế + gamification (Green Points) + dashboard ESG cho khu vực bán đảo Sơn Trà. Đồ án PBL6 - Đại học Bách Khoa Đà Nẵng.

## Stack

- **Backend:** Python (Django + Django REST Framework), **MySQL**
- **Web (Khách hàng / Vendor / Admin):** React (Vite)
- **Mobile (Trekking / Checkpoint GPS):** Flutter
- **Thiết kế UI:** Figma (xem `docs/figma-link.md`)

## Cấu trúc thư mục

```
son-tra-trail-quest/
├── backend/      # Django project + apps: accounts, tours, vendors, challenging
├── web/          # React (Vite) - Web Khách hàng/Vendor/Admin
├── mobile/       # Flutter - App di động (trekking, checkpoint GPS)
└── docs/         # ERD, use case diagram, API contract, link Figma
```

## Chạy Backend (Django + MySQL)

Yêu cầu: đã cài **MySQL Server** và tạo sẵn 1 database rỗng (tên tuỳ ý, khớp với `DB_NAME` trong `.env`).

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # điền DB_NAME, DB_USER, DB_PASSWORD... theo MySQL thật của bạn
python3 manage.py migrate
python3 manage.py runserver
```

> Dự án dùng **PyMySQL** (thay vì `mysqlclient`) để kết nối MySQL — cài đặt đơn giản hơn trên mọi hệ điều hành, không cần cài thêm công cụ build C.

## Chạy Web (React)

```bash
cd web
npm install
cp .env.example .env
npm run dev
```

## Chạy Mobile (Flutter)

```bash
cd mobile
flutter pub get
flutter run
```

## Quy ước nhánh Git

- `main` — code ổn định, đã review
- `dev` — nhánh tích hợp chung
- `feature/<ten-tinh-nang>` — tạo từ `dev`, xong thì mở Pull Request vào `dev`

## Tài liệu liên quan

- ERD, use case diagram, API contract: xem thư mục `docs/`
- Thiết kế Figma: xem `docs/figma-link.md`
