# API nội bộ LP Travel

Các API dưới đây dành cho frontend LP Travel. Client không gọi uploader trực tiếp.

## Authentication

Authentication sử dụng Server Actions trong `app/actions/auth.ts`, không có endpoint login công khai riêng.

| Action | Chức năng |
| --- | --- |
| `login` | Kiểm tra Root Admin hoặc user database, sau đó tạo session cookie. |
| `logout` | Xóa session cookie và chuyển về `/login`. |
| `changePassword` | Xác minh mật khẩu hiện tại và cập nhật bcrypt hash. |

## Folder của user

### `GET /api/me/folders`

Trả các folder user có ít nhất một quyền, kèm năm cờ quyền đã tính cả kế thừa từ folder cha.

## File

### `GET /api/files?folderId=<id>`

- Yêu cầu `canList`.
- Proxy tới `GET /api/uploads` của uploader.
- Trả file trực tiếp trong folder và dữ liệu folder con từ uploader.

### `POST /api/files`

- Body `multipart/form-data`: `file`, `folderId`.
- Yêu cầu `canUpload`.
- Proxy tới `POST /api/upload`.

### `GET /api/files/<storedName>?folderId=<id>`

- Yêu cầu `canRead`.
- Xác minh file thuộc đúng folder.
- Stream nội dung và các header `Content-Type`, `Content-Disposition` từ uploader.

### `DELETE /api/files/<storedName>?folderId=<id>`

- Yêu cầu `canDelete`.
- Xác minh file thuộc đúng folder.
- Proxy thao tác xóa sang uploader.

## File nghiệp vụ trong `Travel/{thu_muc}`

Các endpoint này nhận tên thư mục thay vì `folderId`, chỉ cho phép một cấp con trực tiếp của `Travel` và luôn yêu cầu session LP Travel. URL xem/tải trả về từ API cũng đi qua LP Travel để quyền được kiểm tra lại ở mỗi lần truy cập.

### `GET /api/travel-files?folder=<thu_muc>`

- Yêu cầu `canList` trên `Travel/<thu_muc>`.
- Trả danh sách file cùng `url`, `viewUrl` và `downloadUrl` cho từng file.

### `POST /api/travel-files?folder=<thu_muc>`

- Body `multipart/form-data`: `file`; có thể gửi `folder` trong body thay cho query.
- Yêu cầu `canUpload` trên thư mục đích.
- Nếu thư mục con chưa có, API chỉ tạo khi user có cả `canCreateFolder` và `canUpload` trên `Travel`.
- Trả thông tin file cùng `url`, `viewUrl` và `downloadUrl`.

### `GET /api/travel-files/<storedName>?folder=<thu_muc>`

- Yêu cầu `canRead` và xác minh file thuộc đúng thư mục.
- Mặc định stream file với `Content-Disposition: inline` để xem trực tiếp.
- Thêm `download=1` để tải file bằng `Content-Disposition: attachment`.

### `PUT /api/travel-files/<storedName>?folder=<thu_muc>`

- Body `multipart/form-data`: `file`.
- Yêu cầu `canUpload` và tạo version mới cho file hiện tại.
- API tự lấy current version ID và dùng `If-Match`; trả `409` nếu phát sinh xung đột phiên bản.
- Trả lại URL xem và tải của file.

### `DELETE /api/travel-files/<storedName>?folder=<thu_muc>`

- Yêu cầu `canDelete` và xác minh file thuộc đúng thư mục trước khi xóa mềm.

Tên `{thu_muc}` không được rỗng, không nhận đường dẫn nhiều cấp và không chứa ký tự không an toàn. Lỗi `401`, `403`, `404` và lỗi validation được trả dưới dạng `{ ok: false, message }` với nội dung tương ứng.

### Component dùng lại

`TravelFileUpload` nhận `folder` và trả toàn bộ metadata file, bao gồm ba URL, qua `onUploaded`:

```tsx
<TravelFileUpload
  folder="Invoices"
  accept="application/pdf,image/*"
  onUploaded={(file) => setUploadedFile(file)}
/>
```

`TravelFileViewer` nhận URL xem và URL tải để hiển thị các nút Preview, mở tab mới và download:

```tsx
<TravelFileViewer
  url={uploadedFile.viewUrl}
  downloadUrl={uploadedFile.downloadUrl}
  name={uploadedFile.originalName}
  mimeType={uploadedFile.mimeType}
  size={uploadedFile.size}
/>
```

Preview dùng lại renderer File Manager hiện hành: ảnh, PDF, DOCX, video, audio, text và code được xem tại chỗ; định dạng chưa hỗ trợ vẫn có nút mở hoặc tải xuống. Các URL tiếp tục yêu cầu session và quyền thư mục tương ứng.

### `GET /api/files/<storedName>/versions?folderId=<id>`

- Yêu cầu `canRead`.
- Trả lịch sử version và version hiện hành.

### `POST /api/files/<storedName>/versions`

- Body `multipart/form-data`: `file`, `folderId`.
- Yêu cầu `canUpload` và header `If-Match` chứa current version ID.
- Trả `409` nếu file đã có version mới hơn.

### `GET /api/files/<storedName>/versions/<versionId>?folderId=<id>`

- Yêu cầu `canRead`.
- Tải nội dung của một version cụ thể.

### `POST /api/files/<storedName>/versions/<versionId>/restore`

- Yêu cầu `canRead`, `canUpload` và header `If-Match`.
- Tạo version mới từ nội dung version được chọn; không thay đổi hoặc xóa version cũ.

## Chỉnh sửa text/code

### `/api/files/<storedName>/edit-lock?folderId=<id>`

- `POST`: lấy edit lock.
- `PATCH`: gia hạn lock bằng header `X-Edit-Lock`.
- `DELETE`: giải phóng lock.
- Yêu cầu `canRead` và `canUpload`.

### `GET /api/files/<storedName>/edit?folderId=<id>`

- Trả nội dung hiện tại và draft của user nếu có.
- Yêu cầu `canRead`.

### `PUT /api/files/<storedName>/edit`

- Autosave draft bằng `X-Edit-Lock`, `baseVersionId` và nội dung text.
- Yêu cầu `canRead` và `canUpload`.

### `POST /api/files/<storedName>/edit/save`

- Tạo version mới từ nội dung editor.
- Yêu cầu `X-Edit-Lock`, `If-Match`, `canRead` và `canUpload`.

### `GET /api/files/<storedName>/versions/compare`

- Query gồm `folderId`, `left`, `right`.
- Trả nội dung hai version text/code để so sánh song song.

## Folder

### `POST /api/folders`

Body JSON:

```json
{
  "name": "documents",
  "parentId": "folder-id"
}
```

Yêu cầu `canCreateFolder` trên folder cha.

## Mã trạng thái

- `401`: chưa đăng nhập hoặc session không hợp lệ.
- `403`: user không có quyền trên folder.
- `404`: file không thuộc folder hoặc không tồn tại.
- Các lỗi validation/storage khác được giữ theo phản hồi của uploader.

## Lịch sử dành cho Admin

### `GET /api/admin/activity`

- Chỉ role `ADMIN` hoặc Root Admin.
- Proxy tới `GET /api/audit/users` bằng actor đã ký.
- Uploader giới hạn kết quả theo `apiTokenId` và phạm vi folder của token.
- LP Travel ghép `actorId` với bảng `User` để trả FullName, UserName và trạng thái hiện tại.
- Hỗ trợ `page`, `pageSize`, `action`, `actor`, `file`, `folderId`, `from`, `to`.
