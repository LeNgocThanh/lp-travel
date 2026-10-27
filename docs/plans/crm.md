# Kế hoạch CRM khách hàng

## Quyết định và mục tiêu

> Cập nhật 22/09/2026: CRM được ưu tiên triển khai trước chat nội bộ. `Customer` hiện có tiếp tục là hồ sơ khách hàng gốc; không tạo một bảng khách hàng CRM thứ hai.

> Quyết định triển khai: hệ thống đang ở giai đoạn setup nên có thể tái tạo database. CRM-1 sẽ đi thẳng vào cấu trúc đích, không duy trì schema CRM cũ/mới song song và không viết lớp tương thích tạm thời.

CRM tập trung vào một màn hình khách hàng thống nhất để nhân viên biết khách là ai, đã được chăm sóc thế nào, từng yêu cầu/đặt tour hoặc dịch vụ nào, nhân viên nào đã xử lý và cần làm gì tiếp theo. Phiên bản đầu chưa bao gồm marketing automation, tổng đài, email đồng bộ hai chiều, giá bán hoặc công nợ.

## Nguyên tắc dữ liệu

- Không sao chép lịch sử tour/dịch vụ vào bảng CRM riêng. Lịch sử này được tổng hợp từ `Customer → WorkCase → WorkCaseItem → ServiceBooking` để luôn khớp dữ liệu nghiệp vụ.
- Không sao chép toàn bộ activity hồ sơ sang timeline khách hàng. Timeline đọc `WorkCaseActivity` qua các hồ sơ có `customerId`, kết hợp sự kiện chăm sóc mới và hiển thị theo thời gian.
- Hồ sơ nhập nhanh chỉ có snapshot khách hàng nhưng chưa có `customerId` sẽ không tự động ghép theo tên hoặc số điện thoại. Admin/nhân viên có quyền phải xác nhận liên kết để tránh ghép nhầm người trùng tên.
- Sự kiện chăm sóc lưu actor snapshot (`actorType`, `actorId`, `actorName`) giống activity hiện tại. Root Admin từ environment không dùng foreign key giả tới `User`.
- Metadata tiếp tục dành cho thuộc tính mở rộng; dữ liệu cần lọc, phân quyền hoặc báo cáo thường xuyên phải là trường/bảng có cấu trúc.

## Mô hình dữ liệu đề xuất

### Bổ sung vào `Customer`

- `lifecycle`: trạng thái quan hệ như `LEAD`, `PROSPECT`, `CUSTOMER`, `INACTIVE`.
- `source?`: nguồn khách hàng; trước mắt là mã text mở rộng, sau này có thể chuyển thành danh mục.
- `ownerId?`: nhân viên phụ trách chính, FK tới user database; Root Admin không được gán làm owner.
- `lastContactAt?`, `nextFollowUpAt?`: dữ liệu tổng hợp để lọc nhanh; cập nhật trong cùng transaction với interaction.
- Giữ `active` cho trạng thái lưu trữ kỹ thuật, không dùng thay cho lifecycle nghiệp vụ.

### `CustomerContact`

Danh bạ nhiều đầu mối của khách hàng/doanh nghiệp: tên, chức danh/vai trò, điện thoại, email, contact chính, ghi chú và metadata. Không đồng nhất với `WorkCaseContact`: contact trong hồ sơ là snapshot tại thời điểm xử lý, còn `CustomerContact` là danh bạ hiện tại.

### `CustomerInteraction`

- `customerId`, `workCaseId?` để tùy chọn gắn với hồ sơ cụ thể.
- Loại tương tác: `CALL`, `EMAIL`, `MEETING`, `MESSAGE`, `NOTE`, mã mở rộng về sau.
- `happenedAt`, `summary`, `outcome?`, `nextFollowUpAt?`, `metadata`.
- Actor snapshot và `createdAt` để truy vết ai ghi nhận, thời điểm tương tác thực tế và thời điểm nhập hệ thống.
- Không sửa/xóa cứng interaction đã dùng cho báo cáo; bản đầu cho phép bổ sung bản ghi đính chính. Nếu cần sửa, phải lưu audit.

### `CustomerAssignmentHistory`

Lưu mỗi lần đổi nhân viên phụ trách: owner cũ/mới, actor thực hiện, lý do và thời gian. `Customer.ownerId` giữ trạng thái hiện tại để truy vấn nhanh; bảng history giữ diễn biến.

### Nhắc chăm sóc và thông báo

Giai đoạn đầu dùng `CustomerInteraction.nextFollowUpAt` và `Customer.nextFollowUpAt`. Job định kỳ tạo `Notification` cho owner khi sắp đến hạn/quá hạn; cần khóa chống tạo thông báo trùng. Chưa gửi email/SMS tự động.

## Timeline khách hàng thống nhất

Trang `/customers/[id]` tổng hợp theo thời gian:

1. Tương tác chăm sóc từ `CustomerInteraction`.
2. Hồ sơ/yêu cầu từ `WorkCase` có `customerId`.
3. Tour/dịch vụ yêu cầu từ `WorkCaseItem`.
4. Lịch sử đặt dịch vụ từ `ServiceBooking` qua hồ sơ khách hàng.
5. Hoạt động nhân viên từ `WorkCaseActivity` và lịch sử đổi owner.

Mỗi mục timeline phải ghi nguồn, actor, thời điểm, hồ sơ liên quan và link tới dữ liệu gốc nếu người xem có quyền. Snapshot nhập nhanh không có `customerId` chỉ xuất hiện sau khi được liên kết rõ ràng.

## Quyền CRM

- Root Admin và `ADMIN`: toàn quyền CRM.
- Bổ sung quyền phòng ban riêng `canViewCustomers` và `canManageCustomers`, kế thừa từ cha xuống con giống các quyền hiện tại.
- Owner được xem và thêm tương tác cho khách mình phụ trách; quyền chuyển owner, lưu trữ và hợp nhất khách trùng dành cho Admin hoặc người có `canManageCustomers`.
- Nhân viên thấy khách hàng liên quan tới hồ sơ họ được tiếp nhận/giao task, nhưng dữ liệu nhạy cảm và toàn bộ lịch sử chăm sóc cần theo quyền CRM, không chỉ theo quyền hồ sơ.
- Mọi kiểm tra thực hiện ở server; ẩn nút trên UI không thay cho kiểm tra quyền bản ghi.

## Các giai đoạn triển khai

### CRM-1 — Hồ sơ và timeline khách hàng

> Trạng thái 22/09/2026: đã triển khai schema/migration, quyền phòng ban, tạo và lọc khách hàng tại `/customers`, trang chi tiết, owner/lifecycle, contact, interaction và timeline hợp nhất tour/booking/activity. Contact có thể sửa/lưu trữ; interaction có thể sửa và lưu phiên bản cũ; hồ sơ snapshot được gợi ý theo tên/SĐT nhưng chỉ liên kết sau khi người có quyền xác nhận.

- Thêm lifecycle, nguồn, owner và các mốc chăm sóc vào `Customer`.
- Thêm `CustomerContact`, `CustomerInteraction`, `CustomerAssignmentHistory` và hai quyền phòng ban CRM.
- Chuyển trang khách hàng từ danh sách Admin thuần túy thành danh sách CRM có tìm kiếm/lọc; thêm `/customers/[id]`.
- Hiển thị tổng quan, contact, lịch sử chăm sóc, hồ sơ, tour/dịch vụ, booking và activity nhân viên.
- Cho phép ghi nhận tương tác, đặt lịch chăm sóc tiếp và đổi owner có lịch sử.

### CRM-2 — Nhắc việc và chất lượng dữ liệu

> Trạng thái 22/09/2026: đã triển khai trang `/customers/follow-ups`, lọc quá hạn/sắp đến hạn, job tạo notification cho owner có khóa chống trùng và quy trình đề xuất–xác nhận/từ chối hợp nhất khách nghi trùng.

- Trang “Cần chăm sóc” theo owner/phòng ban, sắp đến hạn/quá hạn.
- Tạo thông báo trong ứng dụng có chống trùng; chưa gửi email/SMS.
- Hoàn thiện màn hình phát hiện khách nghi trùng theo điện thoại/email/mã số thuế để người có quyền xác nhận; không tự hợp nhất.

Job nhắc chăm sóc gọi `GET` hoặc `POST /api/cron/customer-follow-ups` với header `Authorization: Bearer <CRON_SECRET>`. Nên chạy mỗi 15–60 phút. Job lấy lịch đã quá hạn hoặc sẽ đến hạn trong 24 giờ; `Notification.dedupeKey` gồm khách hàng, owner và thời điểm lịch nên chạy lặp không gửi trùng, nhưng owner mới hoặc lịch mới vẫn nhận được thông báo.

Khi hợp nhất, người dùng phải chọn bản ghi được giữ lại và tạo đề xuất. Một thao tác xác nhận riêng mới chuyển hồ sơ, danh bạ, interaction và lịch sử phân công sang bản ghi đích; bản ghi nguồn được lưu trữ, không xóa cứng. Từ chối chỉ đóng đề xuất và không thay đổi dữ liệu khách hàng.

### CRM-3 — Phân tích và chăm sóc nâng cao

> Trạng thái 22/09/2026: đã triển khai dashboard `/customers/reports`, báo cáo theo kỳ/nguồn/owner/phòng ban, danh sách khách quá 30 ngày chưa chăm sóc và trang `/customers/classification` để quản lý nhóm, tag và phân loại khách hàng.

- Báo cáo số lần tương tác, khách chưa được chăm sóc, tỷ lệ hồ sơ/booking theo nguồn, owner và phòng ban.
- Tags/segments và chiến dịch chăm sóc thủ công.
- Chỉ xem xét tích hợp email, SMS hoặc tổng đài sau khi có nhà cung cấp, consent và chính sách lưu giữ dữ liệu.

Dashboard cá nhân luôn khả dụng và chỉ tổng hợp khách do user phụ trách hoặc hồ sơ user tiếp nhận. Quyền phòng ban `canViewReports` mở rộng báo cáo sang cây phòng ban được kế thừa; Admin xem toàn hệ thống. Chỉ số hiệu suất là số liệu vận hành gồm tương tác, hồ sơ và booking trong kỳ, không được coi trực tiếp là KPI lương thưởng.

Mỗi khách hàng có tối đa một `CustomerSegment` và nhiều `CustomerTag`. Nhóm dùng cho phân đoạn chính; tag mô tả nhiều thuộc tính giao nhau. Danh mục được lưu trữ mềm và việc gán lại chỉ áp dụng cho khách hàng nằm trong phạm vi `canManageCustomers` hoặc owner hiện tại.

## Cách triển khai database đã chốt

1. Cập nhật trực tiếp Prisma schema đích: mở rộng `Customer`, thêm contact, interaction, assignment history và quyền CRM. Không tạo bảng/cột tạm và không dual-write.
2. Tạo một migration CRM-1 đầy đủ để môi trường Docker/deploy vẫn có lịch sử schema xác định. Database setup mới có thể được tạo lại rồi chạy toàn bộ migration từ đầu.
3. Dùng giá trị mặc định `LEAD` cho lifecycle; `ownerId`, `lastContactAt` và `nextFollowUpAt` để nullable. Không viết backfill suy đoán owner từ activity cũ.
4. Không tạo bảng lịch sử tour/booking CRM. Timeline truy vấn trực tiếp quan hệ `Customer → WorkCase → WorkCaseItem/ServiceBooking/WorkCaseActivity`.
5. Không giữ API/UI khách hàng cũ và mới song song. Trang Admin hiện có được chuyển sang cấu trúc CRM, còn quyền truy cập nghiệp vụ dùng các route CRM thống nhất.
6. Sau khi schema/UI hoàn tất, tái tạo database development và chạy `pnpm run db:migrate`; seed hoặc nhập lại dữ liệu thử nghiệm nếu cần.
7. Chỉ tạo job nhắc việc sau khi timezone, lịch chạy và cơ chế chống thông báo trùng được kiểm thử.

## Tiêu chí hoàn thành CRM-1

- Một khách hàng có trang chi tiết và timeline thống nhất, không nhân đôi booking hay activity trong database.
- Thêm tương tác và đổi owner ghi đúng actor, thời gian và lịch sử.
- Danh sách lọc được theo lifecycle, owner, phòng ban phụ trách và lịch chăm sóc tiếp.
- User không có quyền không mở được khách hàng qua URL trực tiếp.
- Khách trùng tên không bị tự động gộp; hồ sơ snapshot không bị tự động liên kết sai.
- Root Admin hoạt động đầy đủ dù không có hàng `User`; owner luôn là user database hợp lệ.

## Chưa làm trong CRM-1

- Báo giá, giá mua/bán, thanh toán và công nợ.
- Gửi email/SMS, gọi điện hoặc đồng bộ hộp thư từ hệ thống bên ngoài.
- Marketing automation, scoring tự động hoặc AI phân loại khách.
- Hợp nhất khách hàng tự động và xóa cứng lịch sử.
- Chat nội bộ; module này được hoãn cho đến khi CRM-1 và CRM-2 ổn định.
