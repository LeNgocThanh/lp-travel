# Giai đoạn 3 — Bảng tin nội bộ

## Mục tiêu và phạm vi

> Trạng thái 21/09/2026: đã triển khai schema, migration, feed `/news`, trang chi tiết, nháp/đăng/sửa/ghim/lưu trữ, audience toàn công ty/phòng ban, bình luận và thông báo trong ứng dụng. Chưa có attachment, duyệt bài, đăng lịch, reaction hoặc xác nhận đã đọc riêng theo từng bài.

Đăng thông báo/tin nội bộ có phạm vi rõ ràng: toàn công ty hoặc một/vài phòng ban. Bản đầu có soạn nháp, đăng, ghim/lưu trữ, danh sách theo thời gian và bình luận. Duyệt bài, đăng lịch, reaction, xác nhận đã đọc và thông báo email để giai đoạn sau nếu có nhu cầu.

Bảng tin không lưu tiến độ xử lý hồ sơ du lịch. Nếu bài viết gắn `WorkCase`, chỉ lưu tham chiếu/link; người mở vẫn phải có quyền đọc hồ sơ. Thay đổi quan trọng của hồ sơ nằm trong `WorkCaseActivity`, không tự động xuất toàn bộ lên bảng tin.

## Dữ liệu đề xuất

- `Post`: `id`, `title`, `body`, `status` (`DRAFT`, `PUBLISHED`, `ARCHIVED`), `audienceType` (`ALL`, `DEPARTMENTS`), `publishedAt?`, `pinnedAt?`, actor tạo/sửa, thời gian tạo/sửa.
- `PostAudienceDepartment`: cặp `postId`/`departmentId` khi chọn phạm vi phòng ban. Không suy diễn phạm vi từ nội dung text.
- `PostComment`: `postId`, tác giả, nội dung, thời gian tạo/sửa; lưu trạng thái ẩn nếu cần moderation. `PostAttachment` là tham chiếu uploader khi đã giải quyết quyền file.
- Chỉ mục cho trạng thái, ngày đăng và phạm vi; feed có phân trang/cursor. Nếu sau này cần xác nhận đã đọc, thêm `PostRead` thay vì lưu danh sách người đọc trong một trường JSON.

## Quyền và luồng

- Admin: đăng mọi phạm vi. Manager: mặc định chỉ đăng tin cho phòng mình; user thường xem và bình luận tin mà họ có quyền xem. Việc cho phép user thường đăng bài cần chốt riêng.
- Draft chỉ tác giả và Admin xem. Tin đã đăng được lọc theo membership hiện tại; cần chốt liệu người vừa chuyển phòng có xem tin cũ của phòng mới không (mặc định: có). Bài lưu trữ không hiện trong feed thông thường.
- Kiểm tra audience trên server khi đọc bài, bình luận và file đính kèm; không chỉ lọc trên UI. Thông báo phát theo audience tại thời điểm đăng; tránh gửi cho user inactive.
- UI dự kiến `/news` và `/news/[id]`, trang soạn/quản lý nằm trong cùng khu vực hoặc admin tùy quyền; hỗ trợ tìm kiếm/ghim.

## Trình tự thực hiện

1. Chốt người được đăng, phạm vi và chính sách chuyển phòng/xóa bình luận.
2. Migration post/audience/comment; API lọc quyền và transaction publish + notification.
3. UI feed, chi tiết, soạn nháp/đăng/ghim; kiểm thử direct URL và audience thay đổi.
4. Tích hợp attachment sau khi chốt folder và quyền file.

## Tiêu chí hoàn thành

- User chỉ thấy bài đúng audience; không lấy được bài ngoài quyền qua API, tìm kiếm hoặc attachment.
- Draft không xuất hiện trong feed; publish/ghim/lưu trữ đúng thứ tự và trạng thái.
- Comment và thông báo gắn đúng bài, tác giả; user inactive không bình luận được.
