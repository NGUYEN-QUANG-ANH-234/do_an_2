# 🛠️ MINA RUBBER - HỆ THỐNG QUẢN TRỊ TÀI CHÍNH & VẬN HÀNH DOANH NGHIỆP

## 📝 Thông tin chung

- **Sinh viên thực hiện**: [Điền tên của bạn]
- **Môn học**: [Tên môn học]
- **Giảng viên hướng dẫn**: [Tên giảng viên]
- **Mục tiêu dự án**: Tối ưu hóa dòng tiền (BSC 5.1) và thiết lập ma trận bảo mật vận hành (BSC 5.4).

---

## 📂 Giải thích chi tiết cấu trúc thư mục và Tệp tin

Hệ thống được tổ chức theo kiến trúc phân lớp nhằm tối ưu hóa việc kiểm soát quyền truy cập (Route Guard) và quản lý linh kiện giao diện.

### 1. 📁 `frontend/assets/`

Chứa các tài nguyên tĩnh phục vụ giao diện:

- **`fonts/`**: Lưu trữ các font chữ hệ thống (Inter, Black Italic...) giúp đồng nhất hiển thị chuyên nghiệp.
- **`icons/`**: Các bộ biểu tượng tùy chỉnh cho doanh nghiệp.
- **`img/`**: Hình ảnh minh họa, logo Mina Rubber và tệp `123.ico` (Favicon hệ thống).

### 2. 📁 `frontend/components/`

Chứa các linh kiện HTML được nạp động (Dynamic Loading) giúp tái sử dụng mã nguồn:

- **`sidebar.html`**: Thanh điều hướng bên trái, tự động lọc menu dựa trên thuộc tính `data-role` của người dùng.
- **`header_user.html`**: Khu vực hiển thị tên, chức vụ và Avatar người dùng nạp từ phiên làm việc (Session).
- **`navbar.html`**: Thanh công cụ hỗ trợ tìm kiếm và thông báo hệ thống.

### 3. 📁 `frontend/js/` (Lõi xử lý - Logic Core)

Nơi điều khiển toàn bộ hành vi và bảo mật dữ liệu của ứng dụng:

- **`main.js`**: Tệp tin quan trọng nhất, thực hiện:
  - **Route Guard**: Chặn đường dẫn trái phép dựa trên vai trò.
  - **Gate Matrix**: Định nghĩa vùng truy cập folder cho từng chức danh (Admin, Accountant, Warehouse, Shipping, Agency).
  - **MinaGateway**: Hàm bảo mật lọc dữ liệu theo quyền sở hữu (Data Ownership).
- **`api.js`**: Cổng kết nối dữ liệu và giả lập API.
- **📁 `modules/`**: Chia nhỏ logic xử lý theo từng phòng ban nghiệp vụ:
  - **`admin/`**: Chứa `admin_permission_management.js` để quản lý 6 nhóm KPI nhân sự và cập nhật đặc quyền.
  - **`auth/`**: Chứa `auth_login.js` (Xác thực tài khoản) và `auth_change_pw.js` (Đổi mật khẩu bảo mật).
  - **`payment/`**: Xử lý Ví trả trước, Công nợ và Sổ cái Ledger (BSC 5.1).
  - **`transport/`, `warehouse/`, `accounting/`...**: Các tệp xử lý logic chuyên biệt cho từng phòng ban.

### 4. 📁 `frontend/pages/` (Hệ thống giao diện)

Cấu trúc thư mục được bảo vệ bởi Ma trận truy cập (Access Matrix):

- **`admin/`**: Thư mục bảo mật dành cho Quản trị viên (Dashboard, Quản lý phân quyền, Tạo đại lý).
- **`auth/`**: Trang đăng nhập (`auth_login.html`) và đổi mật khẩu (`auth_change_pw.html`).
- **`payment/`**: Phân hệ tài chính gồm Cổng thanh toán, Quản lý nợ quá hạn và Lịch sử giao dịch.
- **`agency/`**: Portal nghiệp vụ dành riêng cho Đối tác Đại lý.
- **`transport/`**: Phân hệ Logistics dành cho nhân sự Vận chuyển (SHIPPING).
- **`warehouse/`, `order/`, `product/`, `invoice/`**: Các thư mục chứa trang nghiệp vụ chi tiết cho từng bộ phận.

---

## 🚀 Tính năng nổi bật & Nghiệp vụ cốt lõi

### 💰 1. Quản trị Tài chính thông minh (BSC 5.1 & 5.3)

Tập trung vào tối ưu hóa dòng tiền thông qua các kịch bản Scenarios:

- **Ví trả trước (Prepayment Pool)**: Đại lý nạp tiền và thanh toán đơn hàng tức thì, tự động cấn trừ số dư ví.
- **Tất toán nợ trực tiếp**: Đại lý tự tất toán các vận đơn nợ quá hạn bằng số dư ví ngay trên giao diện công nợ.
- **Đối soát Ledger**: Nhật ký giao dịch hợp nhất biến động từ Ví và Sổ cái nợ, đảm bảo minh bạch tài chính.
- **Cảnh báo Scenario 5.3**: Tự động nhận diện nợ xấu bằng hiệu ứng thị giác (Pulse Red) và lọc vận đơn ưu tiên xử lý tiền.

### 🔐 2. Hệ thống Phân quyền Matrix Access (BSC 5.4)

Kiểm soát bảo mật tầng sâu dựa trên vai trò (Role-based Access Control):

- **Ma trận Gate Matrix**: Chặn truy cập từ cấp độ thư mục. Mỗi vai trò chỉ được phép thao tác trong vùng folder định sẵn (Ví dụ: SHIPPING chỉ vào được `/transport/`).
- **Route Guard Protection**: Tự động kiểm tra quyền hạn mỗi khi tải trang, ngăn chặn việc thay đổi URL trái phép.
- **Hợp nhất tài khoản**: Quản lý song song tài khoản STAFF cố định (được bảo vệ bởi cơ chế Lock) và tài khoản AGENCY linh hoạt.
- **Data Ownership**: Hàm `MinaGateway` đảm bảo các Đại lý không thể xem chéo dữ liệu của nhau.

---

## 🛠️ Công nghệ triển khai

- **Frontend**: HTML5, Tailwind CSS, FontAwesome 6.
- **Logic**: Vanilla JavaScript (ES6+) hướng Module.
- **Cài đặt**: Yêu cầu chạy trên **Web Server** (Live Server trên VS Code) để các tính năng `fetch` linh kiện hoạt động chính xác.

---

_Dự án Mina Rubber - Giải pháp quản trị số hiện đại._
