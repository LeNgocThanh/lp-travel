# Hướng dẫn Template Builder và Data Contracts

## 1. Phạm vi hiện tại

Template Builder là module thử nghiệm độc lập để thiết kế bố cục tài liệu. Module chưa thay thế các mẫu Itinerary, Invoice và Dự toán đang chạy.

- `/admin/template-builder`: quản lý template và phiên bản.
- `/admin/template-builder/[id]`: thiết kế và xem trước template.
- `/admin/template-builder/data-contracts`: danh sách nguồn dữ liệu tài liệu.
- `/admin/template-builder/data-contracts/[id]`: cấu hình trường, công thức, dataset và cột.

Không nhập JavaScript, SQL hoặc JSON trong giao diện. Truy vấn Prisma và kiểm tra quyền vẫn nằm trong Source Adapter phía server.

## 2. Luồng dữ liệu

```text
PostgreSQL / Prisma
        ↓
Source Adapter an toàn
        ↓
Data Contract và Generation Contract
        ↓
Document Data Model
        ↓
Template đã phát hành
        ↓
Preview / HTML / PDF / DOCX trong giai đoạn tích hợp sau
```

Template chỉ quyết định cách trình bày. Source Adapter chịu trách nhiệm truy vấn dữ liệu được phép. Data Contract đặt tên, biến đổi và định dạng dữ liệu trước khi đưa vào template.

## 3. Quản lý template

### Tạo template

1. Mở `/admin/template-builder`.
2. Chọn **Tạo template**.
3. Nhập mã, tên, loại tài liệu và mô tả.
4. Hệ thống tạo `DRAFT v1`.
5. Chọn **Mở trình thiết kế**.

### Thiết kế

Thiết lập trang gồm khổ A4, hướng giấy, lề, font và cỡ chữ. Có thể thêm các block cơ bản như tiêu đề, văn bản, trường dữ liệu, đường phân cách, khoảng trắng và bảng lặp. Các loại Itinerary, Invoice và Dự toán có thêm block nghiệp vụ chuyên biệt.

Trong canvas:

- Chọn block để sửa thuộc tính.
- Dùng nút lên/xuống để đổi thứ tự.
- Dùng nút nhân bản hoặc xóa.
- Chọn biến và dataset từ Data Contract đang hoạt động.
- Nhập metadata theo từng cặp key–value; không nhập JSON.

### Nháp và phát hành

- Chỉ phiên bản `DRAFT` được chỉnh sửa.
- `PUBLISHED` là bất biến.
- **Phát hành** chuyển bản nháp thành phiên bản được công bố trong module thử nghiệm.
- **Tạo bản nháp mới** sao chép phiên bản gần nhất sang số phiên bản tiếp theo.
- Việc phát hành tại đây chưa làm thay đổi tài liệu thật đang sử dụng renderer hardcode.

## 4. Data Contract

Mở `/admin/template-builder/data-contracts`, chọn nguồn Itinerary, Invoice hoặc Dự toán rồi chọn **Cấu hình**.

### Trường dữ liệu

Mỗi trường đầu ra gồm:

| Thuộc tính | Ý nghĩa |
| --- | --- |
| Key đầu ra | Đường dẫn template sử dụng, ví dụ `invoice.balanceAmountUsd`. |
| Tên hiển thị | Tên xuất hiện trong dropdown Template Builder. |
| Kiểu dữ liệu | Văn bản, số, đúng/sai hoặc ngày. |
| Phép xử lý | Cách tạo giá trị đầu ra. |
| Đường dẫn nguồn | Giá trị thứ nhất từ Source Adapter. |
| Nguồn thứ hai | Giá trị thứ hai cho phép toán hai toán hạng. |
| Giá trị cố định / ký tự nối | Hằng số, chuỗi nối hoặc offset của phép cộng ngày. |
| Định dạng | Giữ nguyên, USD, VNĐ, ngày, chữ hoa hoặc chữ thường. |
| Giá trị mặc định | Dùng khi kết quả rỗng. |
| Thứ tự | Vị trí trong danh sách chọn. |

### Phép xử lý

| Phép | Cách dùng |
| --- | --- |
| `DIRECT` | Lấy trực tiếp từ đường dẫn nguồn. |
| `LITERAL` | Dùng giá trị cố định. |
| `CONCAT` | Ghép nguồn thứ nhất, ký tự nối và nguồn thứ hai. |
| `ADD`, `SUBTRACT`, `MULTIPLY`, `DIVIDE` | Phép tính số học. Chia cho 0 trả về 0. |
| `PERCENTAGE` | Nguồn thứ nhất × nguồn thứ hai ÷ 100. |
| `FIRST_NON_EMPTY` | Lấy giá trị đầu tiên không rỗng. |
| `EXTRACT_DURATION_DAYS` | Tách số ngày từ chuỗi Duration. |
| `ADD_DAYS` | Cộng số ngày vào một ngày gốc. |

### Namespace trong dataset

- `root.*`: dữ liệu cấp tài liệu, ví dụ `root.lead.travelDate`.
- `row.*`: dữ liệu của dòng hiện tại, ví dụ `row.value` hoặc `row.quantity`.
- Đường dẫn không có tiền tố trong cột dataset được hiểu là dữ liệu của dòng hiện tại.

Không dùng `root.` hoặc `row.` cho key đầu ra. Hai tiền tố này chỉ dùng ở đường dẫn nguồn.

## 5. Dataset

Dataset là danh sách nhiều dòng dùng cho bảng lặp hoặc block nghiệp vụ.

### Dùng danh sách đã lưu

Chọn `DIRECT_LIST` khi dữ liệu đã tồn tại trong database, ví dụ:

```text
Key: itinerary.days
Nguồn: itinerary.days
Cách tạo: DIRECT_LIST
```

Mỗi cột thường dùng `DIRECT` với nguồn của dòng như `date`, `title`, `transport`, `meals`.

### Sinh danh sách từ Duration

Chọn `GENERATE_DURATION_RANGE` khi cần tạo dãy ngày ban đầu từ Duration:

```text
Key: itinerary.generatedDays
Nguồn: lead.duration
Cách tạo: GENERATE_DURATION_RANGE
Bắt đầu từ: 1
Số dòng tối đa: 365
```

Mỗi dòng sinh ra có:

```text
row.value = 1, 2, 3, ...
row.index = 0, 1, 2, ...
```

## 6. Ví dụ Travel Date và Duration

### Quy tắc Duration

`EXTRACT_DURATION_DAYS` lấy nhóm chữ số đầu tiên trong chuỗi. Quy ước dữ liệu Travel yêu cầu số ngày đứng trước, ví dụ `8D7N`; dạng `7N8D` không hợp lệ và không được hỗ trợ.

| Duration | Số ngày |
| --- | ---: |
| `8D7N` | 8 |
| `6 Days` | 6 |
| `10 ngày 9 đêm` | 10 |
| `Tour 12D11N` | 12 |
| `abc` | 0, không sinh dòng |

Nếu nhập sai quy ước như `7N8D`, hệ thống sẽ lấy số đầu tiên là 7. Dữ liệu này cần được sửa về `8D7N` trước khi tạo lịch trình.

Giới hạn dataset tối đa 365 dòng để tránh dữ liệu sai sinh danh sách quá lớn.

### Tính ngày cho từng dòng

Cột `dayNumber`:

```text
Operation: DIRECT
Nguồn: row.value
Format: NONE
```

Cột `date`:

```text
Operation: ADD_DAYS
Ngày bắt đầu: root.lead.travelDate
Số ngày cộng: row.value
Điều chỉnh: -1
Format: DATE
```

Công thức tương ứng:

```text
date = Travel Date + dayNumber - 1
```

Với Travel Date `21/06/2026` và Duration `8D7N`, hệ thống sinh Day 1 từ `21/06/2026` đến Day 8 là `28/06/2026`.

### Generation và Render là hai việc khác nhau

- `itinerary.generatedDays` dùng để khởi tạo các ngày từ Lead.
- `itinerary.days` dùng để render các ngày đã lưu.
- Sau khi người dùng sửa ngày bằng tay, renderer phải dùng snapshot đã lưu và không tự tính lại từ Lead.
- Chỉ thao tác “gen lại ngày” trong tương lai mới chạy lại Generation Contract.

## 7. Ví dụ công thức tài chính

Balance có thể cấu hình:

```text
Key đầu ra: invoice.calculatedBalance
Operation: SUBTRACT
Đường dẫn nguồn: invoice.totalAmountUsd
Nguồn thứ hai: invoice.depositAmountUsd
Format: USD
```

Deposit theo phần trăm:

```text
Key đầu ra: invoice.calculatedDeposit
Operation: PERCENTAGE
Đường dẫn nguồn: invoice.totalAmountUsd
Nguồn thứ hai: invoice.depositPercent
Format: USD
```

Chỉ dùng công thức động khi Source Adapter cung cấp đủ dữ liệu nguồn. Các phép tính tài chính quan trọng vẫn cần được kiểm tra với dữ liệu thật trước khi áp vào tài liệu phát hành.

## 8. Khi nào vẫn cần sửa code?

Cần lập trình viên bổ sung Source Adapter khi:

- Thêm bảng hoặc quan hệ Prisma mới.
- Cần truy cập nguồn dữ liệu chưa được cấp.
- Thay đổi kiểm tra quyền hoặc transaction.
- Cần phép toán mới chưa có trong danh sách an toàn.
- Cần gọi API hoặc hệ thống bên ngoài.

Không cần sửa adapter khi chỉ đổi nhãn, source path đã được cấp, format, giá trị mặc định, phép tính có sẵn, dataset hoặc thứ tự cột.

## 9. Khuyến nghị vận hành

1. Tạo hoặc sửa Data Contract.
2. Kiểm tra preview bằng dữ liệu mẫu.
3. Tạo bản nháp template mới.
4. Chọn các biến/dataset vừa cấu hình.
5. Kiểm tra bố cục trước khi phát hành.
6. Không tắt trường/dataset đang được template nháp sử dụng; server sẽ từ chối lưu template nếu tham chiếu không còn hợp lệ.
7. Chỉ tích hợp template mới vào tài liệu thật sau khi renderer mới được so sánh với renderer hardcode.

## 10. Giới hạn hiện tại

- Template Builder chưa thay thế renderer hardcode.
- Chưa có nút chạy Generation Contract để ghi ngày trực tiếp vào lịch trình thật.
- Chưa có preview Data Contract bằng một Lead/Invoice cụ thể trên trang quản trị.
- Chưa lưu snapshot Template Builder vào Invoice/Itinerary thật.
- Chưa xuất PDF/DOCX trực tiếp từ renderer mới.
- Source Adapter không được tạo hoặc sửa bằng giao diện vì liên quan đến truy vấn và phân quyền.
