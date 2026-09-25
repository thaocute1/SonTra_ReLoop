# Handoff: Chuẩn hóa Web style theo khung React

## Ngày

2026-09-24

## Trạng thái

Đã triển khai và kiểm tra build.

## Phạm vi đã hoàn thành

- Giữ `src/index.css` làm master styling entry point.
- Chuyển việc nạp UI CSS về `src/index.css`.
- Chỉ import `index.css` một lần tại `main.jsx`.
- Loại bỏ import CSS lặp trong các component UI.
- Gộp reset/base rule dùng chung vào master styling.
- Loại bỏ Tailwind CDN và cấu hình Tailwind inline khỏi `web/index.html`.
- Thay utility class còn sót trong layout, dashboard và forgot-password bằng class semantic.
- Bổ sung style cho application shell, dashboard placeholder và simple page.
- Giữ nguyên `web/.env.example`.

## File đã thay đổi

- `web/index.html`
- `web/src/index.css`
- `web/src/styles/tokens.css`
- `web/src/styles/app.css`
- `web/src/App.jsx`
- `web/src/layouts/MainLayout.jsx`
- `web/src/layouts/AuthLayout.jsx`
- `web/src/components/ui/Button.jsx`
- `web/src/components/ui/Input.jsx`
- `web/src/components/ui/Card.jsx`
- `web/src/features/dashboard/pages/DashboardPage.jsx`
- `web/src/features/auth/pages/ForgotPasswordPage.jsx`

## Kiểm tra

- `npm run build` trong `web/`: thành công.
- Rà soát Tailwind/CDN/utility references: không còn reference trong `web/src` và `web/index.html`.
- `git diff --check`: không còn lỗi whitespace trong phần thay đổi.

## Ghi chú

- Vite vẫn phát cảnh báo CJS Node API deprecated; cảnh báo này không làm build thất bại.
- Các thay đổi chưa commit có sẵn trong working tree được giữ nguyên; không reset hoặc ghi đè ngoài phạm vi chuẩn hóa style.
- Các stylesheet hỗ trợ hiện vẫn nằm trong `web/src/styles/`, nhưng chỉ được nạp tập trung từ `src/index.css`; feature không phát sinh thư mục style riêng.

## Việc tiếp theo

- Kiểm tra trực quan các route landing, auth và dashboard trên desktop/mobile.
- Nếu nhóm muốn hợp nhất vật lý toàn bộ CSS vào một file duy nhất, cần thực hiện riêng sau khi kiểm tra regression giao diện.

