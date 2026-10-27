# Kế hoạch mở rộng LP Travel thành ứng dụng nội bộ

Các tài liệu trong thư mục này là **kế hoạch, chưa phải chức năng đã triển khai**. Dùng chúng làm đầu vào khi bắt đầu từng giai đoạn; cập nhật quyết định và kết quả thực tế sau mỗi giai đoạn, không sửa phần mô tả hiện trạng thành mô tả đã hoàn thành khi chưa code.

| Tài liệu | Phạm vi |
| --- | --- |
| [Lộ trình và nguyên tắc chung](./roadmap.md) | Phụ thuộc, phân quyền, migration, bảo mật, triển khai và tiêu chí hoàn thành. |
| [Phòng ban](./departments.md) | Cơ cấu phòng ban, thành viên, quản lý, chuyển dữ liệu cũ. |
| [Nghiệp vụ du lịch và dữ liệu nền](./travel-domain.md) | Khách hàng, nhà cung cấp, tour/dịch vụ, hồ sơ yêu cầu và quan hệ giữa chúng. |
| [CRM khách hàng](./crm.md) | Hồ sơ khách hàng, lịch sử chăm sóc, tour/dịch vụ, booking, nhân viên phụ trách và timeline. |
| [Công việc và giao việc](./tasks.md) | Bảng công việc, giao việc, trạng thái, bình luận, lịch sử. |
| [Bảng tin](./news-feed.md) | Tin nội bộ, phạm vi nhận tin, bình luận, đính kèm. |
| [Chat nội bộ](./chat.md) | Kế hoạch đã hoãn; hội thoại, thành viên, tin nhắn, realtime và lưu giữ. |
| [AI Copilot và AI Agent](./ai-agent.md) | Trợ lý Lead, itinerary, báo cáo, tìm kiếm tự nhiên, kiến trúc tool an toàn và lộ trình triển khai theo giai đoạn. |

## Cách sử dụng khi bắt đầu triển khai

1. Chốt các mục **Cần xác nhận** trong [lộ trình](./roadmap.md) và tài liệu của giai đoạn tương ứng.
2. Tạo migration, API và UI theo đúng thứ tự phụ thuộc; dùng chính các mục **Tiêu chí hoàn thành** để kiểm thử.
3. Ghi lại quyết định khác với mặc định đề xuất, migration đã chạy và giới hạn còn lại ở tài liệu giai đoạn và [nhật ký triển khai](../implementation-log.md).
4. Cập nhật [tổng quan hệ thống](../system-overview.md) khi chức năng thực sự hoạt động.
