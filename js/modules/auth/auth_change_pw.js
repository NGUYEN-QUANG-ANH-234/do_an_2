/**
 * auth_change_pw.js - Nâng cấp hệ thống đổi mật khẩu Mina Rubber
 * Đồng bộ hóa dữ liệu STAFF và AGENCY
 */

document
  .getElementById("changePasswordForm")
  ?.addEventListener("submit", function (e) {
    e.preventDefault();

    // 1. Lấy thông tin từ giao diện
    const oldPass = document.getElementById("oldPassword").value.trim();
    const newPass = document.getElementById("newPassword").value.trim();
    const confirmPass = document.getElementById("confirmPassword").value.trim();

    // 2. Kiểm tra phiên làm việc hiện tại
    const currentUser = JSON.parse(localStorage.getItem("mina_user"));
    if (!currentUser) {
      alert("Phiên làm việc hết hạn, vui lòng đăng nhập lại!");
      window.location.href = "auth_login.html";
      return;
    }

    // 3. Kiểm tra logic mật khẩu mới (Luồng L1)
    if (newPass !== confirmPass) {
      alert("Lỗi: Mật khẩu mới và xác nhận không khớp!");
      return;
    }

    if (newPass.length < 3) {
      alert("Lỗi: Mật khẩu mới quá ngắn (tối thiểu 3 ký tự)!");
      return;
    }

    if (newPass === oldPass) {
      alert("Lỗi: Mật khẩu mới không được trùng mật khẩu cũ!");
      return;
    }

    // 4. XỬ LÝ THEO LOẠI TÀI KHOẢN (Đồng bộ với auth_login.js)
    const isAgency = !currentUser.id.startsWith("STAFF-");
    let success = false;

    if (isAgency) {
      // TRƯỜNG HỢP: ĐẠI LÝ (Dữ liệu trong mina_agencies)
      let agencies = JSON.parse(localStorage.getItem("mina_agencies")) || [];
      const index = agencies.findIndex(
        (a) => String(a.agency_id) === String(currentUser.id)
      );

      if (index !== -1) {
        const currentStoredPass = agencies[index].password || "123";
        if (oldPass !== currentStoredPass) {
          alert("Lỗi: Mật khẩu hiện tại không chính xác!");
          return;
        }
        // Cập nhật vào CSDL LocalStorage
        agencies[index].password = newPass;
        localStorage.setItem("mina_agencies", JSON.stringify(agencies));
        success = true;
      }
    } else {
      // TRƯỜNG HỢP: NHÂN VIÊN HỆ THỐNG (STAFF)
      // Lưu ý: STAFF_ACCOUNTS thường cố định trong code,
      // ta có thể lưu mật khẩu thay đổi vào một key riêng 'mina_staff_passwords'
      let staffPassOverrides =
        JSON.parse(localStorage.getItem("mina_staff_passwords")) || {};

      // Mật khẩu mặc định là 123 nếu chưa có trong overrides
      const currentStoredPass =
        staffPassOverrides[currentUser.username] || "123";

      if (oldPass !== currentStoredPass) {
        alert("Lỗi: Mật khẩu hiện tại không chính xác!");
        return;
      }

      staffPassOverrides[currentUser.username] = newPass;
      localStorage.setItem(
        "mina_staff_passwords",
        JSON.stringify(staffPassOverrides)
      );
      success = true;
    }

    // 5. HOÀN TẤT & YÊU CẦU ĐĂNG NHẬP LẠI (Bảo mật cao)
    if (success) {
      alert(
        "Chúc mừng! Thay đổi mật khẩu thành công. Vui lòng đăng nhập lại với mật khẩu mới."
      );
      localStorage.removeItem("mina_user"); // Xóa session
      window.location.href = "auth_login.html";
    }
  });
