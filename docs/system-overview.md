# Tổng quan hệ thống LP Travel

## Mục đích và phạm vi hiện tại

LP Travel là ứng dụng Next.js phục vụ đăng nhập, quản lý user, phòng ban, dữ liệu nền du lịch, hồ sơ việc, công việc, bảng tin, thông báo, phân quyền theo thư mục và giao diện làm việc với file. `nextjs-multi-webhook-uploader` là dịch vụ riêng quản lý API token, metadata/version/audit của file và nội dung vật lý. Chat nội bộ và tài chính chưa triển khai.

```text
Browser ── session cookie ──> LP Travel ── Bearer token + actor HMAC ──> Uploader
                              │                                      │
                              └─ PostgreSQL: user, phòng ban,           ├─ PostgreSQL: folder, token, file, version, audit, draft, lock
                                 customer, supplier, product, quyền file
                                                                     └─ UPLOAD_DIR: nội dung file
```

## Người dùng và quyền

- Root Admin đăng nhập bằng `ROOT_ADMIN_USERNAME`/`ROOT_ADMIN_PASSWORD` trong environment. User thông thường nằm trong PostgreSQL, mật khẩu lưu dạng bcrypt hash.
- `User` có họ tên, username duy nhất, email, số điện thoại, CCCD, một `SystemRole` lưu trong database và trạng thái `active`. Admin tạo/sửa user; user database có thể tự sửa họ tên, email, số điện thoại, CCCD và đổi mật khẩu tại `/profile`. Root Admin quản lý thông tin đăng nhập qua environment. `Department` là cây nhiều cấp; quyền của membership được lưu qua `DepartmentPermissionDefinition` và bảng gán, kế thừa từ phòng ban cha xuống mọi phòng ban con. Các cột role/quyền boolean cũ được giữ và đồng bộ để tương thích trong giai đoạn chuyển đổi.
- Quyền chuẩn hóa có ba lớp: `AccessResource` khai báo tài nguyên nghiệp vụ, `BasePermission` khai báo hành động gốc và `ResourcePermission` có tên riêng, lưu tổ hợp duy nhất giữa tài nguyên với hành động. Tổ hợp được gán cho membership phòng ban của user qua `DepartmentMembershipResourcePermission`; form user nhóm các checkbox theo tài nguyên. Lớp này chưa thay thế các kiểm tra `DepartmentPermissionDefinition` hiện hành.
- Root Admin từ environment và user có role `ADMIN` có toàn quyền nghiệp vụ trong LP Travel. Role `ADMIN` database không tự cấp mọi quyền file; ngoại lệ Root Admin bỏ qua quyền folder của LP Travel nhưng cả hai vẫn bị giới hạn bởi token uploader.
- `FolderPermission` cấp năm quyền `upload`, `list`, `read`, `delete`, `create-folder`. Quyền của folder cha áp dụng cho folder con.
- Mỗi thao tác file được kiểm tra ở LP Travel trước, rồi uploader kiểm tra quyền và phạm vi API token lần nữa. API token không gửi xuống browser.

## Các trang chính

| Đường dẫn | Chức năng |
| --- | --- |
| `/login` | Đăng nhập. |
| `/` | Lead Workspace trong 30 ngày gần nhất theo `Date Received`, có KPI và Lead cập nhật gần đây theo quyền. |
| `/files` | File Manager theo quyền folder. |
| `/profile` | User database tự sửa họ tên, email, số điện thoại, CCCD và đổi mật khẩu; Root Admin đổi thông tin trong environment. |
| `/departments` | Danh bạ phòng ban và thành viên đang hoạt động. |
| `/admin/departments` | Admin tạo, sửa, lưu trữ/kích hoạt phòng ban. |
| `/admin/users`, `/admin/users/new`, `/admin/users/[id]` | Danh sách, tạo và sửa user. |
| `/admin/access-control` | Admin CRUD vai trò hệ thống và các loại quyền cấp theo phòng ban. |
| `/admin/resource-permissions` | Admin CRUD tài nguyên, quyền gốc và tổ hợp quyền tài nguyên. |
| `/admin/lead-fields` | Admin đọc/cập nhật tên, nhóm, thứ tự, trạng thái và quyền đọc/ghi từng cột Lead theo vai trò. |
| `/admin/activity` | Admin xem audit trong phạm vi token LP Travel, có lọc và phân trang. |
| `/admin/template-builder`, `/admin/template-builder/[id]` | Admin quản lý phiên bản và thiết kế trực quan template thử nghiệm, chưa thay renderer tài liệu hiện tại. |
| `/admin/template-builder/data-contracts`, `/admin/template-builder/data-contracts/[id]` | Admin cấu hình biến, phép toán, format, dataset và Generation Contract cho Template Builder mà không nhập code hoặc JSON. |
| `/admin/master-data`, `/admin/customers`, `/admin/suppliers`, `/admin/suppliers/[id]`, `/admin/supplier-types`, `/admin/channels`, `/admin/products`, `/admin/products/[id]`, `/admin/document-templates` | Admin quản lý dữ liệu nền du lịch và Lead theo tab, lịch trình từng ngày của tour và mẫu tài liệu dùng chung, bao gồm metadata mở rộng theo cặp key–value. |
| `/products` | User đăng nhập xem tour/dịch vụ đang hoạt động và lịch trình tour. |
| `/work`, `/work/new`, `/work/[id]`, `/work/[id]/itinerary` | Danh sách, tạo nhanh, xem chi tiết hồ sơ và tạo bản nháp lịch trình từ dữ liệu tour theo quyền. |
| `/quick`, `/quick/[id]` | Tạo itinerary độc lập hoàn toàn bằng dữ liệu nhập tay, lưu nháp, chỉnh sửa, xem và xuất DOCX/PDF/PNG/JPG. |
| `/tasks` | Theo dõi công việc theo Kanban hoặc Timeline. |
| `/news`, `/news/[id]` | Bảng tin toàn công ty/theo phòng ban và trao đổi trong bài viết. |
| `/notifications` | Thông báo giao việc, trao đổi, bài viết và các sự kiện Lead được gán/cập nhật/sắp đến ngày đi; quản lý trạng thái đã đọc. |
| `/customers`, `/customers/[id]` | CRM khách hàng, chăm sóc, người phụ trách và lịch sử tour/dịch vụ/booking. |
| `/leads`, `/leads/new`, `/leads/[id]`, `/leads/[id]/itinerary`, `/leads/[id]/confirmation`, `/leads/[id]/invoice`, `/leads/dashboard`, `/leads/report` | Danh sách gọn/toàn bộ cột, tạo, xem, sửa, sinh một itinerary, một Confirmation và một Invoice cho mỗi Lead B2C, import/export Excel, dashboard và báo cáo theo khoảng Date Received; các danh mục nền có thể chọn từ gợi ý hoặc nhập text. |
| `/b2b-leads`, `/b2b-leads/new`, `/b2b-leads/[id]`, `/b2b-leads/[id]/itinerary`, `/b2b-leads/[id]/invoice` | Module Lead B2B độc lập, dùng cùng trường, dữ liệu nền, phân quyền cột, itinerary, Invoice và chức năng xuất file của Lead B2C; Lead Source mặc định là `B2B`. |
| `/performance` | Dashboard năng suất Lead theo cá nhân; quản lý xem cây phòng ban mình quản lý và Admin xem toàn bộ, lọc tuần/tháng/quý theo Date Received. |

Tài nguyên `LEADS` có các quyền chức năng `CREATE`, `READ`, `UPDATE`, `DELETE`, `IMPORT`, `EXPORT`. `READ` cho phép vào module nhưng cột thực tế được lọc tiếp bằng `LeadFieldRolePermission.canRead` theo `SystemRole`; `UPDATE` tương tự với `canWrite`. Export chỉ chứa cột được đọc, còn import và file mẫu dùng một cấu trúc cố định và chỉ kiểm tra quyền `IMPORT`.

Dashboard Lead tổng hợp KPI, Sales Funnel, doanh thu và tỷ lệ chuyển đổi theo khoảng Date Received. Các khối Funnel, Hot Lead và tài chính chỉ xuất hiện khi vai trò có quyền đọc những cột nguồn tương ứng.

Trang `/leads/report` tổng hợp báo cáo B2C theo khoảng `Date Received`, gồm thống kê tự động, phần nội dung nhập tay và bảng Instagram có thể thêm dòng. Nhận xét Invalid Number thay đổi theo ngưỡng 10%; các trạng thái `Invalid Number` và `Quotation Sent` được tô màu tương ứng trong giao diện, DOCX và PDF.

Lead B2B được lưu trong bảng riêng và dùng chung tài nguyên quyền `LEADS`. Mỗi Lead B2B có tối đa một itinerary và một Invoice; các quan hệ này độc lập với Lead B2C nhưng tái sử dụng cùng form, renderer và luồng xuất tài liệu.

Itinerary tạo từ Lead dùng chung dữ liệu và trang preview/export của module Tạo nhanh nhưng được liên kết về Lead. Số ngày lấy nhóm chữ số đầu tiên trong `Duration`; quy ước dữ liệu yêu cầu số ngày đứng trước, ví dụ `5D4N` thành 5 và không hỗ trợ dạng đảo `4N5D`. Ngày bắt đầu lấy từ `Travel Date`, tiêu đề từng ngày lấy `Destination`; nhập Lưu trú sẽ tự sinh `Overnight in` cùng địa điểm. Template Builder có Generation Contract độc lập để mô hình hóa cùng quy tắc nhưng chưa thay luồng tạo lịch trình hiện tại.

Confirmation và Itinerary là hai tài liệu độc lập, mỗi Lead B2C có tối đa một bản mỗi loại và có thể tạo theo bất kỳ thứ tự nào. Hai tài liệu dùng chung dữ liệu lịch trình từng ngày; nội dung nhập ở tài liệu tạo trước sẽ tự điền khi tạo tài liệu còn lại, và chỉnh sửa sau đó được đồng bộ hai chiều. Phần 1 của Confirmation lưu riêng dữ liệu nhập tay cùng bảng Information Details; Date của từng dòng được tạo lại từ `Travel Date + số thứ tự ngày`, số dòng lấy số đầu tiên trong `Duration`. Phần 2–4 được sinh ngay trong Confirmation từ dữ liệu lịch trình dùng chung theo thứ tự Brief Itinerary, Details Itinerary và Quotation & Information. Confirmation dùng chung Header/Footer và hỗ trợ DOCX/PDF/PNG/JPG.

## Quản lý file

- File Manager có Grid/List/Gallery, cây folder, breadcrumb, tìm kiếm/sắp xếp trong folder, preview và upload kéo-thả.
- Ảnh Header/Footer của mẫu tài liệu được lưu trong `Travel/Templates` qua uploader; LP Travel chỉ giữ tham chiếu và phục vụ ảnh qua route đã xác thực cho template/itinerary liên quan.
- Uploader giữ `UploadedFile` (file logic), `FileVersion` (nội dung từng version), `AuditEvent`, `FileDraft` và `FileEditLock`. LP Travel không sao chép các bảng này vào database của mình.
- Upload mới tạo version 1. Upload phiên bản mới hoặc khôi phục phiên bản cũ đều tạo version mới; `If-Match` chống ghi đè khi có thay đổi đồng thời.
- Xóa thường đưa file vào thùng rác (soft delete). Admin uploader có thể khôi phục hoặc xóa vĩnh viễn nội dung; metadata/audit vẫn được giữ.
- Editor trực tuyến chỉ dành cho text/code: lock có thời hạn và heartbeat, autosave draft, lưu thành version mới, so sánh hai version. Office/PDF/media chưa có editor.
- Audit ghi các thao tác file, version, delete/restore và lưu nội dung chỉnh sửa. Trang `/admin/activity` của LP Travel chỉ lấy sự kiện gắn với API token đang dùng và nằm trong cây folder của token.

## Cấu hình và triển khai

- LP Travel cần `DATABASE_URL`, thông tin Root Admin, `SESSION_SECRET`, `UPLOADER_BASE_URL`, `UPLOADER_API_TOKEN` và `UPLOADER_ACTOR_SIGNING_SECRET`. Cron thông báo dùng `CRON_SECRET`; mốc ngày Lead dùng `APP_TIME_ZONE`, mặc định `Asia/Ho_Chi_Minh`.
- Uploader cần database riêng, `UPLOAD_DIR`, API token có scope/quyền phù hợp và `ACTOR_SIGNING_SECRET` giống secret ký actor ở LP Travel. Nếu thiếu/mismatch secret, audit không nhận diện user và `/admin/activity` bị từ chối.
- Migration LP Travel gồm khởi tạo `User`/`FolderPermission`, bổ sung bốn trường hồ sơ, thêm `Department`/`DepartmentMembership` kèm backfill từ `User.department`, cây và quyền phòng ban, `Customer`/`Supplier`/`Product`, Lead B2C, Confirmation và bảng `B2BLead` độc lập. Migration metadata/version/audit nằm ở uploader.
- Xem [Vận hành](./operations.md) trước khi deploy: cấu hình Docker hiện có điểm chưa đồng bộ về package manager và cổng.

## Hướng mở rộng

Phòng ban, dữ liệu nền, hồ sơ việc, lịch trình hồ sơ, booking, giao việc, bảng tin, thông báo và CRM-1 đã có schema, migration và UI. Lịch trình hồ sơ sao chép dữ liệu ngày từ tour cùng Header/Footer được chọn thành snapshot riêng để chỉnh sửa và lưu nháp mà không thay đổi dữ liệu mẫu; bản preview có thể xuất Word, PNG, JPG và PDF. CRM tổng hợp lịch sử chăm sóc, hồ sơ/tour/dịch vụ/booking và hoạt động nhân viên mà không sao chép dữ liệu nghiệp vụ. Chat nội bộ được hoãn, tài chính chưa triển khai. Admin xem mọi hồ sơ; quyền nghiệp vụ theo phòng ban áp dụng xuống các phòng ban con. Các quyền này không cấp quyền folder uploader. CCCD là dữ liệu nhạy cảm, cần tiếp tục giới hạn nơi hiển thị và cân nhắc chính sách lưu giữ/bảo vệ khi mở rộng.

Kế hoạch đề xuất, chưa triển khai, được lưu tại [Kế hoạch mở rộng ứng dụng nội bộ](./plans/README.md).

## Tài liệu chi tiết

- [Kiến trúc và phân quyền](./architecture.md)
- [API LP Travel](./api.md)
- [File Manager và preview](./file-manager.md)
- [Audit, version và editor](./storage-audit.md)
- [Vận hành](./operations.md)
- [Nhật ký triển khai](./implementation-log.md)
- [Hướng dẫn Template Builder và Data Contracts](./template-builder-guide.md)
