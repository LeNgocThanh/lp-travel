# Tài liệu LP Travel

Thư mục này ghi lại kiến trúc và các chức năng đã triển khai trong `lp-travel` cùng cách ứng dụng kết nối với `nextjs-multi-webhook-uploader`.

## Nội dung

- [Tổng quan hệ thống](./system-overview.md): mục đích, kiến trúc, dữ liệu, trang và hướng mở rộng.
- [Kiến trúc hệ thống](./architecture.md): thành phần, database, authentication và phân quyền hai tầng.
- [Quản lý và xem trước file](./file-manager.md): Grid/List/Gallery, cây thư mục, upload và các định dạng preview.
- [API nội bộ](./api.md): các endpoint do LP Travel cung cấp cho frontend.
- [Audit và phiên bản file](./storage-audit.md): metadata, chữ ký actor, thùng rác, version và editor.
- [Vận hành](./operations.md): biến môi trường, migration, chạy local và Docker.
- [Nhật ký triển khai](./implementation-log.md): những phần đã thực hiện và giới hạn hiện tại.
- [Hướng dẫn Template Builder và Data Contracts](./template-builder-guide.md): thiết kế template, cấu hình trường/công thức/dataset và sinh ngày từ Travel Date + Duration.
- [Kế hoạch mở rộng ứng dụng nội bộ](./plans/README.md): lộ trình và kế hoạch chi tiết cho phòng ban, dữ liệu nền du lịch, hồ sơ việc, bảng tin, chat.

## Hai dự án liên quan

| Dự án | Trách nhiệm |
| --- | --- |
| `lp-travel` | Đăng nhập, user, phòng ban, dữ liệu nền du lịch, quyền folder, giao diện quản lý file và API proxy. |
| `nextjs-multi-webhook-uploader` | Quản lý folder/token, lưu file vật lý, metadata file và kiểm tra quyền token. |

LP Travel không gửi `UPLOADER_API_TOKEN` xuống trình duyệt. Mọi request tới uploader đều đi qua server của LP Travel.
