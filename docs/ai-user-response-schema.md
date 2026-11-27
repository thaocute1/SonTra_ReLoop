# Schema phản hồi AI dành cho user

Đối chiếu mã nguồn hiện tại ngày 19/11/2026. Tài liệu mô tả contract đang được triển khai, không phải schema đề xuất. Phạm vi: khách hàng/người dùng thông thường; không bao gồm API preview/approve dành cho quản trị viên hay dữ liệu phân tích riêng của vendor.

## 1. Endpoint và luồng xử lý

| Chức năng | Method | URL |
|---|---|---|
| Gửi câu hỏi | POST | `/api/v1/cms-chatbot/agent/chat/` |
| Lấy lịch sử | GET | `/api/v1/cms-chatbot/agent/history/?session_id=mobile-123` |

Cả hai endpoint yêu cầu đăng nhập. Mobile hiện gửi `Authorization: Bearer <access_token>` và `Content-Type: application/json`.

Luồng gửi câu hỏi:

1. `runtime/views.py` validate request và tạo `ToolContext` từ người đăng nhập.
2. `runtime/agent.py` tạo prompt, cấp tool theo vai trò và chạy model DeepSeek.
3. Model có thể gọi tool; backend kiểm tra tham số, thực thi và đưa kết quả lại cho model.
4. `runtime/response_schema.py` chuẩn hóa nội dung cuối thành `parts` và `answer`.
5. Backend tạo `blocks` từ kết quả tool tìm tour, lưu lượt chat rồi trả JSON.

Đây là response JSON thông thường, chưa có streaming/SSE hay các sự kiện token.

## 2. Request gửi câu hỏi

```json
{
  "message": "Gợi ý tour Sơn Trà nhẹ nhàng cho tôi",
  "session_id": "mobile-123"
}
```

| Trường | Kiểu | Quy tắc hiện tại |
|---|---|---|
| `message` | string | Bắt buộc; trim; 1–4000 ký tự. |
| `session_id` | string | Không bắt buộc riêng lẻ nếu có `conversation_id`; khi truyền trực tiếp phải khớp `^[A-Za-z0-9._:-]{1,128}$`. |
| `conversation_id` | string hoặc null | Tùy chọn, 1–128 ký tự nếu là string; được dùng thay `session_id` nếu thiếu `session_id`. Chưa áp dụng regex của `session_id` cho trường này. |
| `max_loops` | integer | Tùy chọn, mặc định 3; từ 1 đến 3 lần gọi model. |
| `context` | object | Tùy chọn; được serializer chấp nhận nhưng chưa được truyền vào agent loop. Không thay thế thông tin tài khoản do backend xác định. |
| `data` | object hoặc null | Tùy chọn; dataset được nối vào câu hỏi gửi model. Cần `source` khác null, `columns` và `rows` là array; mỗi row là object có key thuộc các tên column. |
| `response_options` | object | Tùy chọn; hiện được chấp nhận nhưng chưa điều khiển định dạng response. |

Phải có ít nhất một trong `session_id` hoặc `conversation_id`. Nếu có cả hai, `session_id` được dùng lưu lịch sử, còn `conversation_id` được phản chiếu riêng trong response. Request có trường ngoài danh sách bị từ chối.

Client không gửi API key AI, vai trò hay thông tin sức khỏe để tự quyết định quyền tool. Backend xác định các thông tin này.

## 3. Response thành công — HTTP 200

```json
{
  "ok": true,
  "session_id": "mobile-123",
  "conversation_id": "mobile-123",
  "answer": "Mình gợi ý tour Sơn Trà buổi sáng.",
  "message": {
    "id": "msg_0123456789abcdef0123456789abcdef",
    "role": "assistant",
    "parts": [
      {"type": "text", "text": "Mình gợi ý tour Sơn Trà buổi sáng."}
    ],
    "created_at": "2026-11-19T09:00:00+00:00"
  },
  "usage": null,
  "blocks": [],
  "trace": [
    {
      "stage": "model",
      "iteration": 0,
      "provider": "deepseek",
      "model": "deepseek-chat",
      "kind": "final"
    },
    {"stage": "timing", "duration_ms": 1250.5}
  ],
  "status": "OK",
  "error": null
}
```

Các giá trị thời gian, ID, tên tour và số liệu trong ví dụ là minh họa, không phải dữ liệu giao dịch/catalog thực tế.

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `ok` | boolean | `true` khi chat thành công. |
| `session_id` | string | Session đã được serializer xác định. |
| `conversation_id` | string | Giá trị request nếu có và khác rỗng, nếu không dùng `session_id`. |
| `answer` | string | Bản text tổng hợp; fallback cho client chỉ hỗ trợ text. |
| `message` | object | Tin nhắn assistant có cấu trúc. |
| `message.id` | string | `msg_` + UUID hex; tạo mới ở mỗi response thành công. |
| `message.role` | string | Luôn là `assistant`. |
| `message.parts` | array | Các phần nội dung theo thứ tự; xem mục 4. |
| `message.created_at` | string | ISO 8601, UTC, tạo tại thời điểm trả response. |
| `usage` | null | Hiện luôn null; chưa có số token/chi phí. |
| `blocks` | array | Hiện có block `tour_list`, hoặc `[]`. |
| `trace` | array | Thông tin thực thi; không phải nội dung hiển thị hội thoại. |
| `status` | string | `OK` khi thành công. |
| `error` | null | Null khi thành công. |

## 4. Schema `message.parts`

Hiện có hai loại: `text` và `chart`.

### 4.1. Text

```json
{"type": "text", "text": "Nội dung trả lời tiếng Việt."}
```

`text` là string được chuẩn hóa bằng cách trim. Không có cờ xác định plain text hay Markdown; cách render do client quyết định.

### 4.2. Chart

```json
{
  "type": "chart",
  "chart": {
    "type": "bar",
    "title": "Ngân sách chuyến đi",
    "description": "Đơn vị: VND; số liệu do người dùng cung cấp",
    "xField": "label",
    "series": [
      {"field": "amount", "name": "Chi phí", "type": "bar"}
    ],
    "data": [
      {"label": "Di chuyển", "amount": 100000},
      {"label": "Ăn uống", "amount": 150000}
    ]
  }
}
```

| Trường chart | Kiểu sau chuẩn hóa | Ghi chú |
|---|---|---|
| `type` | string | `bar`, `line`, `pie`, `area`, `column`, `doughnut`, `radar`, `scatter`; giá trị không hỗ trợ chuyển thành `bar`. |
| `title` | string | Có thể rỗng. |
| `description` | string | Có thể rỗng. |
| `xField` | string | Key của trục X; có thể được suy ra từ dòng dữ liệu đầu; mặc định `label` khi không có dữ liệu. |
| `series` | array of object | Mỗi phần tử có `field`, `name`, `type` là string. Có thể suy ra từ trường số của dòng đầu. Nếu không có, dùng series `value`/`Giá trị`. |
| `data` | array of object | Các dòng dữ liệu có key động; phần tử không phải object bị loại. Có thể là array rỗng. |

Validator hiện chuẩn hóa cấu trúc, chưa kiểm tra đầy đủ mọi giá trị dữ liệu là số, mọi `field` tồn tại trong từng dòng, hay nguồn gốc số liệu. Yêu cầu chỉ dùng dữ liệu thật nằm trong prompt; đây không phải bảo đảm được validator kiểm chứng.

User thông thường cũng có thể nhận chart từ dữ liệu tự cung cấp; các tool phân tích doanh thu của vendor/admin không được cấp cho user thông thường.

### 4.3. Quan hệ giữa `parts` và `answer`

- Model có thể trả text thuần hoặc JSON. Parser còn chấp nhận JSON trong code fence, JSON có text trước/sau, object chứa `chart`, hoặc object chart ở top-level có `series` và `data`.
- Những dạng model output này được chuẩn hóa trước khi trả API; client không cần tự parse JSON bên trong `answer`.
- Khi có text part, `answer` là các `text` nối bằng hai dấu xuống dòng (`\n\n`).
- Nếu chỉ có chart, `answer` lấy title của chart đầu, hoặc description, hoặc chuỗi `Biểu đồ dữ liệu`.
- Nếu không trích xuất được part hợp lệ, parser giữ nguyên nội dung model thành một text part; JSON lỗi có thể xuất hiện như text.
- Không render cả `answer` lẫn text trong `parts` cùng lúc vì sẽ trùng nội dung.

## 5. Schema `blocks`: card tour

```json
{
  "type": "tour_list",
  "items": [
    {
      "id": 16,
      "title": "Sơn Trà buổi sáng",
      "description": "Khám phá cung đường thiên nhiên Sơn Trà.",
      "cover_image_url": "https://example.com/tour.jpg",
      "price": "450000.00",
      "difficulty_level": "easy",
      "duration_hours": "4.00",
      "avg_rating": "4.80"
    }
  ]
}
```

| Trường item | Kiểu hiện tại | Ghi chú |
|---|---|---|
| `id` | integer | ID tour từ backend. |
| `title` | string | Tên tour. |
| `description` | string hoặc null | Tối đa 400 ký tự. |
| `cover_image_url` | string hoặc null | Ảnh có thể thiếu/rỗng; client cần ảnh thay thế. |
| `price` | string hoặc null | Giá được stringify; client phải parse trước khi định dạng tiền. |
| `difficulty_level` | string hoặc null | Giá trị catalog; bộ lọc tool hỗ trợ `easy`, `moderate`, `challenging`, `expert`. |
| `duration_hours` | string hoặc null | Thời lượng giờ. |
| `avg_rating` | string hoặc null | Điểm đánh giá. |

`blocks` nằm ở top-level, không nằm trong `message.parts`. Backend chỉ tạo card từ `search_tours`, `search_tours_by_health`, `search_tours_by_ai_filter`; không lấy card tự khai báo trong JSON do model sinh.

Các kết quả được gộp, loại trùng theo `id`, giữ thứ tự xuất hiện đầu tiên. Mỗi lần gọi tool trả tối đa 5 tour; tổng số tour trong block không có giới hạn 5 riêng vì có thể gộp nhiều lần gọi tool.

Không có lịch khởi hành, số chỗ, `checkoutUrl`, `detail_url` hay action đặt vé trong card hiện tại. Client dùng `id` để mở màn hình chi tiết và lấy dữ liệu cần thiết. Với tool sức khỏe, duration/rating có giá trị 0 hiện được formatter chuyển thành null; với tìm kiếm thường chúng được stringify nếu khác null.

## 6. Response lỗi

### 6.1. Lỗi do chat view/agent xử lý

```json
{
  "ok": false,
  "session_id": "mobile-123",
  "answer": "",
  "trace": [],
  "status": "ERROR",
  "error": {
    "code": "PROVIDER_TIMEOUT",
    "message": "Provider request timed out."
  }
}
```

Lỗi validation có thêm `error.details` chứa lỗi serializer. Response lỗi này không có `message`, `parts`, `blocks`, `usage`, `conversation_id`. Client phải kiểm tra `ok`/HTTP status trước khi đọc response thành công.

| HTTP | Một số code hiện có | Trường hợp |
|---|---|---|
| 400 | `INVALID_REQUEST`, `INVALID_TOOL_ARGUMENTS`, `TOOL_CALL_LIMIT`, `MALFORMED_TOOL_CALL` | Request/tham số tool/giới hạn không hợp lệ. `MALFORMED_TOOL_CALL` sinh tại provider có thể dùng mặc định 502. |
| 502 | `EMPTY_MODEL_RESPONSE`, `MAX_LOOPS_REACHED`, `UNKNOWN_TOOL`, `MODEL_PROVIDER_ERROR`, `INVALID_PROVIDER_RESPONSE`, `PROVIDER_RESPONSE_TOO_LARGE`, `TOOL_RESULT_TOO_LARGE` | Lỗi model hoặc kết quả thực thi; `AgentPipelineError` mặc định HTTP 502 nếu nơi ném lỗi không ghi đè. |
| 503 | `AGENT_DISABLED`, `PROVIDER_NOT_CONFIGURED`, `INVALID_CONFIGURATION`, `BACKEND_UNAVAILABLE` | Tắt AI, thiếu/sai cấu hình hoặc catalog tạm lỗi. |
| 504 | `PROVIDER_TIMEOUT`, `TOOL_TIMEOUT` | Timeout provider/tool. |

`error.message` có thể là tiếng Anh và chứa chi tiết kỹ thuật; giao diện nên ánh xạ `error.code` sang thông báo tiếng Việt, không hiển thị trace cho người dùng.

### 6.2. Lỗi từ DRF/hạ tầng

Authentication, permission, throttle, JSON request sai cú pháp hoặc lỗi server ngoài `AgentPipelineError` có thể không theo envelope trên. Ví dụ DRF có thể trả `{"detail": "..."}`; proxy có thể trả HTML.

Client cần xử lý HTTP 401/403, 429 và body không phải JSON độc lập với `error.code`. Không có bảo đảm HTTP 429 sẽ mang code `RATE_LIMITED` trong body. Chat có throttle scope `agent_chat`, cấu hình qua backend.

## 7. Schema lịch sử

```json
{
  "ok": true,
  "session_id": "mobile-123",
  "messages": [
    {
      "id": "history-user-42",
      "role": "user",
      "content": "Gợi ý tour cho tôi",
      "timestamp": "2026-11-19T09:00:00+00:00"
    },
    {
      "id": "history-assistant-42",
      "role": "assistant",
      "content": "Mình gợi ý tour Sơn Trà buổi sáng.",
      "parts": [{"type": "text", "text": "Mình gợi ý tour Sơn Trà buổi sáng."}],
      "blocks": [],
      "timestamp": "2026-11-19T09:00:00+00:00"
    }
  ]
}
```

- Chỉ lấy lịch sử thuộc tài khoản đăng nhập và `session_id` yêu cầu, sắp xếp theo `created_at`, rồi `id` tăng dần; chưa phân trang.
- Tin user không có `parts`/`blocks`; tin assistant có hai trường này.
- `timestamp` là string ISO 8601 hoặc null; khác tên `created_at` ở chat response.
- ID lịch sử khác ID `msg_...` trả về lúc gửi; không dùng chúng làm cùng một ID để đối chiếu trực tiếp.
- Dữ liệu cũ thiếu parts sẽ được dựng lại text part từ answer. Assistant `content` tương ứng với `answer` lúc gửi.
- Session không có lịch sử trả `messages: []`.
- Session thiếu/sai regex trả HTTP 400 với `{"ok": false, "error": {"code": "INVALID_REQUEST", "message": "session_id is invalid."}}`; không có `answer`, `trace`, `status`.
- Lỗi database khi lưu chat được log và không làm request thành công biến thành lỗi; vì vậy có thể đã nhận câu trả lời nhưng không có lượt đó trong lịch sử.

## 8. Trace và giới hạn hiện tại

Trace thành công là array gồm các object thuộc ba dạng:

```typescript
type Trace =
  | { stage: 'model'; iteration: number; provider: string; model: string;
      kind: 'tool_call' | 'final' }
  | { stage: 'tool'; iteration: number; tool_name: string; ok: true;
      result_count: number; cached: boolean }
  | { stage: 'timing'; duration_ms: number };
```

`iteration` bắt đầu từ 0. Timing nằm cuối trace thành công. Khi agent ném lỗi, chat view trả `trace: []`, không trả trace chạy dở.

Mặc định tối đa 3 lần gọi model, 3 tool call/lần và 6 tool call/request. Giới hạn tool có thể được cấu hình trong môi trường với hard cap lần lượt 5 và 12. Cache tool chỉ tồn tại trong một request.

## 9. Những điểm cần biết khi tích hợp user/mobile

1. UI đầy đủ render `message.parts` theo thứ tự, sau đó render `blocks`. Client đơn giản có thể dùng `answer`, nhưng sẽ mất biểu đồ và card tour.
2. Mobile đọc `answer` khi gửi và `content` khi tải lịch sử. Các block `tour_list` hiển thị thành card có thể bấm để mở chi tiết theo ID. Với biểu đồ, mobile hiện dùng bản text `answer` làm fallback.
3. `session_id` hiện phục vụ lưu/lấy lịch sử. `chat()` chưa tải lịch sử để gửi model: `run_agent_loop()` khởi tạo bằng system prompt và câu hỏi hiện tại. Giữ nguyên session chưa tạo khả năng nhớ hội thoại nhiều lượt.
4. User thông thường chỉ được cấp tool tìm catalog và một tool sức khỏe đang bật: `rule` dùng `search_tours_by_health`, `ai_filter` dùng `search_tours_by_ai_filter`; tắt feature sức khỏe thì không cấp hai tool này.
5. Prompt yêu cầu không tự bịa giá/lịch/chỗ/chính sách, không đặt tour hay thực hiện giao dịch, không tiết lộ chỉ số sức khỏe cá nhân. Đây là chính sách prompt; response parser chưa có lớp kiểm chứng ngữ nghĩa hoặc lọc thông tin sức khỏe trong text.
6. Không hard-code schema tool output thành schema API: kết quả tool được dùng nội bộ để model trả lời và để backend tạo tour block.

## 10. Nguồn đối chiếu trong repository

- [Routing gốc](../backend/core/urls.py), [routing chatbot](../backend/apps/cms_chatbot/urls.py), [routing agent](../backend/apps/cms_chatbot/agent_pipeline/runtime/urls.py).
- [Chat/history API](../backend/apps/cms_chatbot/agent_pipeline/runtime/views.py), [request serializer](../backend/apps/cms_chatbot/agent_pipeline/runtime/serializers.py).
- [Agent loop, prompt, tour blocks, trace](../backend/apps/cms_chatbot/agent_pipeline/runtime/agent.py).
- [Parser và chart schema](../backend/apps/cms_chatbot/agent_pipeline/runtime/response_schema.py), [kiểm thử response schema](../backend/apps/cms_chatbot/agent_pipeline/test_response_schema.py).
- [Catalog và quyền tool](../backend/apps/cms_chatbot/agent_pipeline/tools/catalog.py), [tour adapter](../backend/apps/cms_chatbot/agent_pipeline/tools/tour_adapter.py), [tour service](../backend/apps/tours/services/tour_service.py).
- [Lưu/đọc lịch sử](../backend/apps/cms_chatbot/agent_pipeline/runtime/history.py), [provider và lỗi](../backend/apps/cms_chatbot/agent_pipeline/runtime/providers.py), [core contracts](../backend/apps/cms_chatbot/agent_pipeline/core.py).
- [Mobile repository](../mobile/lib/chat/data/chat_repository.dart), [khung chat mobile](../mobile/lib/chat/pages/chat_sheet.dart).
