# Giai đoạn 1 — Phòng ban

## Trạng thái (21/09/2026)

Đã thêm `Department`, `DepartmentMembership`, vai trò `MANAGER`/`MEMBER`, migration backfill từ `User.department`, cây phòng ban nhiều cấp trên `/departments` và `/admin/departments`, lựa chọn phòng ban chính và vai trò trên form user. Membership có năm quyền nghiệp vụ: quản lý thành viên, quản lý hồ sơ việc, giao việc, quản lý booking và xem báo cáo. Quyền cấp tại phòng ban cha được kế thừa xuống toàn bộ phòng ban con; hệ thống từ chối quan hệ tự tham chiếu hoặc tạo vòng lặp. Root Admin từ environment và user có role `ADMIN` có toàn quyền nghiệp vụ. Chưa có UI nhiều membership hoặc quản lý membership trực tiếp từ trang phòng ban; quyền quản lý thành viên và xem báo cáo đã có trong dữ liệu nhưng chờ module tương ứng sử dụng. Migration cần được chạy trên database triển khai bằng `pnpm run db:migrate`.

## Mục tiêu và phạm vi

Biến `User.department` dạng text thành danh mục có định danh ổn định để quản lý nhân sự, phân quyền theo phòng ban và dùng lại trong công việc/bảng tin. Bản đầu có danh sách, tạo/sửa/lưu trữ phòng ban, thêm/gỡ thành viên, chỉ định quản lý và phòng ban chính. Không tự động tạo quyền folder uploader.

## Dữ liệu đề xuất

- `Department`: `id`, `name`, `code` duy nhất, `description?`, `parentId?`, `active`, thời gian tạo/sửa. Quan hệ self-reference hỗ trợ cây nhiều cấp.
- `DepartmentMembership`: `departmentId`, `userId`, `role` (`MANAGER`/`MEMBER`), `isPrimary` và năm cờ quyền nghiệp vụ. Quyền được tính trên membership trực tiếp rồi mở rộng xuống mọi node con.
- `User.department` giữ tạm trong migration. Sau khi UI và báo cáo đều đọc từ membership, đánh dấu deprecated rồi mới cân nhắc xóa ở migration riêng.

## Quyền và luồng

- Root Admin và Admin database: toàn quyền. Admin tạo/sửa/lưu trữ phòng ban và quản lý mọi membership. User được thao tác hồ sơ việc, booking và task trong phòng ban được cấp quyền, bao gồm các phòng ban con.
- User: xem danh bạ nội bộ tối thiểu (tên, username, phòng ban, vai trò phòng ban), không lộ CCCD/số điện thoại/email nếu chưa được chấp thuận.
- Không xóa cứng phòng ban có task/post; lưu trữ và giữ lịch sử. Khi chuyển user sang phòng mới, nội dung cũ không tự đổi audience hay người được giao.
- Bổ sung màn `/admin/departments` và `/departments` (hoặc đường dẫn thống nhất với điều hướng hiện tại); trang chi tiết hiển thị thành viên theo quyền.

## Trình tự thực hiện

1. Thống kê giá trị `User.department` hiện có; chốt quy tắc gộp tên, code và phòng ban không xác định.
2. Thêm schema/migration mới, backfill Department + membership trong transaction có thể chạy lại an toàn; đối chiếu số user trước/sau.
3. Thêm truy vấn/API và kiểm tra quyền server, sau đó đổi form admin user từ text sang chọn phòng ban; chỉ ngừng ghi cột cũ sau khi mọi nơi đọc mới.
4. Thêm UI quản lý, tìm kiếm/phân trang, kiểm thử đổi phòng và lưu trữ phòng.

## Tiêu chí hoàn thành

- User cũ có department hợp lệ được gắn đúng phòng; giá trị mơ hồ được báo cáo, không bị mất.
- Mỗi user có tối đa một phòng chính; không tạo membership trùng.
- User thường không gọi trực tiếp API để sửa phòng ban hoặc xem dữ liệu hồ sơ nhạy cảm của người khác.
- Quyền folder và đăng nhập hiện tại không đổi sau migration.
