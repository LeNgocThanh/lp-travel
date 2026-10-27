# Vận hành

## Environment

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/lp_travel?schema=public

ROOT_ADMIN_USERNAME=admin
ROOT_ADMIN_PASSWORD=your-strong-root-password
SESSION_SECRET=your-long-random-session-secret

UPLOADER_BASE_URL=http://localhost:6000
UPLOADER_API_TOKEN=your-uploader-api-token
UPLOADER_ACTOR_SIGNING_SECRET=shared-secret-with-uploader
```

Uploader cấu hình giới hạn version riêng:

```env
MAX_FILE_VERSIONS=20
MAX_EDITABLE_FILE_SIZE_MB=2
EDIT_LOCK_MINUTES=5
```

Yêu cầu đối với token uploader:

- Token phải có scope bao phủ folder gốc mà LP Travel quản lý.
- Cần bật các quyền uploader tương ứng với chức năng muốn dùng: upload, list, read, delete, create-folder.
- MIME để trống ở uploader nghĩa là cho phép tất cả.
- `UPLOADER_ACTOR_SIGNING_SECRET` phải giống `ACTOR_SIGNING_SECRET` của uploader để ghi nhận đúng user thực hiện thao tác.

## Chạy local

Repository hiện sử dụng pnpm:

```bash
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm dev
```

Ứng dụng mặc định chạy tại `http://localhost:3000`.

## Database

- Prisma schema: `prisma/schema.prisma`.
- Migration đầu tiên: `prisma/migrations/20260918090000_init/migration.sql`.
- Migration hồ sơ user: `prisma/migrations/20260920090000_add_user_profile_fields/migration.sql`.
- Migration phòng ban: `prisma/migrations/20260921090000_add_departments/migration.sql`.
- Migration dữ liệu nền du lịch: `prisma/migrations/20260921100000_add_travel_master_data/migration.sql`.
- Migration metadata dữ liệu nền: `prisma/migrations/20260921110000_add_master_data_metadata/migration.sql`.
- Migration hồ sơ việc: `prisma/migrations/20260921120000_add_work_cases/migration.sql`.
- Migration lịch sử hồ sơ việc: `prisma/migrations/20260921130000_add_work_case_activity/migration.sql`.
- Migration booking và giao việc: `prisma/migrations/20260921140000_add_bookings_and_tasks/migration.sql`.
- Migration cây và quyền phòng ban: `prisma/migrations/20260921150000_add_department_hierarchy_permissions/migration.sql`.
- Migration bình luận và checklist công việc: `prisma/migrations/20260921160000_expand_work_tasks/migration.sql`.
- Migration bảng tin và thông báo: `prisma/migrations/20260921170000_add_news_notifications/migration.sql`.
- Migration CRM khách hàng: `prisma/migrations/20260922090000_add_customer_crm/migration.sql`.
- LP Travel sử dụng database/schema riêng với uploader.
- Không lưu API token uploader hoặc nội dung file trong database LP Travel.

## Docker

`docker-compose.yml` đọc `.env` và hiện map cổng `6364:6364`. Container chạy migration trước khi khởi động server.

Lưu ý trạng thái hiện tại: repository đã chuyển sang pnpm (`pnpm-lock.yaml`) nhưng `Dockerfile` vẫn cài bằng `npm i` và chạy `npm run build`. Dockerfile `EXPOSE 6200`, Compose map `6364:6364`, còn image chưa đặt `PORT`; cần đồng bộ package manager và cổng trước khi dùng cấu hình Docker này cho production.

Khi chạy trong Docker, không dùng `localhost` cho PostgreSQL hoặc uploader nếu chúng nằm ở container/host khác. Sử dụng hostname có thể truy cập từ container.

## Kiểm tra trước deploy

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm build
pnpm audit
```

Ngoài ra cần kiểm thử thực tế login, migration, quyền folder và preview với PostgreSQL/uploader đang chạy.
