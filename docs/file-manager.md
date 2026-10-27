# Quản lý và xem trước file

## Entry point đang sử dụng

Route `/files` import component tại:

```text
components/files-manager.tsx
```

Các component hỗ trợ nằm trong `components/files/`. File `components/files/files-manager.tsx` là một implementation tổng quát khác nhưng hiện không được `/files` import.

## Nguồn dữ liệu

- `useFilesApi()` gọi `/api/me/folders` để lấy toàn bộ folder user có ít nhất một quyền.
- Khi chọn folder có `canList`, hook gọi `/api/files?folderId=...` để lấy file trực tiếp trong folder.
- Folder con được dựng từ danh sách folder bằng `folderPath`; file và folder con được ghép thành `FileItem` để render chung.
- URL đọc/download file chỉ được tạo khi folder có `canRead`.

## Kiểu hiển thị

- **Grid**: card file/folder, thumbnail cho ảnh, double-click để mở.
- **List**: bảng có tên, loại, dung lượng, ngày tạo và thao tác.
- **Gallery**: tập trung vào ảnh và folder.
- Lựa chọn view được lưu trong `localStorage` với key `files-manager:view`.
- Có cây thư mục bên trái, breadcrumb, panel chi tiết bên phải, tìm kiếm trong folder và sắp xếp.
- `Ctrl/Cmd + K` đưa focus vào ô tìm kiếm.

## Tác vụ

- Upload một hoặc nhiều file; nhiều file được gửi tuần tự vì API nhận một file mỗi request.
- Kéo-thả file vào vùng nội dung để upload.
- Tạo folder con khi có `canCreateFolder`.
- Xóa file khi có `canDelete`.
- Tải hoặc preview file khi có `canRead`.
- Nút thao tác không được render nếu user thiếu quyền tương ứng.
- Panel chi tiết hiển thị lịch sử version; có thể tải version cũ, upload bản mới hoặc khôi phục version cũ thành một version mới theo quyền.
- File text/code có thể mở editor trực tuyến khi có cả `canRead` và `canUpload`; editor dùng edit lock, autosave draft và so sánh hai version.

## Preview theo định dạng

| Loại | Cách preview |
| --- | --- |
| Ảnh | Hiển thị trong modal; hỗ trợ zoom, reset và xoay 90 độ. |
| PDF | Dùng `<object type="application/pdf">`. |
| DOCX | Fetch file rồi chuyển sang HTML trong browser bằng `mammoth`. |
| DOC cũ | Không đảm bảo; hiển thị hướng dẫn tải về nếu Mammoth không đọc được. |
| Video | Dùng `<video controls>`. |
| Audio | Dùng `<audio controls>`. |
| Text/code | Fetch dạng text, giới hạn render 500.000 ký tự. |
| Excel/PowerPoint | Hiện thông báo và nút tải về; chưa render nội dung tại chỗ. |
| Archive/khác | Không preview, cho phép tải về. |

Modal hỗ trợ `Escape`, mũi tên trái/phải để chuyển file preview và khóa scroll của trang khi đang mở.

## Nhận diện loại file

`lib/file-utils.ts` ưu tiên extension, sau đó fallback theo MIME. Các nhóm hiện có: folder, image, PDF, Word, Excel, PowerPoint, video, audio, archive, code, text và other.

## Lưu ý bảo mật preview

DOCX được Mammoth chuyển thành HTML rồi render bằng `dangerouslySetInnerHTML`. Code hiện tại chưa lọc HTML qua sanitizer. Nếu hệ thống nhận DOCX từ nguồn không hoàn toàn tin cậy, cần bổ sung DOMPurify hoặc sanitizer tương đương trước khi render.

Preview dùng cùng endpoint đọc file nên vẫn yêu cầu session hợp lệ, `folderId` hợp lệ và quyền `canRead`.
