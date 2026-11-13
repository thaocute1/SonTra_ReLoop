# Chức năng dẫn đoàn trên mobile

Phần mới nằm trong `mobile/lib/guide/`, gồm đúng ba thư mục:

- `data`: API, bộ nhớ đệm và hàng đợi thao tác khi mất mạng.
- `domain`: dữ liệu chuyến, thành viên, trạng thái điểm danh và tính khoảng cách cảnh báo.
- `pages`: giao diện hướng dẫn viên, chi tiết chuyến, thành viên và bản đồ.

## Cập nhật backend

Trong thư mục `backend`, dùng môi trường ảo của dự án:

```powershell
.\venv\Scripts\python.exe -m pip install -r requirements.txt
.\venv\Scripts\python.exe manage.py migrate tours
.\venv\Scripts\python.exe manage.py runserver 0.0.0.0:8000
```

Migration `0001_trip_field_events` chỉ tạo bảng mới `trip_field_events`. Những bảng cũ
`tour_schedules`, `tour_participants`, `tour_attendance_logs` tiếp tục do schema ngoài Django quản lý.
Ngày 13/11/2026 đã chạy migration này thành công trên database PostgreSQL đang cấu hình.
Các bảng/cột cũ cần thiết đã có. Đã gỡ cấu hình SQLite dành riêng cho kiểm thử.

Với PostgreSQL, bảng mới bật RLS và không cấp policy cho client truy cập trực tiếp.
Backend cần dùng tài khoản database có quyền thích hợp như cấu hình server hiện tại;
không đưa thông tin đăng nhập database vào mobile.

Chạy định kỳ lệnh sau để xóa GPS quá 24 giờ và thông báo/yêu cầu/biên nhận quá 90 ngày:

```powershell
.\venv\Scripts\python.exe manage.py prune_trip_field_data
```

## Sử dụng mobile

```powershell
flutter pub get
flutter run
```

Giữ địa chỉ backend trong `mobile/lib/core/constants/app_config.dart` phù hợp mạng của thiết bị.

Hướng dẫn viên dùng tài khoản `users.role = guide`, có hồ sơ tương ứng trong `guides` và được
gán cho `tour_schedules.guide_id`. Chọn **User** tại màn hình đăng nhập; ứng dụng tự mở cổng
hướng dẫn viên theo vai trò server trả về. Không tự tạo tài khoản hay thay vai trò người dùng thật.

Vendor có thể gán hướng dẫn viên lúc tạo lịch hoặc gọi
`PATCH /api/v1/tours/vendor/schedules/{schedule_id}/guide/` với `{"guide_id": 123}`.
Chỉ vendor sở hữu chuyến mới được phân công, hướng dẫn viên phải thuộc cùng đơn vị,
đang hoạt động và chuyến chưa bắt đầu. `guide_id: null` bỏ phân công.

Khách vào tab trekking, chọn **Đoàn của tôi**. Danh sách lấy những chuyến có thành viên
thuộc đơn đã thanh toán và chưa hủy/hoàn tiền. Một đơn nhiều vé vẫn có từng thành viên riêng.
Các đơn cũ chưa có `order_items.tour_schedule_id` cần được đơn vị tổ chức gắn đúng lịch
khởi hành trước khi hiển thị trong mục quản lý đoàn; hệ thống không tự đoán lịch.

Điểm danh toàn bộ danh sách trước khi bắt đầu; phải có ít nhất một người tham gia.
Điểm danh checkpoint và khi về chỉ áp dụng cho người đã có mặt/đến trễ lúc xuất phát.
Về sớm hoặc rời đoàn cần ghi chú; về sớm ghi rõ người nhận bàn giao.
Chỉ kết thúc khi toàn bộ thành viên đã về, đã bàn giao hoặc được đánh dấu vắng/hủy từ đầu.

## GPS và liên lạc

- Mỗi vị trí đại diện một thiết bị của tài khoản đặt vé, không đại diện mọi người trong đơn.
- Khách chủ động đồng ý chia sẻ; GPS gửi mỗi 30 giây khi màn hình chuyến đi đang mở và app ở foreground.
- Rời màn hình thì dừng cập nhật. Tắt chia sẻ sẽ yêu cầu xóa vị trí server; khi mất mạng có nút xóa lại.
- Hiển thị thời gian GPS, sai số và đánh dấu cũ sau 2 phút. Không phát cảnh báo từ cache.
- Cảnh báo xa nhóm so với thiết bị gần nhất, ngưỡng 100–1000 m; cần ít nhất hai vị trí
  trong 2 phút với sai số không quá 100 m. HDV cần liên hệ để xác minh; không suy ra tình trạng an toàn từ cảnh báo.
- Bản đồ OSM có đánh dấu vị trí và đường nối checkpoint, không phải chỉ dẫn đường mòn/GPX đầy đủ.
  Bản đồ nền cần mạng; dữ liệu chuyến đã tải vẫn xem được khi offline trong 24 giờ.
- Thông báo và SOS cập nhật bằng polling mỗi 20 giây khi mở màn hình, chưa có push khi app đóng.
- SOS chỉ hiện hệ thống đã nhận khi API xác nhận; hướng dẫn viên tiếp tục xác nhận đã nhận rồi đã xử lý.
- Khi không gửi được, giữ yêu cầu trong hàng đợi và cung cấp thao tác gọi hướng dẫn viên.

## Đồng bộ và kiểm thử

Điểm danh, thông báo, yêu cầu hỗ trợ được lưu trước khi gửi. Gửi theo thứ tự và giữ UUID qua
các lần thử để server không tạo trùng. Có nút **Đồng bộ**, xem và xóa từng thao tác chưa gửi.
Không tự gửi lại thao tác quá 24 giờ. Bắt đầu/kết thúc chỉ thực hiện trực tuyến khi hàng đợi đã sạch.
Hàng đợi và cache tách theo tài khoản; báo lỗi phân quyền không dùng cache để che lỗi.

```powershell
# Trong backend: kiểm tra validation và truy vấn, không tạo database test
.\venv\Scripts\python.exe manage.py test apps.tours

# Trong mobile
flutter analyze
flutter test
flutter build apk --debug
```

Chat nhóm được tài liệu xếp vào giai đoạn sau và chưa triển khai trong thay đổi này.
