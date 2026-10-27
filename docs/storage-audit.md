# Audit và phiên bản file

## Phạm vi giai đoạn 1

Uploader là nguồn dữ liệu chính cho metadata file và lịch sử thao tác. LP Travel vẫn quản lý user/quyền, sau đó gửi danh tính user đã ký khi gọi uploader.

Các thao tác đang được ghi nhận:

- `FILE_UPLOAD`
- `FILE_VERSION_UPLOAD`
- `FILE_DOWNLOAD`
- `FILE_DELETE`
- `FILE_RESTORE`
- `FILE_PURGE`
- `VERSION_DOWNLOAD`
- `VERSION_RESTORE`
- `FILE_EDIT_SAVE`

Audit lưu actor, API token, file, version, folder, thời gian, request ID, IP, user-agent và metadata tại thời điểm thao tác.

## Metadata

- `UploadedFile` là file logic và giữ `currentVersion`.
- `FileVersion` lưu version, storage key, MIME, kích thước và SHA-256.
- `AuditEvent` là lịch sử thao tác; ứng dụng không cập nhật hoặc xóa bản ghi audit.
- File mới có version 1 và checksum SHA-256.
- Migration tạo version 1 cho file cũ; checksum của file cũ để trống vì migration database không đọc nội dung trên filesystem.

## Xác thực actor

LP Travel sử dụng `UPLOADER_ACTOR_SIGNING_SECRET`; uploader xác minh bằng `ACTOR_SIGNING_SECRET`. Hai giá trị phải giống nhau.

Chữ ký bao gồm timestamp, request ID, user ID, username, role và trạng thái Root Admin. Chữ ký chỉ hợp lệ trong năm phút. Header actor không hợp lệ hoặc không có secret sẽ không được tin cậy; audit khi đó ghi nhận API token.

## Xóa file

Delete giữ nội dung vật lý và đánh dấu `UploadedFile.deletedAt`; các API list/read không trả file này. Admin có thể khôi phục file từ thùng rác.

Xóa vĩnh viễn loại bỏ nội dung của toàn bộ version trên filesystem và đặt `purgedAt`, nhưng vẫn giữ metadata cùng audit. File bị xóa vật lý bởi phiên bản ứng dụng cũ không thể khôi phục nếu nội dung không còn trên ổ đĩa.

## Trang quản trị giai đoạn 2

Trang `/admin` của uploader có:

- Lịch sử hoạt động và bộ lọc theo hành động, user, file, folder, thời gian.
- Thùng rác với thao tác khôi phục và xóa vĩnh viễn.
- Liên kết tải nội dung của từng version còn tồn tại trên filesystem.

## Quản lý version giai đoạn 3

- File Manager LP Travel hiển thị lịch sử version trong panel thông tin.
- User có `canUpload` được tải phiên bản mới.
- User có cả `canRead` và `canUpload` được khôi phục version cũ thành một version mới.
- Upload/restore phải gửi `If-Match` bằng ID version hiện hành. Uploader trả `409 Conflict` nếu file đã thay đổi từ lúc client tải danh sách.
- `MAX_FILE_VERSIONS` của uploader giới hạn số version mỗi file; mặc định là 20. Khi đạt giới hạn, hệ thống từ chối tạo thêm thay vì tự xóa lịch sử.

## Chỉnh sửa trực tuyến giai đoạn 4

- Chỉ file text/code được chỉnh sửa trực tiếp; file nhị phân, Office, PDF và media không đi qua editor này.
- Khi mở editor, uploader cấp edit lock có token ngẫu nhiên và chỉ lưu hash trong PostgreSQL.
- Editor gửi heartbeat mỗi phút. Lock mặc định hết hạn sau năm phút nếu client mất kết nối.
- Nội dung đang gõ được autosave thành `FileDraft`; draft không phải là version chính thức.
- Bấm lưu sẽ kiểm tra edit lock và `If-Match`, sau đó tạo `FileVersion` mới và audit `FILE_EDIT_SAVE`.
- Draft dựa trên version cũ không được ghi đè version mới. User có thể nạp lại nội dung hiện tại để tiếp tục.
- Editor cho phép so sánh song song hai version text/code.
- Giới hạn mặc định của editor là 2 MB, cấu hình bằng `MAX_EDITABLE_FILE_SIZE_MB`; thời hạn lock cấu hình bằng `EDIT_LOCK_MINUTES`.
