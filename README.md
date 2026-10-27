# LP Travel

Ứng dụng full-stack Next.js quản lý user và truy cập kho tài liệu từ `nextjs-multi-webhook-uploader`.

## Tài liệu

Xem [mục lục tài liệu dự án](./docs/README.md) để đọc kiến trúc, API, trình quản lý file và hướng dẫn vận hành.

## Chức năng

- Đăng nhập/đăng xuất bằng user PostgreSQL hoặc Root Admin trong `.env`.
- Role `ADMIN` và `USER`.
- Root Admin và Admin quản lý, tạo, sửa, khóa và xóa user.
- Cấp năm quyền theo folder: upload, list, read, delete, create-folder.
- Quyền ở folder cha có hiệu lực với các folder con.
- User xem thông tin cá nhân và đổi mật khẩu.
- Quản lý file qua API proxy; token uploader chỉ tồn tại phía server.
- Giao diện Tailwind CSS và shadcn.

## Cấu hình

Sao chép `.env.example` thành `.env`:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/lp_travel?schema=public

ROOT_ADMIN_USERNAME=admin
ROOT_ADMIN_PASSWORD=your-strong-root-password
SESSION_SECRET=your-long-random-session-secret

UPLOADER_BASE_URL=http://localhost:6000
UPLOADER_API_TOKEN=your-uploader-api-token
UPLOADER_ACTOR_SIGNING_SECRET=shared-secret-with-uploader
```

Token uploader phải được cấp trên folder gốc cần quản lý và có các quyền tương ứng. Quyền user trong LP Travel luôn được kiểm tra trước; uploader tiếp tục kiểm tra quyền token ở tầng thứ hai.

## Chạy local

```bash
npm install
npm run db:generate
npm run db:migrate
npm run dev
```

Mở `http://localhost:3000` và đăng nhập bằng Root Admin trong `.env`. Root Admin tạo user đầu tiên tại `/admin/users`.

## Docker

```bash
docker compose up -d --build
```

Container tự chạy `prisma migrate deploy` trước khi khởi động. Khi chạy bằng Docker, `DATABASE_URL` và `UPLOADER_BASE_URL` phải sử dụng hostname mà container truy cập được, không dùng `localhost` nếu dịch vụ nằm ngoài chính container này.

## Luồng phân quyền

1. Trình duyệt gửi request bằng session của user.
2. LP Travel kiểm tra user còn hoạt động và có quyền trên folder.
3. Nếu hợp lệ, LP Travel gọi uploader bằng `UPLOADER_API_TOKEN` phía server.
4. Uploader kiểm tra lại quyền của token trước khi thao tác file.

Token uploader không được gửi xuống browser và không được lưu trong database LP Travel.
