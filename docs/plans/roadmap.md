# Lộ trình ứng dụng nội bộ LP Travel

> Cập nhật 22/09/2026: phòng ban, dữ liệu nền, hồ sơ việc, booking, giao việc, bảng tin và thông báo đã có lát cắt hoạt động. Ưu tiên tiếp theo được đổi từ chat nội bộ sang [CRM khách hàng](./crm.md); chat được hoãn đến khi CRM-1/CRM-2 ổn định.

> Database hiện vẫn ở giai đoạn setup và được phép tái tạo. CRM sẽ triển khai thẳng schema đích, không duy trì hai cấu trúc dữ liệu hoặc lớp tương thích tạm.

## Điểm xuất phát (21/09/2026)

LP Travel hiện có `User`, role `ADMIN`/`USER`, đăng nhập, hồ sơ, `FolderPermission`, File Manager và phòng ban cơ bản. `User.department` vẫn được giữ để tương thích sau backfill. Root Admin đăng nhập bằng env và được nhận diện là `id: "root"`, không có hàng `User` trong PostgreSQL. `deleteUser` hiện xóa cứng; quan hệ quyền folder bị cascade. Chưa có khách hàng, nhà cung cấp, sản phẩm, hồ sơ việc, giao việc, bảng tin, chat hoặc hệ thống thông báo nội bộ. Uploader là dịch vụ riêng, có quyền token và dữ liệu file/audit riêng. Không chuyển metadata file của uploader sang LP Travel.

## Đích kiến trúc

- PostgreSQL + Prisma của LP Travel lưu dữ liệu nghiệp vụ nội bộ. Uploader tiếp tục giữ nội dung file và lịch sử/version của file.
- Giữ `Role.ADMIN`/`USER` là quyền quản trị toàn hệ thống. Thêm vai trò theo phòng ban và quyền theo tài nguyên; không dùng `FolderPermission` để quyết định ai được đọc công việc, bài viết hoặc chat.
- Mọi API/server action kiểm tra session, trạng thái `active` và quyền trên từng bản ghi; UI ẩn nút chỉ để hỗ trợ trải nghiệm, không thay kiểm tra server.
- Với file đính kèm, vừa kiểm tra quyền xem đối tượng nghiệp vụ ở LP Travel, vừa kiểm tra quyền file của user và token uploader. Không gửi token uploader tới browser. Cần thống nhất phạm vi thư mục đính kèm trước khi bật tính năng.
- Dữ liệu nhạy cảm (`citizenId`, email, điện thoại) không đưa mặc định vào danh sách thành viên, bài viết, task hay payload chat. Chỉ trả các trường cần hiển thị, thường là id/tên/avatar nếu có.

## Thứ tự triển khai

| Giai đoạn | Kết quả bàn giao | Phụ thuộc |
| --- | --- | --- |
| 0. Nền tảng | Quy tắc actor Root Admin, lifecycle user, kiểm tra quyền dùng chung, migration an toàn; chốt quyết định bên dưới. | Hệ thống hiện tại. |
| 1. Phòng ban | CRUD phòng ban, quản lý thành viên và người quản lý; chuyển dữ liệu `department` cũ. | Giai đoạn 0. |
| 2. Dữ liệu nền du lịch | Khách hàng, nhà cung cấp, danh mục tour/dịch vụ có định danh ổn định và quyền truy cập riêng. | Giai đoạn 1; chốt [mô hình nghiệp vụ](./travel-domain.md). |
| 3. Hồ sơ việc | Yêu cầu du lịch đi qua nhiều bước, một khách hàng chính, danh sách liên hệ/hành khách riêng (hành khách có thể nhập sau) và các dòng tour/dịch vụ. | Giai đoạn 2. |
| 4. Đặt dịch vụ và giao việc | Kiểm tra có người đi tour khi bắt đầu đặt với nhà cung cấp; phân công các bước, theo dõi tiến độ và lịch sử; chưa có giá/thu tiền. | Giai đoạn 3. |
| 5. Bảng tin và thông báo — đã có lát cắt đầu | Tin toàn công ty/phòng ban, bình luận và thông báo trong ứng dụng. | Giai đoạn 1 và quyền phòng ban. |
| 6. CRM-1 — ưu tiên tiếp theo | Hồ sơ khách hàng, contact, owner, tương tác chăm sóc và timeline hồ sơ/tour/dịch vụ/booking/nhân viên. | Giai đoạn 2–4; xem [kế hoạch CRM](./crm.md). |
| 7. CRM-2/CRM-3 | Nhắc chăm sóc, chất lượng dữ liệu, báo cáo và phân khúc. | CRM-1 và hệ thống thông báo. |
| 8. Tài chính (sau) | Báo giá, giá mua/bán, chứng từ, thanh toán; dùng khóa liên kết ổn định từ các giai đoạn trước. | Hồ sơ/booking và CRM ổn định; chỉ triển khai khi chốt quy trình tài chính. |
| 9. Chat — hoãn | Chat trực tiếp/nhóm, realtime và lưu giữ. | Sau CRM-1/CRM-2; không thay interaction CRM, activity hồ sơ hoặc bình luận task. |

Mỗi giai đoạn có migration, server API/actions, UI, test quyền và cập nhật docs riêng. Không gộp tất cả vào một migration lớn.

## Nền tảng phải chốt trước khi code

1. **Danh tính tác giả:** Root Admin từ env không thể làm foreign key tới `User`. Mặc định đề xuất: bảng/kiểu `Actor` bền vững hoặc trường `actorType` + `actorId` + `actorNameSnapshot` cho các bản ghi audit, trong đó `ROOT` là loại riêng. Với đối tượng cần FK người giao/được giao, chỉ user database được chọn; Root vẫn tạo/sửa và được ghi ở audit. Không dùng chuỗi `root` làm FK `User`.
2. **Vòng đời user:** chuyển thao tác xóa user sang vô hiệu hóa/lưu trữ thay vì xóa cứng khi đã có task/post/message; giữ tên và lịch sử người cũ. Chính sách xóa dữ liệu theo yêu cầu riêng cần thiết kế sau. Không làm mất quyền file hoặc hành vi cũ trước khi có migration và kiểm thử.
3. **Phân quyền:** Admin quản trị toàn cục; quản lý phòng ban chỉ quản lý nội dung/phân công trong phạm vi phòng ban; thành viên chỉ thấy nội dung được chia sẻ hoặc họ tham gia. Quyền tạo/xem/sửa/xóa phải được định nghĩa riêng cho từng module; không suy ra từ quyền folder.
4. **Thông báo:** chuẩn bị một mô hình `Notification` theo user (loại, đối tượng, thời điểm, đã đọc) và cơ chế ghi sự kiện sau khi transaction thành công; giai đoạn đầu có thể hiển thị trong app. Email/push là mở rộng sau, tránh gắn logic gửi vào transaction nghiệp vụ.
5. **Danh mục file đính kèm:** chỉ lưu tham chiếu `fileId`/đường dẫn an toàn và metadata tối thiểu trong LP Travel. Cần cơ chế xác thực user có quyền đọc file trước khi trả link/stream; nếu token uploader có scope rộng hơn quyền user thì LP Travel vẫn phải chặn.
6. **Truy vết và thời gian:** lưu `createdAt`, `updatedAt`, người tạo/chỉnh sửa và các thay đổi quan trọng. Dùng UTC trong database, hiển thị theo múi giờ ứng dụng. Có phân trang server cho danh sách dài.

## Migration và triển khai an toàn

- Mỗi giai đoạn dùng migration cộng thêm trước, backfill sau, chuyển UI/API sau cùng; không xóa cột `User.department` cho đến khi so khớp dữ liệu và có phương án rollback.
- Với dữ liệu department cũ: chuẩn hóa tên theo quy tắc được duyệt, lập danh sách giá trị trùng/khác dấu trước khi tạo `Department`; bản ghi mơ hồ được rà soát thủ công.
- Kiểm tra bản ghi user cũ, root actor, user inactive và quyền folder sau migration; backup PostgreSQL trước migration production.
- Triển khai module mới sau cờ cấu hình hoặc theo từng nhóm người dùng nếu cần; rollback ứng dụng không được phụ thuộc vào việc xóa migration đã chạy.
- Kiểm thử dữ liệu chéo phòng ban, user bị vô hiệu hóa, thành viên bị loại khỏi phòng ban/hội thoại, root admin, file attachment và truy cập trực tiếp URL/API.

## Cần xác nhận trước từng giai đoạn

- Một user thuộc một hay nhiều phòng ban? Mặc định đề xuất: có một phòng ban chính, cho phép nhiều membership để mở rộng; không tự động cấp quyền file theo membership.
- Quản lý phòng ban có được tạo/giao việc và đăng tin cho phòng mình không? Mặc định: có; quyền quản trị user và folder vẫn dành cho Admin.
- Hồ sơ việc có thể chuyển phòng ban, và có thể giao bước xử lý cho người ngoài phòng ban không? Mặc định: chuyển phòng ban cần thao tác có audit; giao ngoài phòng ban chỉ khi Admin hoặc người có quyền chia sẻ rõ ràng.
- Bảng tin có cần duyệt bài, đăng lịch và xác nhận đã đọc không? Mặc định: chưa ở bản đầu; chỉ có nháp/đăng/ghim/lưu trữ, bình luận và phạm vi người xem.
- CRM dùng một owner chính hay nhiều nhân viên đồng phụ trách? Mặc định CRM-1: một owner chính để lọc/nhắc việc; người khác vẫn tham gia qua hồ sơ, task và interaction.
- Interaction đã ghi có được sửa/xóa không? Mặc định: không xóa cứng; nếu cần sửa phải lưu audit hoặc bổ sung bản ghi đính chính.
- Chat đang hoãn. Khi quay lại cần chốt tạo nhóm, sửa/xóa tin và thời hạn lưu giữ; chat không thay interaction CRM hoặc activity nghiệp vụ.
- File đính kèm dùng folder nào, ai được upload/xem và có cho phép đối tượng nghiệp vụ tồn tại khi file bị xóa không? Cần chốt trước khi tích hợp.

Các mặc định trên là **đề xuất**, không phải quyết định đã được chấp thuận. Khi triển khai phải cập nhật quyết định thực tế vào từng tài liệu giai đoạn.
