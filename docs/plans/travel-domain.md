# Mô hình nghiệp vụ du lịch: dữ liệu nền và hồ sơ việc

## Những điều đã xác nhận

- LP Travel phục vụ tour du lịch và đặt dịch vụ.
- “Việc” là **một hồ sơ/yêu cầu đi qua nhiều người, nhiều bước**, không đồng nghĩa một task giao cho một người.
- Khách hàng và nhà cung cấp có thể là **cá nhân hoặc doanh nghiệp**.
- Sản phẩm trước mắt là **tour và dịch vụ**, nhưng cần mở rộng loại về sau.
- Hồ sơ về lâu dài cần **báo giá, giá mua/giá bán và thanh toán**. Phiên bản đầu chỉ theo dõi yêu cầu, đặt dịch vụ và tiến độ xử lý; các chức năng tài chính sẽ bật ở giai đoạn sau.
- Mỗi hồ sơ có **một khách hàng chính**; người liên hệ của hồ sơ và người đi tour là hai danh sách riêng. Họ có thể trùng nhau hoặc trùng khách hàng chính nhưng không bắt buộc.
- **Không bắt buộc nhập người đi tour khi tạo hồ sơ.** Danh sách người đi tour chỉ bắt buộc trước khi bắt đầu đặt dịch vụ.
- **Đã chốt cách nhập nhanh:** phòng ban và người tiếp nhận phải chọn dữ liệu thật; khách hàng và tour/dịch vụ được chọn từ dữ liệu nền hoặc nhập tay. Người liên hệ và người đi tour nhập trực tiếp trong hồ sơ.

Đã có **lát cắt đầu tiên của dữ liệu nền**: bảng và giao diện Admin cho `Customer`, `Supplier`, `Product`; trang `/products` cho user đăng nhập xem danh mục đang hoạt động. Các phần còn lại trong tài liệu vẫn là thiết kế đề xuất, chưa có schema/API/UI. Các quy tắc chưa được người dùng xác nhận được ghi rõ ở cuối.

### Phạm vi dữ liệu nền đã triển khai

- `Customer` và `Supplier`: mã duy nhất, tên, loại `PERSON`/`ORGANIZATION`, điện thoại/email/mã số thuế/ghi chú tùy chọn, trạng thái hoạt động. Admin tạo/sửa/lưu trữ tại `/admin/customers` và `/admin/suppliers`; user thường chưa có quyền xem các danh sách này.
- `Product`: mã duy nhất, tên, `type` dạng mã mở rộng (gợi ý `TOUR` và `SERVICE`), mô tả, trạng thái. Admin quản lý tại `/admin/products`; user đăng nhập xem sản phẩm đang hoạt động tại `/products`.
- Cả ba bảng có `metadata` JSONB mặc định `{}` để lưu các thuộc tính thực tế chưa thành trường cứng. Form Admin nhập theo từng dòng **Key – Kiểu – Value** (văn bản, số, Đúng/Sai hoặc JSON nâng cao), không yêu cầu người dùng soạn toàn bộ JSON. Server từ chối key trùng/đụng tên trường cứng, giới hạn 50 key và 16 KB mỗi bản ghi.
- Chưa có nhiều contact cho một khách hàng/nhà cung cấp, liên kết nhà cung cấp–sản phẩm, chống trùng nâng cao, phân trang/tìm kiếm, audit nghiệp vụ, hồ sơ việc hoặc giá. Dữ liệu hiện được lưu trữ mềm bằng `active`, không xóa cứng trên UI.
- Migration `20260921100000_add_travel_master_data` cần chạy trước khi dùng UI mới. Chưa xác nhận migration trên database triển khai.
- Migration `20260921110000_add_master_data_metadata` thêm JSONB cho ba bảng, giữ nguyên bản ghi cũ với mặc định `{}`; chưa chạy trên database triển khai trong lượt này.

### Khi một metadata key trở thành trường cứng

1. Thống kê key, kiểu giá trị và tỷ lệ bản ghi đang dùng; thống nhất tên, kiểu dữ liệu, giá trị rỗng và quyền xem/sửa của trường mới.
2. Thêm cột nullable bằng migration riêng, backfill từ `metadata` sau khi kiểm tra dữ liệu sai kiểu; không xóa key cũ ngay.
3. Cho ứng dụng đọc cột mới, trong giai đoạn chuyển tiếp đồng bộ ghi theo chính sách đã chốt và đối chiếu kết quả.
4. Khi dữ liệu đã nhất quán, ngừng cho nhập key cũ và xóa nó khỏi metadata bằng migration riêng nếu cần. Không tự động chuyển metadata thành trường cứng chỉ vì có nhiều bản ghi dùng.

Metadata không thay cho bảng quan hệ, quyền truy cập hoặc trường cần lọc/tìm kiếm thường xuyên. Tránh lưu CCCD/hộ chiếu, giá mua hoặc dữ liệu thanh toán vào metadata khi chưa có chính sách bảo vệ tương ứng. Metadata của sản phẩm không được hiển thị trên trang `/products` cho user thường trong phiên bản hiện tại.

### Lát cắt Hồ sơ việc đã triển khai

- `WorkCase` lưu mã hồ sơ, tiêu đề, trạng thái, ưu tiên, ngày dự kiến, khách hàng snapshot, phòng ban và người tiếp nhận thật, cùng snapshot người tạo hỗ trợ Root Admin.
- `WorkCaseItem`, `WorkCaseContact`, `WorkCaseTraveler` lưu nhiều dòng nhu cầu, người liên hệ và người đi tour. Người đi tour có thể để trống lúc tạo hồ sơ.
- Trang `/work`, `/work/new`, `/work/[id]` hỗ trợ danh sách, tạo và xem hồ sơ. Khách hàng/sản phẩm có thể chọn dữ liệu nền hoặc nhập nhanh; Admin/Manager có tùy chọn đồng thời thêm dữ liệu nhập nhanh vào dữ liệu nền, Member chỉ lưu snapshot trong hồ sơ.
- Admin xem mọi hồ sơ; Manager xem hồ sơ thuộc phòng mình quản lý; Member xem hồ sơ mình tiếp nhận. Server kiểm tra lại phòng ban, membership và người tiếp nhận khi tạo.
- Đã có sửa tiêu đề/ưu tiên/ngày dự kiến/mô tả, chuyển trạng thái theo luồng và `WorkCaseActivity`. Chuyển sang `BOOKING` bị chặn nếu chưa có người đi tour; cập nhật thông tin và trạng thái được ghi activity cùng transaction.
- Đã có thêm/sửa/xóa dòng nhu cầu, người liên hệ và người đi tour trên trang chi tiết. Mỗi thao tác kiểm tra quyền ở server và ghi activity; không cho xóa dòng nhu cầu cuối cùng, hoặc người đi tour cuối cùng khi hồ sơ đang đặt/thực hiện dịch vụ. Hồ sơ hoàn tất/đã hủy bị chặn chỉnh sửa ở server.
- Chưa có sửa khách hàng chính, tìm kiếm/phân trang hoặc chống trùng khi tạo nhanh. Danh sách hồ sơ hiện giới hạn 100 bản ghi cập nhật gần nhất.
- Đã có booking theo dòng nhu cầu, nhà cung cấp có sẵn hoặc snapshot nhập tay, mã xác nhận/ngày dịch vụ và bốn trạng thái. Chỉ tạo booking khi hồ sơ ở bước đặt/thực hiện và có người đi tour; thay đổi được ghi activity.
- Đã có giao việc cơ bản và trang Kanban/Timeline; xem [kế hoạch giao việc](./tasks.md). Chưa có giá mua/bán hoặc thanh toán.
- Migration `20260921120000_add_work_cases` cần chạy trước khi dùng các trang hồ sơ; chưa chạy trên database triển khai trong lượt này.
- Migration `20260921130000_add_work_case_activity` thêm lịch sử hoạt động; chưa chạy trên database triển khai trong lượt này.

## Ranh giới các module

| Module | Vai trò | Không nên dùng thay cho |
| --- | --- | --- |
| Khách hàng | Bên đứng tên yêu cầu/mua tour hoặc dịch vụ trong hồ sơ. | User nội bộ, nhà cung cấp, mọi hành khách trong đoàn. |
| Nhà cung cấp | Bên cung ứng tour hoặc dịch vụ đầu vào; thông tin liên hệ, hợp đồng, trạng thái hợp tác. | Khách hàng hoặc nhân viên xử lý. |
| Sản phẩm | Danh mục thứ có thể tư vấn/bán/đặt: `TOUR`, `SERVICE`, loại mới sau này. | Một booking thực tế hay một hồ sơ việc. |
| Hồ sơ việc (`WorkCase`) | Một yêu cầu cụ thể của khách; đi từ tiếp nhận đến hoàn tất/hủy. | Task cá nhân hay bài bảng tin. |
| Người liên hệ và người đi tour | Hai danh sách thuộc hồ sơ, có thể là cùng người hoặc khác khách hàng chính. | Nhiều khách hàng chính của một hồ sơ. |
| Đặt dịch vụ (`ServiceBooking`) | Lần giữ chỗ/đặt thực tế với nhà cung cấp cho một dòng nhu cầu. | Dòng nhu cầu, báo giá hoặc phiếu thanh toán. |
| Giao việc (`WorkTask`) | Bước xử lý thuộc `WorkCase`, có người được giao, hạn và kết quả. | Trạng thái tổng thể của hồ sơ. |
| Bảng tin | Thông báo nội bộ theo audience; có thể gắn link tới hồ sơ nếu được phép. | Nơi lưu quyết định và lịch sử xử lý hồ sơ. |

Ví dụ: khách A yêu cầu tour 4 ngày và xe đón sân bay. Tạo một `WorkCase`, hai dòng nhu cầu liên kết sản phẩm tour và dịch vụ xe, sau đó giao các `WorkTask` tư vấn, xác nhận nhà cung cấp và hoàn tất booking. Nhà cung cấp của dịch vụ xe gắn với lần đặt dịch vụ, không bắt buộc gắn với toàn bộ khách hàng. Bước lập báo giá và thu tiền sẽ bổ sung sau, không giả định rằng booking đồng nghĩa đã thanh toán.

## Mô hình dữ liệu đề xuất

### Khách hàng và nhà cung cấp

- `Customer` và `Supplier` là hai thực thể riêng vì vòng đời, quyền xem và quy trình khác nhau. Cùng có `partyType = PERSON | ORGANIZATION`, tên hiển thị, mã nội bộ, trạng thái, ghi chú, thời gian tạo/sửa. Không dùng một bảng “đối tác” chung ở bản đầu nếu chưa có nhu cầu một bên đóng cả hai vai.
- Thông tin cá nhân/doanh nghiệp khác nhau được đặt ở trường/bảng chi tiết phù hợp; không ép cá nhân nhập mã số thuế hay doanh nghiệp nhập CCCD. `Contact` có thể lưu nhiều người liên hệ của doanh nghiệp, vai trò, số điện thoại/email; một cá nhân có thể là contact chính của chính họ.
- Trùng khách hàng/nhà cung cấp cần kiểm tra theo mã nội bộ, số điện thoại/email/mã số thuế khi có, nhưng không đặt unique tuyệt đối lên tên hay số điện thoại dùng chung. Cần quy trình gộp bản ghi trùng sau này.
- Hạn chế hiển thị CCCD/hộ chiếu, thông tin tài chính; không đặt vào tìm kiếm chung, bảng tin hoặc chat. Chốt chính sách lưu giữ và ai được xem trước khi thêm các trường nhạy cảm.

### Sản phẩm và dịch vụ

- `Product`: mã, tên, loại (`TOUR`, `SERVICE`, có thể mở rộng bằng danh mục loại thay vì enum cứng khi cần), mô tả, trạng thái, đơn vị tính/tiền tệ nếu cần. Không lưu booking và giá chốt của từng khách trực tiếp trong bản ghi danh mục.
- Thuộc tính riêng của tour (lịch trình, điểm đến, số ngày) và dịch vụ (loại dịch vụ, phạm vi cung cấp) nằm ở bảng chi tiết hoặc cấu trúc được kiểm soát; tránh nhiều cột nullable cho mọi loại sản phẩm. Chưa cần thiết kế catalog quá sâu khi chưa có ví dụ thực tế.
- `SupplierProduct` liên kết sản phẩm với một hoặc nhiều nhà cung cấp, lưu mã hàng phía nhà cung cấp/trạng thái hợp tác nếu cần. Giá mua/bán có hiệu lực theo thời gian là bài toán riêng; không ghi đè giá lịch sử khi danh mục thay đổi.

### Hồ sơ yêu cầu và thực hiện

- `WorkCase`: mã hồ sơ duy nhất, loại yêu cầu, tiêu đề, `customerId`, phòng ban phụ trách, người tiếp nhận, trạng thái tổng thể, mức ưu tiên, ngày bắt đầu/hạn, mô tả, thời gian tạo/sửa. Có lịch sử thay đổi người phụ trách, trạng thái và phòng ban.
- `WorkCase.customerId` là FK tùy chọn khi chọn/tạo dữ liệu nền; `customerNameSnapshot` là bắt buộc để hồ sơ luôn có đúng một khách hàng chính kể cả khi nhập nhanh. Không dùng mảng `customerIds` để biểu diễn người đi tour hay người liên hệ; một khách hàng chính có thể có nhiều hồ sơ.
- `WorkCaseContact`: danh sách người liên hệ cho riêng hồ sơ, gồm tên, vai trò (ví dụ đầu mối đặt dịch vụ/người liên hệ khẩn cấp), cách liên hệ cần thiết và tùy chọn liên kết tới `CustomerContact` nếu người đó đã nằm trong danh bạ khách hàng. Lưu thông tin liên hệ dùng tại thời điểm xử lý để việc sửa danh bạ sau này không làm sai lịch sử hồ sơ.
- `WorkCaseTraveler`: danh sách người thực sự đi tour, có thể để trống khi tạo hồ sơ và trong các bước tiếp nhận/tư vấn. Trước thao tác bắt đầu đặt dịch vụ phải có ít nhất một người đi tour; từng dịch vụ chỉ yêu cầu thêm trường hành khách thực sự cần để đặt. Có thể liên kết một người liên hệ/khách hàng hiện có nhưng không bắt buộc. Không tự động sao chép CCCD/hộ chiếu sang mọi hồ sơ; cần quy tắc xem, lưu giữ và xóa dữ liệu nhạy cảm riêng.
- Một người có thể vừa là khách hàng chính, vừa là người liên hệ, vừa là người đi tour; UI nên cho phép chọn lại người có sẵn thay vì nhập trùng, nhưng hai danh sách vẫn là quan hệ nghiệp vụ riêng. Chỉ mục/unique phải tránh ngăn hai người trùng tên hợp lệ.
- `WorkCaseItem`: nhiều dòng nhu cầu trong một hồ sơ; mỗi dòng có thể liên kết `productId`, mô tả chốt tại thời điểm yêu cầu, số lượng/ngày sử dụng/trạng thái riêng. Cho phép dòng dịch vụ chưa chọn sản phẩm cụ thể lúc tiếp nhận nếu quy trình cần.
- `ServiceBooking`/`Reservation` thuộc **phiên bản đầu** sau khi chốt quy trình đặt dịch vụ: gắn với `WorkCaseItem` và `supplierId`, mã đặt chỗ/xác nhận, ngày sử dụng, trạng thái đặt/giữ chỗ/xác nhận/hủy và mốc thời gian. Một dòng nhu cầu có thể cần nhiều lần đặt/thay nhà cung cấp; không đồng nhất “yêu cầu” với “đặt thành công”. Chưa nhập giá hay thanh toán ở màn này.
- Điều kiện chuyển bước đặt dịch vụ được kiểm tra ở server trong cùng transaction với việc tạo booking/chuyển trạng thái: hồ sơ có ít nhất một `WorkCaseTraveler` và các trường bắt buộc riêng của dịch vụ đã chọn. Không áp điều kiện này khi chỉ tạo/sửa nhu cầu hoặc giao việc tư vấn. Khi đã có booking đang hiệu lực, không cho xóa người đi tour cuối cùng mà không xử lý booking trước; thay đổi danh sách cần ghi lịch sử.
- `WorkTask` thuộc `WorkCase`, có người giao, người phụ trách, trạng thái, hạn, kết quả; nhiều task có thể xử lý song song. `WorkCaseActivity` ghi các thay đổi nghiệp vụ quan trọng, kể cả chuyển bước hoặc đổi nhà cung cấp. Comment trao đổi trong hồ sơ tách khỏi chat riêng.
- Khi đổi tên/giá/địa chỉ ở master data, hồ sơ cũ phải vẫn đọc đúng thông tin đã chốt. Lưu snapshot tối thiểu trên dòng hồ sơ/booking hoặc version có hiệu lực; FK dùng để tra cứu nguồn hiện tại.

### Chừa đường cho tài chính, chưa triển khai

- Giữ ID ổn định của `WorkCase`, `WorkCaseItem`, `ServiceBooking`, `Customer`, `Supplier`, `Product` để sau này thêm `Quotation`/`QuotationLine`, giá mua theo booking, giá bán theo báo giá, `Payment` và phân bổ thanh toán vào hồ sơ hoặc hóa đơn. Tránh gắn một cột `price` duy nhất vào hồ sơ vì một hồ sơ có thể nhiều dịch vụ, nhiều nhà cung cấp và nhiều lần báo giá.
- Báo giá về sau cần **phiên bản/snapshot** của tên dịch vụ, số lượng, đơn giá, tiền tệ, thuế/giảm giá và trạng thái gửi/chấp nhận; không tính lại báo giá cũ từ catalog hiện tại. Giá mua và giá bán là hai khái niệm riêng, phải có quyền xem riêng.
- Thanh toán về sau cần mô hình giao dịch và phân bổ, hỗ trợ đặt cọc, nhiều lần thu/chi, hoàn tiền và đối soát. Không dùng trạng thái `WorkCase` hoặc `ServiceBooking` làm bằng chứng đã thu tiền.
- Phiên bản đầu **không tạo các bảng báo giá/thanh toán rỗng và không hiển thị trường tiền chưa dùng**. Khi triển khai tài chính, thêm migration và quyền riêng trên nền các khóa liên kết đã ổn định; phải kiểm thử dữ liệu lịch sử trước khi bật.

## Quyền đề xuất

- `ADMIN` quản trị dữ liệu nền và xem mọi hồ sơ. Vai trò `MANAGER` trong phòng ban quản lý hồ sơ/task thuộc phòng ban mình; `MEMBER` chỉ thấy hồ sơ được giao/tham gia hoặc được chia sẻ rõ ràng. Quyền xem khách hàng/nhà cung cấp cần kiểm tra độc lập, không suy ra từ quyền file uploader.
- Quyền xem danh sách liên hệ/hành khách kế thừa quyền đọc hồ sơ nhưng trường nhạy cảm (CCCD, hộ chiếu, ngày sinh nếu có) phải kiểm tra quyền chi tiết; không đưa các trường này vào danh sách hồ sơ, thông báo, bảng tin hoặc chat.
- Danh sách sản phẩm đang hoạt động có thể mở cho nhân viên đăng nhập; quyền sửa catalog và nhà cung cấp mặc định chỉ Admin hoặc vai trò nghiệp vụ riêng sau khi chốt. Không dùng `Role.ADMIN` cho mọi thao tác nếu sau này có bộ phận kinh doanh/điều hành.
- Một link từ bảng tin/chat tới hồ sơ **không cấp quyền** đọc hồ sơ. Server vẫn kiểm tra quyền `WorkCase` và quyền file đính kèm khi mở link.
- Root Admin từ env không là hàng `User`; lịch sử hồ sơ cần actor type/snapshot như [lộ trình](./roadmap.md), không gắn FK `root` giả.

## Thứ tự triển khai an toàn

1. Chốt mã định danh, trường bắt buộc và quyền cho Customer/Supplier/Product; làm CRUD, tìm kiếm, chống trùng cơ bản và audit.
2. Chốt các trạng thái của `WorkCase`, các bước xử lý và trường dữ liệu đầu vào theo ví dụ thật; làm hồ sơ với một khách hàng chính, danh sách liên hệ/hành khách và dòng nhu cầu, chưa cần booking tài chính.
3. Làm đặt dịch vụ với nhà cung cấp, giao việc theo hồ sơ, lịch sử và thông báo; chưa có giá, công nợ hoặc thanh toán.
4. Khi quy trình đã ổn định, thiết kế báo giá, giá mua/giá bán, chứng từ và thanh toán bằng giai đoạn riêng có quyền riêng.
5. Bảng tin chỉ liên kết hồ sơ khi có nhu cầu; chat là kênh trao đổi, không thay activity/comment có giá trị nghiệp vụ.

## Cần xác nhận trước khi tạo schema

1. **Đã chốt:** một khách hàng chính và hai danh sách riêng cho người liên hệ/người đi tour. Người đi tour không bắt buộc lúc tạo hồ sơ, nhưng cần ít nhất một người trước khi bắt đầu đặt dịch vụ. Còn cần chốt các trường tối thiểu của từng danh sách và trường nào bắt buộc theo từng loại dịch vụ.
2. Quy trình thực tế gồm những trạng thái/bước nào: tiếp nhận → tư vấn → báo giá → xác nhận → đặt dịch vụ → thực hiện → hoàn tất/hủy? Ai được chuyển từng bước?
3. **Đã chốt phạm vi:** báo giá, giá mua/bán và thanh toán để giai đoạn sau. Trước khi bật giai đoạn đó vẫn cần chốt tiền tệ, thuế, đặt cọc/công nợ, chứng từ và quyền xem giá mua.
4. Sản phẩm tour là tour mẫu để bán nhiều lần, hay mỗi đoàn là tour thiết kế riêng? Nhà cung cấp có thể cung cấp nhiều sản phẩm cùng lúc không?
5. Quyền xem hồ sơ: toàn phòng ban hay chỉ người được phân công? Khách hàng/nhà cung cấp có được nhìn thấy dữ liệu của nhau không? Mặc định đề xuất: chỉ người được giao/tham gia, Manager phòng phụ trách và Admin; không chia sẻ chéo mặc định.
