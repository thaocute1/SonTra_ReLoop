# PayPal Sandbox — Sơn Trà REloop

Tích hợp chỉ hoạt động trong Sandbox, không bật Live. Client Secret và access token chỉ nằm ở backend. Không commit `.env`.

## Chạy demo

1. Khai báo `PAYPAL_MODE=sandbox`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` trong `backend/.env`.
   Database hiện tại dùng enum PostgreSQL cho `payment_transactions.payment_gateway`. Trước lần chạy PayPal đầu tiên, áp dụng migration bổ sung `paypal`:

   ```powershell
   cd backend
   python manage.py migrate payments 0001_add_paypal_gateway
   ```

   Migration chạy được lại an toàn nếu giá trị đã tồn tại, không đổi các gateway cũ. SQLite không có enum này nên bộ test trong bộ nhớ không thay thế bước kiểm tra schema PostgreSQL.
2. Tỷ giá demo mặc định `PAYPAL_DEMO_VND_PER_USD=25000`. Đây không phải tỷ giá thị trường. Backend khóa tỷ giá và số USD vào giao dịch ngay lần tạo đầu tiên.
3. `PAYPAL_FRONTEND_URL` mặc định `http://localhost:5173`. Mở frontend bằng đúng origin này để giữ phiên đăng nhập khi quay về từ PayPal. Nếu dùng origin khác, cấu hình lại rồi khởi động backend.
4. Khởi động backend bằng `python manage.py runserver` trong `backend/` và frontend bằng `npm run dev` trong `web/`, đăng nhập tài khoản khách hàng rồi mở `/dashboard/trekking`.
5. Chọn tour/lịch/số khách, chọn **PayPal Sandbox**, bấm **Đến PayPal Sandbox**.
6. Đăng nhập **Personal Sandbox** khác tài khoản Business nhận tiền, chấp thuận giao dịch rồi quay về website.
7. Trang `/payment/paypal/return` gọi backend capture. Chỉ capture `COMPLETED`, đúng số tiền USD, mã đơn và người nhận mới xác nhận chuyến đi.
8. Trong hồ sơ → lịch sử đặt tour, đơn PayPal đang chờ có nút **Kiểm tra / tiếp tục PayPal**. Có thể kiểm tra lại hoặc hủy để trả chỗ.

Một đơn PayPal có thời hạn thanh toán 15 phút. Hết hạn thì không cho capture mới; người dùng có thể hủy đơn chờ để trả chỗ. Chưa có tác vụ nền định kỳ tự giải phóng mọi đơn hết hạn; nếu cần vận hành ngoài demo, phải bổ sung worker và đối soát trước khi giải phóng. Khoản tiền đã capture đến sau khi chỗ bị hủy/hết hạn được gắn `needs_review`, không tự xác nhận lại chuyến đi.

## API

Các API dưới đây yêu cầu JWT của người sở hữu đơn, ngoại trừ webhook dùng chữ ký PayPal:

| API | Chức năng |
| --- | --- |
| `GET /api/v1/payments/paypal/config/` | Trạng thái sẵn sàng, USD và tỷ giá demo; không trả credentials |
| `POST /api/v1/payments/paypal/create-order/` | Body `{ "order_id": 123 }`; trả checkout URL Sandbox |
| `POST /api/v1/payments/paypal/capture/` | Body `{ "paypal_order_id": "..." }`; kiểm tra/capture và xác nhận |
| `GET /api/v1/payments/paypal/status/123/` | Đối soát với PayPal, khôi phục kết quả khi mất kết nối |
| `POST /api/v1/payments/paypal/cancel/` | Body `{ "order_id": 123 }`; chỉ hủy đơn chưa nhận tiền và trả chỗ một lần |
| `POST /api/v1/payments/paypal/webhook/` | Xác thực chữ ký qua API PayPal rồi xử lý capture/đối soát hoàn tiền |

Mỗi lần thử tạo/capture dùng lại cùng `PayPal-Request-Id`. Ghi sổ và xác nhận đơn được khóa theo hàng `Orders` trong transaction ngắn. Các HTTP request PayPal chạy ngoài transaction. Việc ghi quỹ/vendor là sổ cái VND, không chuyển tiền đến vendor hoặc quỹ.

Ngoài việc bổ sung giá trị `paypal` cho enum gateway, không đổi cấu trúc bảng: `PaymentTransactions.amount` tiếp tục lưu VND; USD, tỷ giá, provider order/capture ID và phản hồi PayPal lưu trong `raw_response`. Mỗi order mới chỉ chọn một gateway; PayPal không tạo link PayOS kèm theo.

## Bật webhook

Luồng capture sau khi quay lại website chạy được trên localhost, chưa cần webhook. Để nhận sự kiện khi khách đóng trình duyệt hoặc có hoàn tiền/đảo giao dịch:

1. Chuẩn bị URL HTTPS công khai đến backend, ví dụ tunnel riêng dành cho demo.
2. Trong **cùng ứng dụng Sandbox** đang dùng, thêm webhook URL:
   `https://YOUR-BACKEND/api/v1/payments/paypal/webhook/`.
3. Chọn `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.PENDING`, `PAYMENT.CAPTURE.DECLINED`, `PAYMENT.CAPTURE.REFUNDED`, `PAYMENT.CAPTURE.REVERSED`.
4. Thêm Webhook ID vào `PAYPAL_WEBHOOK_ID` trong `.env` và khởi động lại backend.
5. Thử bằng một giao dịch Sandbox được chấp thuận/capture, kiểm tra Webhook Events trong Dashboard. Mock Simulator không thay thế kiểm thử xác thực đầu-cuối.

Webhook `REFUNDED`/`REVERSED` đánh dấu yêu cầu BQL đối soát, không tự thay đổi toàn bộ vé/điểm thưởng/phân bổ. Chưa có giao diện chủ động hoàn tiền trong phạm vi demo này.

## Kiểm thử

```powershell
cd backend
python run_payment_tests.py apps
python manage.py check
cd ../web
npm run build
```

Runner dùng SQLite trong bộ nhớ và mock PayPal cho các ca thanh toán, không ghi dữ liệu demo vào Supabase. Bộ kiểm tra bao gồm quyền sở hữu, sai số tiền/loại tiền, capture chờ/chưa duyệt, timeout, retry, webhook giả/phát lại, hủy/trả chỗ, khoản tiền đến muộn và xác nhận PayOS hiện có.

## Tương thích với remaining-bugs

Giữ nguyên toàn bộ `payos_views.py` và `payos_service.py` của nhánh `remaining-bugs`. PayPal dùng lại `TourService.book_tour_slot` để kiểm tra và khóa lịch/Flash Sale, lưu người tham gia, gán đơn cho người dùng đã đăng nhập và dựng biên nhận. Cả hai phương thức đều không ghi ledger khi đơn còn chờ thanh toán. Giao diện dùng lại `extractErrorMessage` để hiển thị lỗi API an toàn.

Đã chạy 207 kiểm thử backend bằng SQLite và build frontend. Bổ sung ca giữ chỗ/vé Flash Sale cuối cùng, hủy lặp không trả chỗ hai lần, lưu người tham gia và khoản PayPal đến sau khi PayOS đã thanh toán. Hai test chat có lỗi sẵn trên nhánh gốc được sửa riêng phần fixture/kỳ vọng HTTP 401; không đổi nghiệp vụ chat. Các kiểm thử này không thay thế thanh toán Sandbox đầu-cuối hoặc kiểm tra enum trên PostgreSQL.

## Tài liệu chính thức

- [Orders v2](https://developer.paypal.com/api/orders/v2)
- [OAuth](https://developer.paypal.com/api/rest/authentication/)
- [Idempotency](https://developer.paypal.com/api/rest/reference/idempotency/)
- [Webhook verification](https://developer.paypal.com/api/rest/webhooks/rest/)
