# Giai đoạn giao việc trong hồ sơ du lịch

## Trạng thái triển khai (21/09/2026)

- Đã có `WorkTask`, `WorkTaskAssignment` và giao một người thực hiện ban đầu từ trang chi tiết hồ sơ.
- Đã có `/tasks?view=kanban` theo năm trạng thái và `/tasks?view=timeline` sắp theo ngày bắt đầu/hạn. Kanban hiện đổi trạng thái bằng form xác nhận, chưa kéo-thả realtime.
- Admin xem mọi task; Manager xem task của hồ sơ thuộc phòng mình; người tiếp nhận xem task trong hồ sơ; người được giao xem task và hồ sơ liên quan. Server kiểm tra lại quyền khi đổi trạng thái.
- Thay đổi task được ghi vào `WorkCaseActivity`. Chưa có sửa nội dung/người được giao, nhiều assignee qua UI, comment, notification, drag-and-drop hoặc phân trang.
- Migration `20260921140000_add_bookings_and_tasks` chưa được chạy trên database triển khai trong lượt này.

> Tài liệu này được đọc cùng [mô hình nghiệp vụ du lịch](./travel-domain.md). `WorkCase` là hồ sơ/yêu cầu; task chỉ là một bước được giao trong hồ sơ. Các đề xuất board độc lập bên dưới cần được đánh giá lại sau khi chốt quy trình hồ sơ, không triển khai như task rời rạc.

## Mục tiêu và phạm vi

Cho phép phòng ban giao các bước xử lý của một hồ sơ du lịch/đặt dịch vụ cho người phụ trách, theo dõi tiến độ ở dạng danh sách/board, thảo luận và xem lịch sử. Bản đầu không làm quản lý dự án phức tạp, chấm công hay tự động hóa quy trình.

## Dữ liệu đề xuất

- Board trước mắt là **cách xem** các `WorkTask` theo phòng ban/trạng thái, không bắt buộc có bảng `TaskBoard` riêng. Chỉ thêm cấu trúc board riêng khi có nhu cầu quy trình khác nhau giữa các nhóm.
- `WorkTask` (tên `Task` có thể dùng nếu không gây nhầm): `id`, `workCaseId`, `title`, `description?`, `status` (`TODO`, `IN_PROGRESS`, `BLOCKED`, `DONE`, `CANCELLED`), `priority`, `dueAt?`, `createdAt`, `updatedAt`, thông tin actor tạo/sửa theo quy tắc chung. Không tạo task giao việc thiếu hồ sơ gốc trong bản đầu.
- `TaskAssignment`: `workTaskId`, `userId`, vai trò `ASSIGNEE`/`WATCHER` nếu cần. Bản đầu có thể giới hạn một người chịu trách nhiệm chính nhưng thiết kế bảng quan hệ để hỗ trợ nhiều người sau.
- `TaskComment`, `TaskActivity` (thay đổi người được giao, trạng thái, hạn, nội dung), `TaskAttachment` (tham chiếu file uploader) bổ sung theo thứ tự comment/activity trước, attachment sau khi đã chốt quyền file.
- Chỉ mục cho `workCaseId + status`, `dueAt`, user được giao và thời gian cập nhật; phân trang với danh sách dài.

## Quyền và luồng

- Admin: xem/quản lý mọi bảng và task. Manager: tạo/giao/sửa task trong phòng mình. Member: thấy task của phòng theo chính sách chốt; mặc định thấy task được giao/tham gia và task được công khai trong board phòng, chỉ sửa trạng thái task mình được giao, bình luận trên task được xem.
- Server xác nhận assignee đang active và thuộc phạm vi cho phép tại thời điểm giao. Quyền đọc task phải được kiểm lại khi lấy bình luận, hoạt động và attachment, kể cả khi user mở URL trực tiếp.
- Giao việc, đổi trạng thái/hạn, bình luận tạo activity bất biến và thông báo cho người liên quan. Không xóa cứng task đã có lịch sử; dùng trạng thái hủy/lưu trữ.
- UI dự kiến: `/work` (hồ sơ), `/tasks` (việc được giao, lọc phòng/trạng thái/hạn), `/work/[id]` (chi tiết hồ sơ, bước xử lý, lịch sử). Luồng tạo và giao việc có kiểm tra quyền trước khi hiện lựa chọn.

## Trình tự thực hiện

1. Chốt visibility của hồ sơ (toàn phòng hay chỉ người tham gia), số assignee và quy tắc task khi hồ sơ chuyển phòng.
2. Sau schema `WorkCase`, thêm migration task/assignment/activity; API kiểm tra quyền và transaction ghi task + activity.
3. UI danh sách/board, chi tiết hồ sơ, giao việc và đổi trạng thái; lọc/phân trang ở server.
4. Thông báo trong app; sau đó mới thêm comment và attachment khi quyền file đã chốt.

## Tiêu chí hoàn thành

- Manager giao việc đúng phạm vi; user ngoài phạm vi không thể đọc/sửa qua API hoặc URL trực tiếp.
- Đổi trạng thái/người được giao tạo lịch sử và thông báo đúng người; thao tác lỗi không ghi activity giả.
- User inactive không được giao mới; task cũ và tên người phụ trách cũ vẫn truy vết được.
- Danh sách/board hoạt động khi có nhiều task, không tải toàn bộ dữ liệu lên browser.
