# Nhật ký triển khai

## Nền tảng

- Khởi tạo Next.js 16 App Router với TypeScript.
- Tailwind CSS 4 và shadcn/Base UI.
- PostgreSQL qua Prisma.
- Dockerfile và Docker Compose.

## Trang chủ

- Trang `/` tập trung vào Lead, hiển thị tổng Lead, Lead đã xác nhận, tổng giá trị báo giá, Lead quá ngày đi và lịch chăm sóc trong 30 ngày gần nhất theo `Date Received`.
- Dashboard tuân theo quyền tài nguyên và quyền đọc từng cột Lead; các chỉ số không đủ quyền dữ liệu nguồn sẽ được ẩn.
- Hiển thị tám Lead cập nhật gần nhất và lối tắt tới danh sách Lead, dashboard Lead, hiệu suất cá nhân và dữ liệu nền. Các module CRM, hồ sơ việc, công việc và bảng tin vẫn giữ nguyên đường dẫn nhưng không còn xuất hiện trên trang chủ.

## Authentication và user

- Root Admin trong environment.
- User database với FullName, UserName, password hash, role và trạng thái active.
- Login/logout bằng JWT session cookie.
- Avatar trên header mở menu tài khoản gồm lối vào `/profile` và nút đăng xuất.
- Trang hồ sơ cho phép user database tự cập nhật họ tên, email, số điện thoại, CCCD và đổi mật khẩu; Root Admin tiếp tục quản lý thông tin đăng nhập qua environment.
- Trang admin tạo, sửa, khóa và xóa user.
- Hồ sơ user có email, số điện thoại, CCCD và bộ phận; Admin quản lý, user xem tại `/profile`.
- Vai trò hệ thống chuyển sang bảng `SystemRole`; Admin CRUD tại `/admin/access-control`, có thể tạo nhiều vai trò và đánh dấu vai trò toàn quyền. Root Admin trong environment vẫn luôn có toàn quyền.
- Các loại quyền phòng ban chuyển sang `DepartmentPermissionDefinition` và `DepartmentMembershipPermission`; form user lấy quyền động từ database. Bảy quyền cũ được migration cùng toàn bộ grant hiện có, sau đó kiểm tra quyền đọc từ bảng gán mới và vẫn kế thừa cha–con.
- Migration vai trò/quyền động: `20260925120000_add_dynamic_roles_permissions`. Chưa chạy migration trên database triển khai trong lượt thực hiện này.
- Thêm `AccessResource`, `BasePermission` và `ResourcePermission`; tổ hợp tài nguyên–quyền gốc là duy nhất và dùng khóa ngoại `Restrict` để không làm mất định nghĩa đang được sử dụng.
- Admin CRUD ba lớp quyền tại `/admin/resource-permissions`; migration khởi tạo bốn quyền gốc `CREATE`, `READ`, `UPDATE`, `DELETE`.
- Migration quyền tài nguyên: `20260925130000_add_resource_permissions`. Chưa chạy migration trên database triển khai trong lượt thực hiện này.
- Mỗi `ResourcePermission` có tên riêng để hiển thị và gán quyền; tên là duy nhất, còn cặp tài nguyên–quyền gốc vẫn không được trùng.
- Thêm `DepartmentMembershipResourcePermission` để gán quyền tài nguyên cho user tại membership phòng ban chính. Form tạo/sửa user hiển thị checkbox quyền được nhóm theo tài nguyên.
- Migration tên và gán quyền tài nguyên: `20260925140000_name_and_assign_resource_permissions`. Chưa chạy migration trên database triển khai trong lượt thực hiện này.
- Khởi tạo tài nguyên `LEADS`, bổ sung quyền gốc `IMPORT`/`EXPORT` và sáu quyền chức năng Lead; grant hiện có được backfill cho membership để tránh mất quyền sau migration.
- Thêm `LeadFieldRolePermission` với `canRead`/`canWrite` theo `SystemRole`; cấu hình cột cố định được quản trị RU tại `/admin/lead-fields`, gồm tên, nhóm, thứ tự và trạng thái.
- `/leads`, chi tiết, sửa trực tiếp và form sửa kiểm tra quyền tài nguyên trước, sau đó lọc cột theo vai trò. Export chỉ lấy cột `canRead`; import và mẫu import chỉ hiện/chạy khi có `LEADS.IMPORT`.
- Migration quyền cột Lead: `20260925150000_add_lead_field_role_permissions`. Chưa chạy migration trên database triển khai trong lượt thực hiện này.
- Thêm `/leads/dashboard` với bộ lọc khoảng Date Received và Date Confirmation, KPI Total/New/Hot/Quotation/Confirmed/Lost, Sales Funnel tám trạng thái và Revenue & Conversion. Hai khoảng ngày kết hợp theo điều kiện đồng thời; bộ lọc Date Confirmation chỉ hiện khi vai trò có quyền đọc cột. Dashboard kiểm tra `LEADS.READ` và ẩn từng nhóm số liệu theo quyền đọc cột của vai trò.
- Thêm nút tạo itinerary trên danh sách Lead và trang `/leads/[id]/itinerary`. Form tự tạo số ngày từ số đầu tiên trong Duration, cộng ngày từ Travel Date và dùng Destination làm tiêu đề/địa điểm hoạt động.
- Itinerary của Lead dùng lại `QuickItinerary`, form, preview và xuất DOCX/PDF/PNG/JPG; thêm quan hệ tùy chọn `QuickItinerary.leadId`. Ở chế độ Lead, nhập Lưu trú tự bật Overnight và dùng cùng địa điểm, xóa Lưu trú sẽ xóa cả hai.
- Migration liên kết itinerary với Lead: `20260928100000_link_quick_itineraries_to_leads`. Chưa chạy migration trên database triển khai trong lượt thực hiện này.
- Mỗi Lead chỉ có một itinerary. Khi đã có lịch trình, nút tạo đổi thành sửa; Lead ID mở trang chi tiết và trang này hiển thị lịch trình cùng chức năng xuất file.
- Migration `20260928110000_one_itinerary_per_lead` xóa các itinerary trùng cũ, chỉ giữ bản cập nhật gần nhất rồi tạo unique constraint cho `QuickItinerary.leadId`. Chưa chạy migration trên database triển khai trong lượt thực hiện này.
- Thêm mẫu `Confirmation` tại `/leads/[id]/confirmation`, mỗi Lead có tối đa một bản. Confirmation và Itinerary có thể tạo độc lập theo bất kỳ thứ tự nào; dữ liệu từng ngày được dùng chung và tự điền hai chiều khi tạo hoặc sửa tài liệu còn lại. Confirmation tự sinh phần 2–4 từ dữ liệu chung, gồm Header/Footer, Brief Itinerary, Details Itinerary, Inclusions, Exclusions và NOTES.
- Phần `1. Confirmation` cho nhập Number of Guests, Number of Rooms, Nationality, Guide, Note và nội dung từng dòng Information Details. Cột Date được server tự sinh từ `Travel Date` và số đầu tiên trong `Duration`; `MÃ ĐOÀN` lấy `Lead ID (Duration)`.
- Khi tạo Confirmation mới, Number of Guests tự điền từ `No. of Pax` và Nationality tự điền từ `Country` nếu người dùng có quyền đọc các cột tương ứng; cả hai vẫn cho phép sửa. `Essential Travel Info to Vietnam before tour` là dòng tiêu đề màu xanh, in đậm, gạch chân ngay trên Information Details thay vì ô nhập nội dung; `MÃ ĐOÀN` được căn giữa, tăng cỡ chữ, có mục lục 1–4 và đường phân cách bên dưới trên bản xem và DOCX. Các phần dùng tiêu đề cố định `1-Confirmation`, `2-Brief Itinerary`, `3-Details Itinerary`, `4-Inclusion & Exclusion`; Confirmation không còn ô nhập tên phần Itinerary.
- Cuối phần `2-Brief Itinerary`, trước `3-Details Itinerary`, Confirmation hiển thị ghi chú cố định màu đỏ, in nghiêng về giờ nhận/trả phòng tiêu chuẩn và yêu cầu mang hộ chiếu hợp lệ; bản xem và DOCX dùng cùng nội dung.
- Tài liệu Confirmation đánh số `2. ITINERARY - Destination`, `3. Details Itinerary`, `4. Quotation & Information`, hỗ trợ sửa và xuất DOCX/PDF/PNG/JPG. Nút tạo/xem được bổ sung tại danh sách và chi tiết Lead.
- Migration `20261021100000_add_lead_confirmations` tạo `LeadConfirmation` và `LeadConfirmationDay`; migration đã được áp dụng thành công vào PostgreSQL ngày 21/10/2026.
- Migration `20261021110000_add_itinerary_document_enabled` tách trạng thái đã tạo Itinerary khỏi vùng dữ liệu lịch trình dùng chung, để Confirmation có thể được tạo trước mà không làm giao diện hiểu nhầm rằng Itinerary đã tồn tại.
- Phương tiện trong form itinerary có checkbox `Private Car` và `ESG`, đồng thời vẫn cho phép sửa nội dung phương tiện tùy chỉnh. Bữa ăn hiện chỉ gồm Breakfast, Lunch và Dinner; preview và file xuất dùng thứ tự `B/L/D`.
- Brunch từng được thêm bởi migration `20260928120000_add_itinerary_brunch`, sau đó được loại khỏi lịch trình tour, hồ sơ và tạo nhanh bằng migration `20260929120000_remove_itinerary_brunch`. Chưa chạy migration xóa trên database triển khai trong lượt thực hiện này.
- Lựa chọn phương tiện trên form tạo itinerary gồm `Private Car` và `ESG` (thay cho `Shuttle Bus`). Mỗi ngày có thêm nội dung Flight; preview và DOCX hiển thị `Flight: ...` chữ đen in đậm trước nội dung, riêng ngày cuối hiển thị sau nội dung.
- Migration Flight cho lịch trình tour, hồ sơ và tạo nhanh: `20260928140000_add_itinerary_flight`. Chưa chạy migration trên database triển khai trong lượt thực hiện này.

## Phân quyền và tích hợp uploader

- Thêm API nghiệp vụ `/api/travel-files` để CRUD file trong một thư mục con `Travel/{thu_muc}` mà không cần client biết `folderId` hoặc API token uploader. API trả URL xem/tải có kiểm tra lại session, hỗ trợ upload, danh sách, xem trực tiếp, download, cập nhật thành version mới và xóa; quyền user được ánh xạ lần lượt vào `canUpload`, `canList`, `canRead`, `canDelete`, còn tự tạo thư mục yêu cầu thêm `canCreateFolder` trên `Travel`.
- Thêm `TravelFileUpload` để module nghiệp vụ truyền tên thư mục, upload một file và nhận metadata/URL qua callback; thêm `TravelFileViewer` để preview, mở tab mới và tải file từ URL. Viewer dùng lại renderer File Manager và `downloadUrl` riêng để thao tác tải luôn đi qua API kiểm tra quyền.
- Bảng `FolderPermission` với năm quyền.
- Quyền folder cha kế thừa xuống folder con.
- Token uploader được giữ trong environment phía server.
- API proxy kiểm tra quyền user trước khi gọi uploader.
- Kiểm tra file thật sự thuộc folder trước khi đọc hoặc xóa.
- Ký HMAC danh tính user khi gọi uploader.
- Ghi audit upload, download, delete cùng user, thời gian, IP, user-agent và request ID.
- Tạo metadata version 1 và SHA-256 khi upload; file cũ được migration thành version 1.
- Xóa file theo cơ chế soft delete trong metadata và loại khỏi danh sách đang hoạt động.
- Trang admin uploader tra cứu audit theo hành động, user, file, folder và thời gian.
- Thùng rác cho phép khôi phục hoặc xóa vĩnh viễn nội dung file.
- Admin có thể tải từng version còn tồn tại trên filesystem.
- User có thể upload phiên bản mới và khôi phục version cũ thành version mới.
- Chống ghi đè đồng thời bằng `If-Match` và trả `409 Conflict` khi version đã thay đổi.
- Giới hạn số version mỗi file bằng `MAX_FILE_VERSIONS`.
- Editor trực tuyến cho file text/code với lock, heartbeat và autosave draft.
- Lưu nội dung chỉnh sửa thành version mới và so sánh song song hai version.
- Trang `/admin/activity` cho Admin LP Travel xem hoạt động của toàn bộ user trong phạm vi API token.
- Lịch sử Admin có bộ lọc, phân trang và thông tin user được ghép từ PostgreSQL LP Travel.
- Bổ sung type declaration cho `mammoth/mammoth.browser`; loại hai implementation File Manager legacy không được import khỏi phạm vi TypeScript build.

## File manager

- Cây thư mục và breadcrumb.
- Grid View, List View và Gallery View.
- Ghi nhớ view bằng localStorage.
- Tìm kiếm, sắp xếp và panel chi tiết.
- Upload nhiều file tuần tự và kéo-thả.
- Tạo folder con, download và xóa file theo quyền.
- Preview ảnh, PDF, DOCX, video, audio, text và code.

## Phòng ban và dữ liệu nền du lịch

- Phòng ban có bảng `Department`/`DepartmentMembership`, danh bạ, vai trò Manager/Member và trang Admin quản lý.
- Phòng ban hỗ trợ cây cha–con nhiều cấp; kiểm tra server ngăn tự làm cha và tạo chu trình.
- Membership có quyền quản lý thành viên, hồ sơ việc, giao việc, booking và xem báo cáo; quyền cha kế thừa xuống mọi phòng ban con.
- Root Admin trong environment và Admin database có toàn quyền nghiệp vụ. Các Manager hiện có được migration cấp năm quyền để giữ tương thích hành vi.
- Quyền hồ sơ việc, giao việc và booking đã được áp dụng ở server; quyền quản lý thành viên và xem báo cáo được chuẩn bị cho các màn hình tương ứng sau này.
- Thêm `Customer` và `Supplier` riêng cho cá nhân/doanh nghiệp; Admin tạo, sửa, lưu trữ thay vì xóa cứng.
- Thêm dữ liệu nền `SupplierType` có mã, tên, mô tả, metadata và trạng thái; quản lý tại `/admin/supplier-types`. Nhà cung cấp liên kết tùy chọn tới một loại và vẫn giữ quan hệ khi loại được lưu trữ.
- Nhà cung cấp có nhiều địa chỉ và nhiều số điện thoại với nhãn và một mục chính; quản lý tại `/admin/suppliers/[id]`. Số chính được đồng bộ về trường `Supplier.phone` để tương thích tìm kiếm và nghiệp vụ cũ.
- Thêm `Product` với loại mở rộng, gợi ý tour/dịch vụ; Admin quản lý, user đăng nhập xem danh mục đang hoạt động.
- Tour có lịch trình con theo ngày với số thứ tự ngày, tiêu đề, điểm bắt đầu/kết thúc, địa điểm diễn ra hoạt động, nơi lưu trú, bữa sáng/trưa/tối, nội dung, ghi chú và metadata; Admin nhập metadata theo cặp Key–Kiểu–Value tại `/admin/products/[id]`, user xem lịch trình trong `/products`.
- Thêm `metadata` JSONB cho ba bảng dữ liệu nền; form Admin nhập theo các cặp Key–Kiểu–Value, server kiểm tra key và kích thước.
- Migration dữ liệu nền: `20260921100000_add_travel_master_data`. Chưa chạy migration trên database triển khai trong lượt thực hiện này.
- Migration metadata: `20260921110000_add_master_data_metadata`. Chưa chạy migration trên database triển khai trong lượt thực hiện này.
- Migration cây và quyền phòng ban: `20260921150000_add_department_hierarchy_permissions`. Chưa chạy migration trên database triển khai trong lượt thực hiện này.
- Migration lịch trình tour: `20260922130000_add_product_itinerary_days`. Chưa chạy migration trên database triển khai trong lượt thực hiện này.
- Migration metadata lịch trình: `20260922140000_add_itinerary_day_metadata`. Chưa chạy migration trên database triển khai trong lượt thực hiện này.
- Migration địa điểm hoạt động: `20260922150000_add_itinerary_activity_location`. Chưa chạy migration trên database triển khai trong lượt thực hiện này.
- Migration loại nhà cung cấp: `20260922160000_add_supplier_types`. Chưa chạy migration trên database triển khai trong lượt thực hiện này.
- Migration nhiều địa chỉ/số điện thoại nhà cung cấp: `20260922170000_add_supplier_addresses_phones`; số điện thoại cũ được chuyển thành số chính. Chưa chạy migration trên database triển khai trong lượt thực hiện này.
- Thêm dữ liệu nền `DocumentTemplate` cho Header, Footer và nội dung dùng lại; hỗ trợ mã, tên, nội dung, metadata, trạng thái và một mẫu mặc định theo từng loại tại `/admin/document-templates`.
- Nội dung mẫu có thể lưu văn bản, HTML và placeholder nhưng chưa được render trực tiếp; module sử dụng mẫu sau này phải thay placeholder và xử lý HTML an toàn.
- Migration mẫu tài liệu: `20260923110000_add_document_templates`. Chưa chạy migration trên database triển khai trong lượt thực hiện này.
- Khi tạo itinerary, người dùng có thể chọn Header/Footer đang hoạt động; mẫu mặc định của từng loại được chọn sẵn. Nội dung và metadata được lưu snapshot trong itinerary để thay đổi ở dữ liệu nền không làm đổi tài liệu cũ.
- Màn hình sửa itinerary cho phép đổi mẫu hoặc chủ động cập nhật snapshot từ mẫu hiện tại. Preview thay các placeholder `companyName`, `workCaseCode`, `workCaseTitle`, `customerName`, `updatedAt` và hiển thị dưới dạng văn bản an toàn.
- Migration snapshot Header/Footer của itinerary: `20260923120000_add_itinerary_template_snapshots`. Chưa chạy migration trên database triển khai trong lượt thực hiện này.
- Header/Footer template hỗ trợ ảnh PNG, JPEG, WEBP hoặc GIF tối đa 10 MB. Ảnh được upload bằng uploader hiện có vào đúng folder `Travel/Templates`; PostgreSQL chỉ lưu folder ID, stored name, MIME, tên gốc và alt text.
- Preview template và itinerary đọc ảnh qua route bảo vệ; người dùng được xem ảnh snapshot của itinerary trong phạm vi hồ sơ mà không cần quyền duyệt trực tiếp toàn bộ folder Templates.
- Khi itinerary chọn hoặc refresh Header/Footer, tham chiếu ảnh cũng được snapshot cùng nội dung chữ. Thay/gỡ ảnh khỏi template không tự xóa file cũ trong uploader để giữ audit và lịch sử file.
- Migration ảnh template: `20260923130000_add_document_template_images`. Chưa chạy migration trên database triển khai trong lượt thực hiện này.
- Lịch trình hồ sơ có tùy chọn hướng dẫn viên theo từng ngày; khi chọn, bản sinh ra hiển thị `Tour guide: Yes` dưới phương tiện ở bảng tóm tắt và phần chi tiết.
- Preview itinerary có thể tải xuống Word `.docx`, PNG, JPG và PDF. File được tạo từ đúng snapshot hiện tại nên bao gồm Header/Footer chữ và ảnh đang áp dụng.
- PNG/JPG dùng `html-to-image`; PDF dùng `pdf-lib` và tự chia nội dung dài thành nhiều trang A4. Không cấp quyền chạy postinstall của dependency bị chặn bởi supply-chain policy.
- Migration hướng dẫn viên: `20260923140000_add_itinerary_tour_guide`. Chưa chạy migration trên database triển khai trong lượt thực hiện này.
- Thêm module `/quick` để tạo itinerary độc lập mà không cần hồ sơ việc hoặc lịch trình tour mẫu. Mọi trường theo ngày được nhập tay, hỗ trợ thêm/xóa ngày, Header/Footer mặc định hoặc tự chọn và lưu nháp PostgreSQL.
- User thường chỉ xem/sửa itinerary nhanh do mình tạo; Admin xem được toàn bộ. `/quick/[id]` có chế độ xem, sửa và dùng chung thanh xuất DOCX/PDF/PNG/JPG.
- Word được xuất dưới dạng `.docx` thật với bảng, đoạn nội dung, ảnh Header/Footer; dependency `docx` được dùng cùng `html-to-image` và `pdf-lib`.
- Migration itinerary tạo nhanh: `20260923150000_add_quick_itineraries`. Chưa chạy migration trên database triển khai trong lượt thực hiện này.
- Mỗi ngày itinerary hỗ trợ checkbox Overnight và chỉ hiện ô địa điểm khi được chọn; preview/DOCX sinh dòng `Overnight in ...` chữ đen in đậm sau nội dung ngày.
- Phần chi tiết sinh dòng `Meals: Breakfast, Lunch, Dinner` theo các bữa đã chọn ngay dưới Accommodation; ghi chú hiển thị thành `Note: ...` chữ nghiêng màu đỏ.
- Sau ngày cuối, tài liệu chừa khoảng ba dòng và căn giữa `End of services!` chữ đen in đậm. Quy tắc áp dụng đồng nhất cho itinerary hồ sơ, Tạo nhanh và các định dạng xuất.
- Migration Overnight: `20260923160000_add_itinerary_overnight`. Chưa chạy migration trên database triển khai trong lượt thực hiện này.
- Admin cấu hình nội dung `Inclusions`, `Exclusions` và `NOTES` tại `/admin/itinerary-settings`, nhập mỗi bullet trên một dòng. Khi tạo itinerary từ Lead, ba nội dung được lưu snapshot để thay đổi cấu hình sau này không làm đổi tài liệu cũ.
- Preview Lead, trang xem itinerary và DOCX hiển thị `II. Quotation & Information` sau `End of services!`, cách ba dòng; Inclusions/Exclusions nằm trong bảng hai cột và NOTES ở bên dưới. Migration: `20260929110000_add_itinerary_information`. Chưa chạy migration trên database triển khai trong lượt thực hiện này.
- Thêm dữ liệu nền `Channel` với mã, tên, mô tả, metadata và trạng thái; Admin CRUD tại `/admin/channels`. Migration tạo sẵn Instagram, TikTok, Google và Facebook.
- Migration Channel: `20260924100000_add_channels`. Chưa chạy migration trên database triển khai trong lượt thực hiện này.
- Bổ sung ba bảng `Country`, `LeadSource`, `TravelType`; CRUD dùng chung trang `/admin/channels` và được tách thành bốn tab để tiếp tục mở rộng dữ liệu nền sau này.
- Migration Country/Lead Source/Travel Type: `20260924110000_add_country_lead_source_travel_type`. Chưa chạy migration trên database triển khai trong lượt thực hiện này.
- `/admin/channels` có thêm các tab Lead Status, Lead Quality, Preferred Contact, Hotel Category, Booking Status, Payment Status, Follow-up Status, Lost Reason và Meal Preference; mỗi danh mục có bảng, metadata và CRUD lưu trữ/khôi phục riêng.
- Form tạo Lead lấy gợi ý từ các danh mục mới nhưng vẫn cho phép nhập text; bổ sung trường snapshot `preferredContact` và cấu hình quyền trường tương ứng.
- Migration danh mục Lead: `20260925110000_add_lead_lookup_tables`. Chưa chạy migration trên database triển khai trong lượt thực hiện này.
- Chưa có danh bạ nhiều người liên hệ ở dữ liệu nền, liên kết supplier–product, booking, giá hoặc thanh toán.

## Hồ sơ việc

- Thêm `WorkCase`, dòng nhu cầu, người liên hệ và người đi tour; snapshot khách hàng/sản phẩm bảo toàn thông tin nhập tay.
- Phòng ban và người tiếp nhận phải là dữ liệu thật; khách hàng/sản phẩm có thể chọn hoặc nhập nhanh.
- Admin/Manager có thể lưu dữ liệu nhập nhanh vào dữ liệu nền; Member chỉ lưu trong hồ sơ.
- Có trang danh sách, tạo và chi tiết theo phạm vi Admin/Manager/Member.
- Migration hồ sơ việc: `20260921120000_add_work_cases`. Chưa chạy migration trên database triển khai trong lượt thực hiện này.
- Có sửa thông tin cơ bản, chuyển trạng thái theo luồng và activity ghi cùng transaction; bắt buộc có người đi tour trước trạng thái đặt dịch vụ.
- Migration activity: `20260921130000_add_work_case_activity`. Chưa chạy migration trên database triển khai trong lượt thực hiện này.
- Có CRUD dòng nhu cầu, người liên hệ và người đi tour; mọi thao tác ghi activity và có ràng buộc không xóa dữ liệu tối thiểu cần thiết.
- Form tạo hồ sơ hiển thị lỗi kiểm tra nghiệp vụ ngay trên giao diện và trạng thái đang gửi, không đẩy lỗi nhập liệu ra Runtime Error của Next.js.
- Form tạo hồ sơ giữ nguyên toàn bộ dữ liệu và các dòng đã thêm khi server trả lỗi nghiệp vụ, để người dùng sửa lỗi rồi gửi lại mà không phải nhập từ đầu.
- Toàn bộ form tại trang chi tiết hồ sơ bắt lỗi server action tại từng form, khóa điều khiển khi đang gửi và hiển thị cảnh báo nghiệp vụ trên giao diện.
- Thêm `/work/[id]/itinerary`: người dùng nhập ngày, chọn lịch trình mẫu của tour, phương tiện và bữa ăn để sinh bản lịch trình chi tiết.
- Bản lịch trình lưu snapshot riêng theo từng ngày gồm tiêu đề, địa điểm, lưu trú, bữa ăn, phương tiện, nội dung, ghi chú và metadata nguồn; người dùng có thể chỉnh sửa rồi lưu nháp mà không thay đổi tour mẫu.
- Khi sửa bản nháp, người dùng có thể thêm ngày mới từ lịch trình mẫu hoặc chọn lại mẫu để gen lại nội dung của một ngày; ngày đi, phương tiện và bữa ăn của hồ sơ được giữ riêng.
- Trang xem lịch trình hiển thị bảng tóm tắt và nội dung chi tiết theo mẫu tài liệu. Mọi lần tạo/lưu nháp đều ghi hoạt động hồ sơ.
- Lịch trình hồ sơ, lịch trình Lead/Tạo nhanh và Invoice có `layoutVersion` riêng cùng nút `Gen theo mẫu mới`. Thao tác nâng phiên bản cấu trúc đang áp dụng, giữ nguyên toàn bộ nội dung sửa tay, ngày, Item, Payment Option và snapshot Header/Footer đã chọn. Với lịch trình, thao tác chỉ bổ sung Inclusions/Exclusions/Notes từ cấu hình hiện tại khi từng snapshot tương ứng đang trống; nội dung đã có không bị ghi đè. Migration phiên bản: `20260930100000_add_document_layout_versions`, migration thông tin lịch trình hồ sơ: `20260930110000_add_work_itinerary_information`.
- Migration lịch trình hồ sơ: `20260923100000_add_work_case_itineraries`. Chưa chạy migration trên database triển khai trong lượt thực hiện này.

## Booking và giao việc

- Booking gắn với hồ sơ, dòng nhu cầu và nhà cung cấp; hỗ trợ nhà cung cấp nhập tay dưới dạng snapshot, trạng thái yêu cầu/giữ chỗ/xác nhận/hủy.
- Chỉ tạo booking khi hồ sơ đang đặt/thực hiện dịch vụ và đã có người đi tour.
- Task gắn với hồ sơ, một assignment ban đầu, ưu tiên, ngày bắt đầu/hạn và trạng thái.
- Trang `/tasks` có Kanban và Timeline; thay đổi booking/task ghi vào lịch sử hồ sơ.
- Chỉ người được giao task được cập nhật trạng thái thực hiện; người tiếp nhận hồ sơ hoặc người có quyền giao việc chỉ được hủy task; Admin có toàn quyền. UI `/tasks` và `/work/[id]` ẩn các thao tác không được phép, đồng thời server action kiểm tra lại quyền.
- Người có quyền giao việc có thể sửa nội dung, ưu tiên, thời hạn và giao lại task; thay đổi được ghi vào activity của hồ sơ.
- Task có checklist và luồng trao đổi riêng; người thực hiện hoặc quản lý cập nhật checklist, người có quyền xem hồ sơ có thể bình luận.
- `/tasks` lọc theo trạng thái, người thực hiện, phòng ban và thời hạn; hiển thị cảnh báo quá hạn và sắp đến hạn trong ba ngày.
- Migration `20260921140000_add_bookings_and_tasks`. Chưa chạy migration trên database triển khai trong lượt thực hiện này.
- Migration mở rộng task `20260921160000_expand_work_tasks`. Chưa chạy migration trên database triển khai trong lượt thực hiện này.

## Bảng tin và thông báo

- Thêm bảng tin toàn công ty hoặc theo một/nhiều phòng ban, hỗ trợ nháp, đăng, sửa nội dung, ghim, lưu trữ và bình luận.
- Admin đăng mọi phạm vi và ghim bài; Manager đăng trong cây phòng ban mình quản lý. User chỉ đọc và bình luận bài đúng audience; kiểm tra quyền được thực hiện ở server.
- Khi đăng bài, hệ thống tạo thông báo cho user đang hoạt động trong audience; chọn phòng ban cha bao gồm thành viên các phòng ban con.
- Thêm `/notifications`, trạng thái đã đọc, đánh dấu từng thông báo hoặc tất cả; header hiển thị số chưa đọc.
- Giao task, giao lại task và bình luận task tạo thông báo trong ứng dụng cho người liên quan.
- Khi Lead B2C hoặc B2B được gán cho user, thông báo được tạo ngay trong thao tác tạo, sửa, import hoặc sửa trực tiếp, không chờ cron. Khi người khác sửa Lead đang được gán, người phụ trách cũng nhận thông báo.
- Lead B2C tạo nhắc lịch vào ngày trước và đúng ngày `Travel Date` qua endpoint cron chăm sóc khách hàng; khóa chống trùng ngăn tạo lại cùng loại thông báo cho cùng Lead và ngày đi.
- Mốc ngày của cron dùng `APP_TIME_ZONE`, mặc định `Asia/Ho_Chi_Minh`; môi trường triển khai cần gọi định kỳ endpoint cron hiện có.
- Migration bảng tin và thông báo `20260921170000_add_news_notifications`. Chưa chạy migration trên database triển khai trong lượt thực hiện này.

## Lead B2B và báo cáo Lead

- Thêm bảng `B2BLead` độc lập với Lead B2C và các trang `/b2b-leads`, `/b2b-leads/new`, `/b2b-leads/[id]`, `/b2b-leads/[id]/itinerary`, `/b2b-leads/[id]/invoice`. Form dùng cùng tập trường và dữ liệu gợi ý như B2C, mặc định Lead Source là `B2B` nhưng vẫn cho nhập giá trị khác.
- Danh sách B2B phân trang 20 dòng, tìm gần đúng theo Customer Name; lọc theo Lead Status, Lead Quality, Assigned To, Lead Source, Channel, Travel Type, khoảng Date Received và Travel Date; hỗ trợ chọn nhanh tháng này/tháng trước/quý này/quý trước, sắp xếp Date Received hoặc Travel Date tăng/giảm và giữ toàn bộ bộ lọc khi phân trang. Trang tiếp tục hỗ trợ tạo, xem, sửa, xóa theo quyền `LEADS` cùng quyền cột của vai trò.
- Mỗi Lead B2B có tối đa một itinerary và một Invoice. Itinerary dùng cùng quy tắc Duration, Travel Date, Destination, template và xuất DOCX/PDF/PNG/JPG; Invoice dùng cùng header/footer, Payment Option, cấu hình tiền và xuất DOCX/PDF của Lead B2C.
- Migration `20261002100000_add_b2b_leads` tạo bảng B2B, bổ sung liên kết tùy chọn từ `QuickItinerary` và `LeadInvoice`, đồng thời cho phép Invoice liên kết một trong hai loại Lead. Migration đã được áp dụng và trạng thái Prisma migration đã đồng bộ.
- Thêm `/leads/report` để lập báo cáo B2C theo khoảng `Date Received`. Phần tổng quan, phân bổ Status/Channel/Quality, bảng chi tiết và nhận xét 1–2 được tổng hợp từ Lead; dòng tiêu đề tuần, bảng Instagram và nhận xét 3–6 do người dùng nhập, bảng Instagram có thể thêm hoặc xóa dòng.
- Báo cáo hỗ trợ xuất DOCX và PDF nhiều trang. Ô có Status `Invalid Number` được tô hồng, `Quotation Sent` được tô vàng ở màn hình và file xuất; Status trống được diễn đạt là `Chưa có Status`.
- Nhận xét Invalid Number chỉ đề xuất siết quy trình lấy số WhatsApp khi tỷ lệ lớn hơn 10%; từ 10% trở xuống ghi nhận quy trình đang tốt và cần phát huy.

## CRM khách hàng

- Customer bổ sung `whatsapp`, `country` và `dateReceived`; trường Last Contact dùng `lastContactAt` hiện có. Danh sách và chi tiết Customer hiển thị các thông tin này.
- `/customers` có tác vụ lấy Lead theo khoảng `createdAt` hoặc `updatedAt`, nhận diện Customer theo thứ tự Phone → WhatsApp → Email. Lead chưa có Customer được insert ngay; Lead thiếu cả ba định danh được bỏ qua để tránh tạo trùng.
- Customer đã tồn tại được liệt kê cùng từng giá trị trước/sau và chỉ cập nhật sau khi người dùng xác nhận. Migration: `20260928130000_add_customer_lead_fields`. Chưa chạy migration trên database triển khai trong lượt thực hiện này.
- Mỗi Lead có tối đa một Invoice snapshot. Form tự điền Bill To/Contact/Email/Booking Code; Contact ưu tiên Phone rồi mới dùng WhatsApp. Invoice Issuer, Contact và Email được snapshot từ user trong Assigned To, số điện thoại được chuẩn hóa về `+84`; server yêu cầu Lead đã được phân công trước khi lưu. Invoice date là ngày tạo Invoice. Due Date mặc định lấy Date Confirmation nhưng cho phép sửa, đồng thời cảnh báo khi Lead chưa có Date Confirmation hoặc hai ngày khác nhau.
- Invoice có nhiều dòng Item thêm/xóa trực tiếp; mỗi dòng tự tính Price/P và tổng Invoice là tổng Amount. Admin cấu hình phần trăm Deposit và số ngày Deposit đến hạn trước Due Date; Balance bằng Total Amount trừ Deposit, hạn Balance bằng Due Date. Cấu hình được snapshot khi lưu Invoice.
- Admin quản lý cấu hình tính tiền và nhiều Payment Option tại `/admin/invoice-settings`; Invoice có thể chọn nhiều option, sắp xếp bằng nút lên/xuống, lưu snapshot theo thứ tự và hiển thị dọc cách nhau hai dòng. Migration Invoice: `20260928150000_add_lead_invoices`, migration chọn nhiều option: `20260928160000_multiple_invoice_payment_options`, migration nhiều Item và cấu hình Deposit: `20260929130000_expand_invoice_items_settings`. Chưa chạy migration trên database triển khai trong lượt thực hiện này.
- Từ Invoice có thể mở `/leads/[id]/invoice/estimate` để lập một bảng dự toán. Bên chi phí hỗ trợ thêm/xóa dòng, nhập hạng mục, đơn giá VNĐ, số lượng, VAT và ghi chú thanh toán nhà cung cấp; Thành tiền tự tính bằng Đơn giá × Số lượng. Bên quyết toán sinh theo các Invoice Item với loại mặc định `Tour`, Description, Price/P, Qty và Amount USD; người dùng nhập Tiền Việt. Tổng chi phí gồm Thành tiền và VAT, lợi nhuận bằng tổng doanh thu VNĐ trừ tổng chi phí. Trang hỗ trợ in/lưu PDF và xuất XLSX thật với định dạng tiền, công thức tổng chi phí, tổng doanh thu và chốt lời. Migration: `20260929140000_add_invoice_estimates`. Chưa chạy migration trên database triển khai trong lượt thực hiện này.
- Thêm module Lead với form tiếp nhận thông tin về khách hàng, hành trình, nhu cầu, báo giá, booking, thanh toán và chăm sóc. Country, Lead Source, Travel Type và Channel dùng danh sách gợi ý nhưng vẫn cho phép nhập text để lưu snapshot.
- Lead có thêm `Date Confirmation` kiểu ngày; khi trường này có giá trị, mọi luồng tạo, sửa trực tiếp và import đều tự lưu `Lead Status` thành `Confirmed`. Cột tham gia cấu hình quyền, danh sách, chi tiết và import/export Excel. Migration: `20260929100000_add_lead_date_confirmation`. Chưa chạy migration trên database triển khai trong lượt thực hiện này.
- `LeadFieldConfig` khởi tạo cấu hình cho từng trường với `visibleTo` và `editableBy`, sẵn sàng giới hạn cột theo role/quyền ở giai đoạn tiếp theo.
- Migration Lead: `20260925100000_add_leads`. Chưa chạy migration trên database triển khai trong lượt thực hiện này.
- Danh sách `/leads` có nút xem/sửa từng Lead và chuyển đổi giữa bảng gọn với bảng ngang hiển thị toàn bộ trường được cấu hình. `/leads/[id]` hiển thị đầy đủ chi tiết và dùng lại form để cập nhật Lead.
- `/leads` hỗ trợ lọc độc lập theo khoảng `Date Received` và `Travel Date`, kèm lựa chọn nhanh tháng này, tháng trước, quý này và quý trước. View `Tất cả cột` giới hạn chiều rộng từng ô, hiển thị dấu `…` cho nội dung vượt quá và thu gọn các nút từng dòng vào nút xổ `Thao tác` mặc định đóng.
- `/leads` hỗ trợ xuất toàn bộ dữ liệu ra `.xlsx`, tải mẫu import có dropdown dữ liệu nền và import tối đa 2.000 dòng/10 MB. Import kiểm tra cột bắt buộc, ngày, số lượng, tiền, Assigned To và Lead ID trùng; kết quả từng dòng lỗi hiển thị tại trang.
- `/leads` phân trang server-side 25 dòng/trang, tìm gần đúng Customer Name và lọc theo Lead Status, Lead Quality, Assigned To, Channel, Travel Type; bộ lọc được giữ khi đổi kiểu xem và chuyển trang.
- Admin có nút xóa vĩnh viễn từng Lead tại cả danh sách gọn và bảng tất cả cột; giao diện yêu cầu xác nhận và server action kiểm tra lại quyền Admin trước khi xóa.
- Bảng `/leads?view=all` cho phép sửa trực tiếp một dòng tại một thời điểm, dùng chung gợi ý dữ liệu nền và danh sách người phụ trách; lỗi lưu hiển thị tại dòng mà không làm mất dữ liệu đang nhập.
- Lưu nhanh Lead kiểm tra `updatedAt` để không ghi đè thay đổi của người khác; khi có xung đột, người dùng được yêu cầu tải lại dữ liệu mới.

- Mở rộng trực tiếp `Customer` với lifecycle, nguồn, owner, lần chăm sóc cuối và lịch chăm sóc tiếp theo.
- Thêm danh bạ nhiều người liên hệ, lịch sử tương tác chăm sóc và lịch sử đổi nhân viên phụ trách; actor được lưu snapshot để hỗ trợ Root Admin.
- Thêm quyền `canViewCustomers`/`canManageCustomers` theo phòng ban và kế thừa cha–con; owner được quản lý khách mình phụ trách.
- Thêm `/customers` với tìm kiếm/lọc lifecycle/owner và `/customers/[id]` với CRM, contact, tương tác, hồ sơ, tour/dịch vụ, booking và activity nhân viên.
- Lịch sử tour/booking/activity được truy vấn trực tiếp từ dữ liệu nghiệp vụ, không sao chép sang bảng CRM.
- Cho phép tạo khách hàng trực tiếp từ CRM, sửa/lưu trữ người liên hệ và sửa lịch sử chăm sóc có lưu phiên bản cũ cùng actor.
- Timeline khách hàng hợp nhất tương tác, đổi owner, hồ sơ, booking và activity theo thời gian; hồ sơ nhập nhanh được gợi ý theo tên/SĐT và chỉ liên kết thủ công, đồng thời ghi activity.
- Migration CRM-1 `20260922090000_add_customer_crm`. Chưa chạy migration trên database triển khai trong lượt thực hiện này.
- CRM-2 thêm `/customers/follow-ups`, lọc lịch quá hạn/sắp tới theo owner và phát hiện khách nghi trùng bằng điện thoại, email hoặc mã số thuế đã chuẩn hóa.
- Hợp nhất khách hàng theo quy trình đề xuất rồi xác nhận/từ chối; dữ liệu nghiệp vụ được chuyển trong transaction, khách nguồn chỉ được lưu trữ và lịch sử duyệt được giữ lại.
- Endpoint cron `/api/cron/customer-follow-ups` tạo notification cho owner trước hạn 24 giờ hoặc khi quá hạn; `dedupeKey` unique chống thông báo trùng theo khách hàng, owner và lịch chăm sóc.
- Migration CRM-2 `20260922110000_add_customer_crm_followups_merge`. Chưa chạy migration trên database triển khai trong lượt thực hiện này.
- CRM-3 thêm dashboard `/customers/reports` với bộ lọc thời gian/phòng ban, KPI khách hàng–tương tác–hồ sơ–booking, hiệu suất nhân viên và bảng tổng hợp theo nguồn, owner, phòng ban.
- User thường xem báo cáo cá nhân; `canViewReports` mở phạm vi theo cây phòng ban và Admin xem toàn hệ thống.
- Thêm `/customers/classification`, `CustomerSegment`, `CustomerTag` và bảng gán nhiều tag; danh mục hỗ trợ lưu trữ mềm và gán theo quyền quản lý khách hàng.
- Báo cáo liệt kê khách chưa từng chăm sóc hoặc quá 30 ngày chưa chăm sóc, kèm nhóm và tag hiện tại.
- Migration CRM-3 `20260922120000_add_customer_segments_tags`. Chưa chạy migration trên database triển khai trong lượt thực hiện này.

## Giới hạn/việc nên làm tiếp

- Thêm `/performance` làm dashboard năng suất Lead độc lập. Nhân viên xem cá nhân; membership `MANAGER` xem mọi user hoạt động trong phòng ban mình quản lý và các phòng ban con; Admin xem toàn bộ. Bộ lọc tuần này/tuần trước, tháng này/tháng trước và quý này/quý trước dùng `Date Received`; chỉ số gồm Lead được assign, Lead đã tạo theo `createdById`, assigned đã có `Date Confirmation`, tổng `Quotation Value (USD)` của Lead assigned và Lead chưa confirmed đã quá `Travel Date`. Các cột nhạy cảm tiếp tục tuân theo quyền đọc cột Lead.
- Dòng năng suất `Root Administrator` chỉ được tạo khi chính tài khoản Root từ environment đang đăng nhập; Admin lưu trong database không được xem dòng báo cáo của Root. Lead do Root tạo nhưng đã assign cho nhân viên vẫn được tính vào chỉ số assigned của nhân viên đó.

- Thêm module thử nghiệm độc lập `/admin/template-builder` để quản lý nhiều template theo phiên bản nháp/phát hành, thiết kế trực quan bằng các block tiêu đề, văn bản, trường dữ liệu, đường phân cách, khoảng trắng và bảng lặp. Module dùng hai bảng `TemplateBuilderDocument`/`TemplateBuilderVersion`, chưa nối vào hoặc thay đổi các template, itinerary, Invoice và dự toán hiện tại.
- Cấu trúc block được lưu JSONB nội bộ nhưng giao diện không cho nhập JSON: biến và nguồn dữ liệu dùng danh sách chọn, thuộc tính dùng input/checkbox, metadata dùng các dòng key–value kiểu văn bản/số/đúng-sai. Server kiểm tra lại toàn bộ allowlist và giới hạn dữ liệu. Migration: `20260930120000_add_template_builder`.
- Seed ba bản sao cấu trúc hardcode hiện tại vào Template Builder gồm `CURRENT_ITINERARY`, `CURRENT_INVOICE` và `CURRENT_ESTIMATE`. Mỗi mẫu được tạo ở trạng thái `PUBLISHED v1`, có metadata nhận diện nguồn và vẫn hoàn toàn độc lập với luồng sinh tài liệu hiện tại. Migration idempotent: `20260930130000_seed_template_builder_defaults`.
- Template Builder v2 bổ sung thiết lập trang A4 dọc/ngang, lề, font và cỡ chữ; thuộc tính khoảng cách, khoảng đệm, màu nền, in đậm/nghiêng; cùng các block nghiệp vụ mô phỏng đúng bố cục Itinerary, Invoice và Dự toán hiện tại. Preview dùng dữ liệu mẫu nhiều dòng thay cho placeholder chung. Ba mẫu seed có thêm `DRAFT v2` để kiểm tra trước khi phát hành, không thay đổi `PUBLISHED v1` và không nối vào tài liệu thật. Migration: `20260930140000_seed_template_builder_visual_v2`.
- Thêm Document Data Model trung gian và registry cho Template Builder. Adapter server riêng cho Itinerary, Invoice và Dự toán truy vấn Prisma, chuẩn hóa ngày/tiền/bữa ăn/Overnight/dòng dữ liệu trước khi truyền vào renderer; renderer không truy vấn database và không tính nghiệp vụ. Preview cũng dùng đúng data contract này với sample data. Đây là nền tảng tích hợp về sau, chưa thay thế renderer hardcode hiện hành.
- Thêm Data Contracts động tại `/admin/template-builder/data-contracts`. Admin quản lý trường đầu ra, source path, kiểu dữ liệu, phép lấy trực tiếp/giá trị cố định/ghép/cộng/trừ/nhân/chia/phần trăm/giá trị đầu tiên có dữ liệu, format và giá trị mặc định; đồng thời quản lý dataset và từng cột bằng form, không nhập code hoặc JSON. Engine `buildConfiguredTemplateDocumentData` thực thi cấu hình trên kết quả Source Adapter an toàn. Dropdown biến/dataset và kiểm tra server của Template Builder đọc cấu hình đang active từ database. Migration: `20260930150000_add_document_data_contracts`.
- Generation Contract bổ sung namespace `root.*`/`row.*`, phép `EXTRACT_DURATION_DAYS`, `ADD_DAYS` và dataset `GENERATE_DURATION_RANGE`. Duration lấy nhóm chữ số đầu tiên theo quy ước số ngày đứng trước, ví dụ `8D7N → 8`, `6 Days → 6`; dạng đảo như `7N8D` được coi là dữ liệu không hợp lệ. Dataset `itinerary.generatedDays` sinh tối đa 365 dòng và tính `date = root.lead.travelDate + row.value - 1`; dataset `itinerary.days` vẫn đọc ngày snapshot đã lưu để việc render không ghi đè chỉnh sửa tay. Migration: `20260930160000_add_document_generation_contracts`.
- Hoàn thiện Data Contract seed để tương thích toàn bộ biến/cột mà ba template hardcode đã dùng, gồm Flight, lưu trú, Overnight, ghi chú, số thứ tự Invoice Item, ghi chú chi phí và các trường thông tin Invoice. Thông báo kiểm tra repeater chỉ rõ dataset hoặc từng cột thiếu. Migration: `20260930170000_complete_document_data_contracts`.

- Chưa preview nội dung Excel và PowerPoint.
- DOC cũ có thể không đọc được; DOCX dùng Mammoth.
- HTML sinh từ DOCX chưa qua sanitizer.
- Chưa có rename/move/copy file hoặc folder ở API hiện hành.
- Chưa có phân trang và tìm kiếm server-side; tìm kiếm hiện tại áp dụng trên dữ liệu của folder đang tải.
- Upload nhiều file chạy tuần tự, chưa có progress riêng cho từng file.
- Cần đồng bộ Dockerfile từ npm sang pnpm.
- `components/files/files-manager.tsx` là implementation tổng quát chưa được route `/files` sử dụng; component đang chạy là `components/files-manager.tsx`.
- Chưa có editor chuyên dụng cho Office/PDF/media và chưa có workflow phê duyệt nội dung.
