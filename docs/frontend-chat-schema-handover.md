# Tài liệu Bàn giao API Contract: AI Agent Chat & Response Schema (Text & Chart)

**Dành cho:** Frontend Team (Web & Mobile)  
**Endpoint:** `POST /api/v1/cms-chatbot/agent/chat/`  
**Phiên bản:** 2.0  
**Ngày cập nhật:** 2026-11-05  

---

## 1. Tổng quan Endpoint

- **URL:** `/api/v1/cms-chatbot/agent/chat/`
- **Method:** `POST`
- **Headers:**
  ```http
  Content-Type: application/json
  Authorization: Bearer <access_token>
  ```
- **Xác thực:** Bắt buộc (Customer, Vendor, hoặc Admin đều dùng chung endpoint này, Backend tự phân quyền theo Role trong JWT).

---

## 2. Request Schema (Frontend gửi lên)

### 2.1 Cấu trúc JSON

```json
{
  "message": "Cho tôi xem báo cáo doanh thu theo tháng",
  "session_id": "web-1730800000000-xyz123"
}
```

### 2.2 Bảng mô tả các trường Request

| Trường | Kiểu | Bắt buộc | Mô tả |
| :--- | :--- | :---: | :--- |
| `message` | `string` | **Có** | Nội dung câu hỏi/yêu cầu của người dùng (1 – 4000 ký tự). |
| `session_id` | `string` | **Có** | ID phiên chat (regex `^[A-Za-z0-9._:-]{1,128}$`). Giữ nguyên trong một cuộc hội thoại. |
| `conversation_id` | `string` | Không | Bí danh (alias) của `session_id`. Nếu gửi trường này có thể bỏ qua `session_id`. |
| `data` | `object` | Không | Dataset tùy chọn nếu client chủ động truyền bảng số liệu lên (thường dùng khi client có sẵn bảng cần AI phân tích). |

---

## 3. Response Schema (Backend trả về)

### 3.1 Cấu trúc Thành công (HTTP 200)

```json
{
  "ok": true,
  "session_id": "web-1730800000000-xyz123",
  "conversation_id": "web-1730800000000-xyz123",
  "answer": "Doanh thu tăng trưởng mạnh từ tháng 5 đến tháng 9, đạt mức cao nhất vào tháng 9 với 42.1 triệu VND...",
  "message": {
    "id": "msg_8d75b942ab42492bb60a3d9f5a43c136",
    "role": "assistant",
    "parts": [
      {
        "type": "text",
        "text": "Doanh thu tăng trưởng mạnh từ tháng 5 đến tháng 9, đạt mức cao nhất vào tháng 9 với 42.1 triệu VND..."
      },
      {
        "type": "chart",
        "chart": {
          "type": "bar",
          "title": "Doanh thu toàn hệ thống theo tháng (VND)",
          "description": "Đơn vị: VND",
          "xField": "label",
          "series": [
            {
              "field": "revenue",
              "name": "Doanh thu",
              "type": "bar"
            }
          ],
          "data": [
            { "label": "Tháng 5/2026", "revenue": 18500000 },
            { "label": "Tháng 6/2026", "revenue": 24200000 },
            { "label": "Tháng 7/2026", "revenue": 38900000 },
            { "label": "Tháng 8/2026", "revenue": 31400000 },
            { "label": "Tháng 9/2026", "revenue": 42100000 },
            { "label": "Tháng 10/2026", "revenue": 7102000 }
          ]
        }
      }
    ],
    "created_at": "2026-11-05T07:37:15.691698+00:00"
  },
  "blocks": [],
  "trace": [],
  "status": "OK",
  "error": null
}
```

### 3.2 Quy cách chi tiết của `message.parts`

Tin nhắn phản hồi của trợ lý chứa mảng `parts`. Mỗi part có thể là **`text`** hoặc **`chart`**:

#### A. Text Part (`type: "text"`)
Dùng để render văn bản nhận xét, giải thích:
```json
{
  "type": "text",
  "text": "Nội dung văn bản (hỗ trợ định dạng Markdown)..."
}
```

#### B. Chart Part (`type: "chart"`)
Dùng để render biểu đồ trực quan:
```json
{
  "type": "chart",
  "chart": {
    "type": "bar",
    "title": "Tiêu đề biểu đồ",
    "description": "Mô tả phụ hoặc đơn vị (ví dụ: Đơn vị: VND)",
    "xField": "tên trường trục hoành (ví dụ: label)",
    "series": [
      {
        "field": "tên trường lấy số liệu trong data",
        "name": "Nhãn hiển thị ở chú thích/tooltip",
        "type": "bar"
      }
    ],
    "data": [
      { "label": "Tháng 5", "revenue": 18500000 },
      { "label": "Tháng 6", "revenue": 24200000 }
    ]
  }
}
```

**Các thuộc tính của `chart`:**
- `chart.type`: Chuỗi biểu thị loại biểu đồ (`bar`, `line`, `pie`, `area`, `column`).
- `chart.title`: Tiêu đề biểu đồ.
- `chart.description`: Mô tả phụ / đơn vị tiền tệ hoặc số lượng.
- `chart.xField`: Tên trường trong mỗi bản ghi `data` làm nhãn trục hoành (X-axis).
- `chart.series`: Mảng định nghĩa các đường/cột dữ liệu:
  - `field`: Tên trường giá trị cần vẽ trong mỗi bản ghi của `data`.
  - `name`: Tên series hiển thị ở Legend / Tooltip.
  - `type`: Loại biểu đồ con cho series (thường trùng với `chart.type`).
- `chart.data`: Mảng danh sách các object dữ liệu thực tế.

---

## 4. TypeScript Types (Khuyến nghị cho Frontend)

```typescript
export interface TextPart {
  type: 'text';
  text: string;
}

export interface ChartSeries {
  field: string;
  name: string;
  type?: 'bar' | 'line' | 'pie' | 'area';
}

export interface ChartDefinition {
  type: 'bar' | 'line' | 'pie' | 'area';
  title: string;
  description?: string;
  xField: string;
  series: ChartSeries[];
  data: Record<string, any>[];
}

export interface ChartPart {
  type: 'chart';
  chart: ChartDefinition;
}

export type MessagePart = TextPart | ChartPart;

export interface AssistantMessage {
  id: string;
  role: 'assistant' | 'user';
  parts?: MessagePart[];
  content?: string; // Fallback text nếu dùng phiên bản cũ
  created_at: string;
}

export interface ChatResponse {
  ok: boolean;
  session_id: string;
  conversation_id: string;
  answer: string;
  message: AssistantMessage;
  blocks?: any[];
  status: 'OK' | 'ERROR';
  error: { code: string; message: string } | null;
}
```

---

## 5. Hướng dẫn Frontend Render Chatbox

### 5.1 Xử lý tin nhắn trong React

Khi nhận `response` từ backend, lưu `response.message` vào danh sách tin nhắn. Khi render bubble của Assistant:

```tsx
function AssistantBubble({ message }: { message: AssistantMessage }) {
  // Nếu backend trả về parts (phiên bản mới)
  if (message.parts && message.parts.length > 0) {
    return (
      <div className="assistant-bubble space-y-4">
        {message.parts.map((part, index) => {
          if (part.type === 'text') {
            return <div key={index} className="text-content whitespace-pre-line">{part.text}</div>;
          }
          if (part.type === 'chart') {
            return <DynamicChartRenderer key={index} chart={part.chart} />;
          }
          return null;
        })}
      </div>
    );
  }

  // Fallback cho tin nhắn cũ chỉ có text
  return <div className="text-content">{message.content}</div>;
}
```

### 5.2 Gợi ý vẽ biểu đồ bằng Recharts hoặc Chart.js / ECharts

Ví dụ với **Recharts**:
```tsx
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';

function DynamicChartRenderer({ chart }: { chart: ChartDefinition }) {
  return (
    <div className="chart-container bg-white p-4 rounded-xl border border-gray-200 shadow-sm my-3">
      {chart.title && <h4 className="font-semibold text-gray-800 text-sm mb-1">{chart.title}</h4>}
      {chart.description && <p className="text-xs text-gray-500 mb-3">{chart.description}</p>}

      <div className="w-full h-64">
        <ResponsiveContainer width="100%" height="100%">
          {chart.type === 'line' ? (
            <LineChart data={chart.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={chart.xField} />
              <YAxis />
              <Tooltip />
              {chart.series.map((s) => (
                <Line key={s.field} type="monotone" dataKey={s.field} name={s.name} stroke="#4a6b5d" strokeWidth={2} />
              ))}
            </LineChart>
          ) : (
            <BarChart data={chart.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={chart.xField} />
              <YAxis />
              <Tooltip />
              {chart.series.map((s) => (
                <Bar key={s.field} dataKey={s.field} name={s.name} fill="#4a6b5d" radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

---

## 6. Xử lý Lỗi (Error Handling)

Khi gặp lỗi nghiệp vụ hoặc kỹ thuật, Backend trả về HTTP Status tương ứng (`400`, `401`, `429`, `502`, `503`, `504`) kèm envelope:

```json
{
  "ok": false,
  "session_id": "web-1730800000000-xyz123",
  "answer": "",
  "trace": [],
  "status": "ERROR",
  "error": {
    "code": "PROVIDER_TIMEOUT",
    "message": "Trợ lý phản hồi chậm, vui lòng thử lại."
  }
}
```

### Bảng mã lỗi thường gặp:

| Mã lỗi (`code`) | HTTP Status | Thông báo gợi ý cho Frontend |
| :--- | :---: | :--- |
| `INVALID_REQUEST` | `400` | Tin nhắn không hợp lệ, vui lòng kiểm tra lại. |
| `UNAUTHENTICATED` | `401` | Phiên đăng nhập hết hạn, chuyển hướng về trang đăng nhập. |
| `FORBIDDEN` | `403` | Bạn không có quyền truy cập dữ liệu này. |
| `AGENT_DISABLED` | `503` | Trợ lý ảo đang bảo trì, vui lòng quay lại sau. |
| `PROVIDER_TIMEOUT` | `504` | Trợ lý phản hồi chậm, vui lòng thử lại. |
| `MODEL_PROVIDER_ERROR` | `502` | Dịch vụ AI tạm gián đoạn. |
| `429 Too Many Requests`| `429` | Bạn gửi tin nhắn quá nhanh, vui lòng chờ ít giây. |

