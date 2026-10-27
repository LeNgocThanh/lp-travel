# Kế hoạch — AI Copilot và AI Agent

> Trạng thái 08/10/2026: mới ở giai đoạn định hướng, chưa triển khai code, database hoặc tích hợp nhà cung cấp AI. Ưu tiên khởi đầu bằng Copilot chỉ đọc và tạo đề xuất; chưa cho Agent tự ý ghi dữ liệu hoặc thực hiện hành động bên ngoài.

## Mục tiêu

Ứng dụng AI để giảm thời gian xử lý Lead, soạn nội dung, tạo bản nháp itinerary và giải thích báo cáo. AI phải hoạt động trong phạm vi session, vai trò, phòng ban, quyền tài nguyên và quyền cột hiện có của LP Travel.

Mục tiêu đầu tiên không phải chatbot tổng quát. Chức năng đầu tiên nên là nút **AI hỗ trợ** tại `/leads/[id]`, cung cấp:

- Tóm tắt yêu cầu của Lead.
- Liệt kê thông tin còn thiếu hoặc bất thường.
- Gợi ý bước chăm sóc tiếp theo.
- Soạn bản nháp tin nhắn WhatsApp hoặc email bằng tiếng Việt/Anh.
- Chỉ hiển thị đề xuất, không tự cập nhật Lead.

## Các nhóm chức năng đề xuất

### 1. Trợ lý Lead

- Chuẩn hóa Destination, Duration, số điện thoại và WhatsApp dưới dạng đề xuất.
- Gợi ý Lead Quality, Travel Type và Preferred Contact.
- Phát hiện dữ liệu quan trọng còn thiếu, Lead có nguy cơ bị quên hoặc gần Travel Date.
- Soạn nội dung chăm sóc theo ngôn ngữ và văn phong được chọn.
- Gợi ý khách hàng hoặc Lead nghi trùng; không tự hợp nhất.

### 2. Trợ lý itinerary

- Tạo bản nháp lịch trình từ Destination, Duration, Travel Date, số khách, sở thích và yêu cầu đặc biệt.
- Gợi ý tiêu đề, nội dung từng ngày, phương tiện, bữa ăn và lưu trú.
- Kiểm tra ngày thiếu/trùng và các điểm chưa hợp lý trong tuyến đi.
- Viết lại hoặc dịch nội dung Việt–Anh.
- Đưa kết quả vào cấu trúc itinerary hiện có; người dùng xem trước và xác nhận mới lưu.

### 3. Trợ lý báo cáo

- Diễn giải KPI, tỷ lệ chuyển đổi và biến động giữa các kỳ.
- Nhận diện Channel có nhiều Lead nhưng ít booking, Lead lâu chưa chăm sóc và nhân viên có dấu hiệu quá tải.
- Sinh bản nháp phần nhận xét/đề xuất cho báo cáo tuần hoặc tháng.
- PostgreSQL và code nghiệp vụ chịu trách nhiệm lọc, đếm, cộng tiền và tính tỷ lệ; AI chỉ diễn giải số liệu đã được tính sẵn.

### 4. Tìm kiếm bằng ngôn ngữ tự nhiên

Ví dụ: “Lead nào đi Đà Nẵng trong tháng tới nhưng chưa gửi báo giá?”. Agent chuyển yêu cầu thành bộ lọc có cấu trúc, hiển thị điều kiện đã hiểu và gọi công cụ tìm kiếm giới hạn. Không cho mô hình sinh hoặc chạy SQL tùy ý.

### 5. Hỗ trợ tài liệu và Invoice

- Gợi ý Description, Inclusions, Exclusions và Notes.
- Kiểm tra dữ liệu còn thiếu hoặc khác nhau giữa Lead, itinerary và Invoice.
- Soạn nội dung gửi khách.
- Mọi phép tính Amount, Deposit, Balance, VAT và Due Date tiếp tục do code nghiệp vụ thực hiện.

## Phân biệt AI action, workflow và Agent

| Nhu cầu | Giải pháp dự kiến |
| --- | --- |
| Tóm tắt, dịch hoặc viết lại nội dung | Một AI action với đầu vào/đầu ra có schema. |
| Sinh bản nháp itinerary | Workflow có các bước cố định và bước xác nhận. |
| Hỏi dữ liệu bằng ngôn ngữ tự nhiên | Agent chỉ đọc, chỉ gọi các tool đã giới hạn. |
| Đề xuất cập nhật nhiều trường | Agent tạo proposal; người dùng xác nhận mới ghi. |
| Cảnh báo chạy định kỳ | Job/rule engine tính đối tượng; chỉ gọi AI khi cần diễn giải. |

Không dùng Agent cho quy trình có thể giải quyết chính xác và rẻ hơn bằng rule hoặc code thông thường.

## Kiến trúc dự kiến

```text
Người dùng
   │
   ▼
AI Copilot trong LP Travel
   │
   ├── Kiểm tra session, role, cây phòng ban, quyền tài nguyên và quyền cột
   ├── Lọc/che dữ liệu nhạy cảm trước khi gửi tới model
   ├── Gọi tool nghiệp vụ có schema và giới hạn phạm vi
   │     ├── search_leads
   │     ├── get_lead
   │     ├── summarize_lead
   │     ├── draft_itinerary
   │     ├── analyze_performance
   │     └── propose_lead_update
   ├── Hiển thị nguồn dữ liệu, thay đổi dự kiến và bước xác nhận
   ▼
Service/server action hiện có ──> Prisma ──> PostgreSQL
```

Model không nhận `DATABASE_URL`, không truy cập Prisma trực tiếp và không được tự tạo tool. Mỗi tool phải kiểm tra quyền ở server, giới hạn số bản ghi, thời gian thực thi và kích thước kết quả.

## Quyền và nguyên tắc an toàn

- AI chỉ đọc những Lead và những cột mà chính user đang đăng nhập được phép đọc.
- Không đưa CCCD, thông tin thanh toán hoặc dữ liệu nhạy cảm vào prompt nếu tác vụ không cần thiết.
- Không cho AI bỏ qua `LEADS.READ`, `canRead`, `canWrite` hoặc phạm vi phòng ban.
- Giai đoạn đầu không cho AI tự xóa, hợp nhất, thay Assigned To, đặt Confirmed, thay dữ liệu tiền hoặc thanh toán.
- Không tự gửi WhatsApp/email, xuất bản tài liệu hoặc gọi hệ thống bên ngoài khi chưa có xác nhận rõ ràng.
- Nội dung AI sinh phải được đánh dấu là bản nháp. UI cần cho biết dữ liệu nguồn và trường nào sẽ thay đổi.
- Tool ghi dữ liệu phải kiểm tra lại quyền và `updatedAt` tại thời điểm xác nhận để tránh ghi đè thay đổi mới.
- Áp dụng rate limit, giới hạn token/chi phí, timeout và audit mọi tool call.

## Dữ liệu đề xuất

- `AiConversation`: phiên trao đổi, user sở hữu, ngữ cảnh module và thời gian tạo/cập nhật.
- `AiMessage`: vai trò message, nội dung đã lọc, model và thời gian; cần chính sách không lưu hoặc rút gọn dữ liệu nhạy cảm.
- `AiRun`: một lần thực thi, mục đích, trạng thái, model, thời gian, token và chi phí ước tính.
- `AiToolCall`: tên tool, đầu vào/đầu ra đã lọc, trạng thái, lỗi và thời gian chạy.
- `AiProposal`: loại thay đổi, dữ liệu trước/sau, trạng thái `PENDING`, `APPROVED`, `REJECTED`, người xác nhận và thời gian.
- `AiFeedback`: đánh giá hữu ích/không hữu ích và ghi chú để đo chất lượng.

Trước khi tạo migration cần chốt thời hạn lưu message/prompt, trường nào phải che, quyền xem audit và cơ chế xóa dữ liệu theo chính sách nội bộ.

## Lộ trình triển khai

### AI-1 — Copilot Lead chỉ đọc

- Nút **AI hỗ trợ** tại `/leads/[id]`.
- Tóm tắt, dữ liệu thiếu, gợi ý chăm sóc và bản nháp tin nhắn.
- Đầu ra theo schema cố định; không có tool ghi dữ liệu.
- Ghi nhận usage, thời gian phản hồi và feedback.

### AI-2 — Itinerary Assistant

- Sinh itinerary nháp từ Lead và yêu cầu bổ sung của nhân viên.
- Preview phần được tạo/thay đổi.
- Người dùng xác nhận mới lưu vào cấu trúc itinerary hiện có.

### AI-3 — Hỏi đáp và báo cáo

- Tìm Lead bằng câu tự nhiên qua bộ lọc có cấu trúc.
- Giải thích dashboard/hiệu suất và tạo nhận xét báo cáo.
- Hiển thị kỳ thống kê, bộ lọc, số liệu nguồn và liên kết tới danh sách kiểm chứng.

### AI-4 — Agent nhiều bước

- Cho phép lập danh sách và tạo nhiều proposal, ví dụ tìm Lead sắp đi nhưng chưa có itinerary rồi tạo bản nháp.
- Xác nhận theo từng proposal hoặc theo lô trước khi ghi.
- Chỉ mở các tool ghi sau khi AI-1 đến AI-3 có số liệu chất lượng, chi phí và audit ổn định.

## Chỉ số đánh giá

- Tỷ lệ nhân viên sử dụng đề xuất và tỷ lệ proposal được chấp nhận.
- Thời gian tiết kiệm khi xử lý Lead hoặc tạo itinerary.
- Tỷ lệ kết quả phải sửa nhiều, phản hồi không hữu ích và lỗi dữ liệu.
- Chi phí trung bình trên Lead, itinerary và báo cáo.
- Số lần tool bị từ chối do quyền, input không hợp lệ hoặc xung đột dữ liệu.
- Không có sự cố lộ cột ngoài quyền hoặc hành động ghi ngoài xác nhận.

## Cần xác nhận trước khi triển khai

1. Nhà cung cấp/model AI, khu vực xử lý dữ liệu và chính sách không dùng dữ liệu để huấn luyện.
2. Ngân sách, giới hạn sử dụng theo user/phòng ban và model dự phòng.
3. Dữ liệu nào được phép gửi ra ngoài hệ thống; thời hạn lưu prompt, response và audit.
4. Ngôn ngữ, văn phong và mẫu tin nhắn chuẩn của LP Travel.
5. Phạm vi phòng ban đối với tìm kiếm Lead và báo cáo tổng hợp.
6. Tiêu chí chất lượng tối thiểu trước khi mở tool tạo proposal hoặc ghi dữ liệu.

## Tiêu chí hoàn thành AI-1

- User không thể dùng AI để đọc Lead hoặc cột ngoài quyền hiện có.
- Kết quả có cấu trúc ổn định, được đánh dấu là bản nháp và không tự thay đổi dữ liệu.
- Mọi lần chạy có audit, usage, trạng thái lỗi và feedback tối thiểu.
- Có rate limit, timeout, xử lý khi nhà cung cấp AI lỗi và không làm gián đoạn luồng Lead thông thường.
- Có bộ test quyền, prompt injection từ dữ liệu Lead, dữ liệu nhạy cảm và đầu ra sai schema.
