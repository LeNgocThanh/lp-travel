# Giai đoạn 4 — Chat nội bộ

> Trạng thái 22/09/2026: hoãn triển khai để ưu tiên [CRM khách hàng](./crm.md). Chat chỉ được xem xét lại sau khi CRM-1 và CRM-2 ổn định; chat không thay lịch sử chăm sóc khách hàng, activity hồ sơ hoặc trao đổi task.

## Mục tiêu và phạm vi

Chat 1-1 và nhóm theo lời mời, lưu lịch sử tin nhắn, danh sách hội thoại và trạng thái đã đọc. Chat theo phòng ban hoặc bot tự động là phần mở rộng nếu cần. Bản đầu ưu tiên quyền truy cập và lưu trữ chính xác trước tính năng realtime nâng cao.

## Dữ liệu đề xuất

- `Conversation`: `id`, `type` (`DIRECT`, `GROUP`), `name?`, actor tạo, thời gian tạo/cập nhật. Hội thoại direct cần ràng buộc cặp user không tạo trùng (định danh cặp theo thứ tự cố định, transaction/unique DB).
- `ConversationMember`: `conversationId`, `userId`, `role` (`OWNER`, `MEMBER`), `joinedAt`, `leftAt?`, `lastReadMessageId?` hoặc `lastReadAt?`. Lưu lịch sử thành viên để xác định phạm vi đọc tin cũ.
- `Message`: `id`, `conversationId`, sender, `body`, `createdAt`, `editedAt?`, `deletedAt?`; thứ tự ổn định bằng timestamp + id. `MessageAttachment` chỉ tham chiếu file uploader khi quyền file đã giải quyết.
- Chỉ mục cho conversation + thứ tự tin, membership theo user, danh sách hội thoại cập nhật gần nhất. Phân trang lịch sử bằng cursor.

## Quyền và luồng

- Chỉ thành viên đang hoạt động xem/gửi tin; server kiểm tra membership trên mọi thao tác và luồng nhận realtime. User bị loại khỏi nhóm không nhận tin mới. Chính sách xem lịch sử trước khi gia nhập/sau khi rời nhóm phải chốt (mặc định: chỉ tin từ lúc gia nhập, không xem sau khi rời).
- Admin hệ thống không mặc nhiên đọc chat riêng; quyền hỗ trợ/điều tra cần cơ chế riêng, có audit và chính sách pháp lý/nội bộ. Không đưa nội dung chat vào API danh bạ hoặc dashboard chung.
- Tin nhắn có giới hạn độ dài, chống spam/rate limit, escape/sanitize nội dung khi render; attachment kiểm tra MIME/kích thước/quyền file và không lộ uploader token.
- UI dự kiến `/chat`, danh sách hội thoại, khung tin nhắn, tạo nhóm, chỉ báo chưa đọc. Mobile/responsive và trạng thái kết nối lại cần kiểm thử.

## Realtime và vận hành

- Trước tiên lưu message vào PostgreSQL và cung cấp API gửi/đọc có cursor, kiểm tra quyền đầy đủ. Sau đó chọn SSE, WebSocket hoặc dịch vụ pub/sub phù hợp hạ tầng deploy; việc chọn transport cần khảo sát khả năng chạy kết nối dài của môi trường hiện tại.
- Nếu có nhiều instance, fan-out không được chỉ dựa vào bộ nhớ một process. Cần pub/sub hoặc cơ chế tương đương; sự kiện realtime chỉ là tín hiệu, client vẫn đồng bộ lại từ database sau reconnect/missed event.
- Chốt thời hạn lưu giữ, backup, quyền xóa/sửa tin và chính sách xử lý khi user nghỉ việc trước khi dùng production. Mặc định không xóa cứng tin ở UI; nếu cho phép thu hồi, vẫn giữ dấu vết phù hợp chính sách.

## Trình tự thực hiện

1. Chốt quyền riêng tư, lịch sử khi thay đổi membership, thời hạn lưu giữ và quyền tạo nhóm.
2. Migration conversation/member/message, API gửi/đọc và test quyền; triển khai UI với tải lại/polling đơn giản để xác minh dữ liệu.
3. Thêm transport realtime và unread state; thử ngắt kết nối, reconnect và nhiều instance.
4. Thêm attachment, tìm kiếm hoặc thông báo ngoài app theo nhu cầu và sau khi kiểm tra bảo mật.

## Tiêu chí hoàn thành

- Không tạo hai direct conversation cho cùng cặp user dưới tải đồng thời.
- Người ngoài hội thoại, người đã rời và user inactive không nhận/gửi được tin trái quyền.
- Tin nhắn không mất/trùng khi reconnect; lịch sử và unread nhất quán giữa các thiết bị.
- Quyền riêng tư và chính sách lưu giữ đã được chốt, ghi trong docs và có test tương ứng.
