# Kiến trúc hệ thống

## Tổng quan

```text
Browser
  │ session cookie
  ▼
LP Travel (Next.js)
  ├─ PostgreSQL riêng: User + FolderPermission
  ├─ kiểm tra session và quyền user
  └─ API proxy dùng UPLOADER_API_TOKEN + actor được ký HMAC
          │ Bearer token
          ▼
nextjs-multi-webhook-uploader
  ├─ PostgreSQL: Folder + ApiToken + UploadedFile + FileVersion + AuditEvent + FileDraft + FileEditLock
  └─ /mnt/data/uploads: nội dung file vật lý
```

## Authentication và session

- Root Admin sử dụng `ROOT_ADMIN_USERNAME` và `ROOT_ADMIN_PASSWORD` trong environment.
- User thông thường được lưu trong PostgreSQL; mật khẩu được băm bằng bcrypt với cost 12.
- Session là JWT ký HS256 bằng `SESSION_SECRET`.
- Cookie `lp_travel_session` có `httpOnly`, `sameSite=lax`, `secure` ở production và thời hạn 8 giờ.
- Mỗi lần đọc session của user database, ứng dụng kiểm tra lại user còn tồn tại và đang hoạt động.
- Root Admin đổi mật khẩu bằng environment; user database đổi mật khẩu tại `/profile`.

## Role

- `ADMIN`: truy cập trang quản lý user và có thể tạo, sửa, khóa hoặc xóa user.
- `USER`: sử dụng kho tài liệu theo các quyền folder được cấp.
- Root Admin luôn có role `ADMIN` và bỏ qua lớp quyền folder của LP Travel. Uploader vẫn kiểm tra quyền của token server.

Role `ADMIN` trong database không tự động có mọi quyền file; quyền file vẫn dựa trên `FolderPermission`.

## Database LP Travel

### User

- `fullName`
- `username` duy nhất
- `email`, `phoneNumber`, `citizenId`, `department` tùy chọn
- `passwordHash`
- `role`: `ADMIN` hoặc `USER`
- `active`
- `createdAt`, `updatedAt`

CCCD chỉ hiển thị trong form quản trị và hồ sơ của chính user; không đưa vào danh sách user hay API audit.

### FolderPermission

- Thuộc một user.
- Lưu `folderId` và `folderPath` lấy từ uploader.
- Năm quyền: `canUpload`, `canList`, `canRead`, `canDelete`, `canCreateFolder`.
- Mỗi cặp user/folder chỉ có một bản ghi.
- Khi xóa user, quyền folder được xóa cascade.

## Phân quyền hai tầng

1. Route LP Travel xác thực session.
2. LP Travel lấy folder hiện tại từ uploader và kiểm tra `FolderPermission` của user.
3. Quyền cấp tại folder cha được kế thừa xuống các folder con dựa trên `folderPath`.
4. Nếu user có quyền, server LP Travel gọi uploader bằng `UPLOADER_API_TOKEN`.
5. Uploader kiểm tra lại phạm vi folder và quyền của token.

Các thao tác file từ LP Travel kèm danh tính user được ký bằng `UPLOADER_ACTOR_SIGNING_SECRET`. Uploader chỉ tin actor khi xác minh được chữ ký bằng `ACTOR_SIGNING_SECRET`; nếu không, audit ghi nhận actor là API token.

Admin LP Travel xem lịch sử toàn bộ user tại `/admin/activity`. Uploader chỉ trả sự kiện có `apiTokenId` đúng với token LP Travel đang dùng và thuộc cây folder của token; LP Travel ghép `actorId` với bảng `User` để hiển thị thông tin hiện tại.

Khi đọc hoặc xóa file, LP Travel còn gọi `uploaderFileBelongsToFolder()` để chắc chắn `storedName` thật sự thuộc `folderId` đã được kiểm tra. Việc này ngăn user giả folder được phép để truy cập file ở folder khác.

## Các module chính

| File | Trách nhiệm |
| --- | --- |
| `lib/session.ts` | Tạo, xác minh và xóa JWT session cookie. |
| `lib/auth.ts` | Login Root Admin/user, lấy current user và bảo vệ page. |
| `lib/permissions.ts` | Kiểm tra quyền user theo folder và quyền kế thừa. |
| `lib/uploader.ts` | Gọi uploader bằng token server, tải cây folder và xác minh file/folder. |
| `lib/route-auth.ts` | Chuẩn hóa phản hồi 401/403 cho Route Handlers. |
| `lib/prisma.ts` | Prisma Client singleton. |
| `app/actions/users.ts` | Tạo, cập nhật, xóa user và quyền folder. |
| `app/actions/auth.ts` | Login, logout và đổi mật khẩu. |
