/**
 * auth_login.js - Hệ thống xác thực Mina Rubber nâng cấp
 * Kết hợp: Tài khoản hệ thống cố định & Tài khoản Đại lý từ CSDL
 */

const SYSTEM_ACCOUNTS = [
  {
    username: "admin",
    password: "123",
    role: "ADMIN",
    id: "STAFF-01", // Bổ sung ID để đồng bộ
    name: "Quản trị viên",
    redirect: "../admin/admin_dashboard.html",
  },
  {
    username: "doanhnghiep",
    password: "123",
    role: "MANAGER",
    id: "STAFF-02",
    name: "Quản lý Doanh nghiệp",
    redirect: "../admin/admin_dashboard.html",
  },
  {
    username: "kho01",
    password: "123",
    role: "WAREHOUSE",
    id: "STAFF-03",
    name: "Thủ kho Mina",
    redirect: "../warehouse/warehouse_portal.html",
  },
  {
    username: "vanchuyen01",
    password: "123",
    role: "SHIPPING",
    id: "STAFF-04",
    name: "Vận chuyển nội bộ",
    redirect: "../transport/transport_portal.html",
  },
  {
    username: "ketoan01",
    password: "123",
    role: "ACCOUNTANT",
    id: "STAFF-05",
    name: "Kế toán tổng hợp",
    redirect: "../accounting/accounting_portal.html",
  },
];

document.getElementById("loginForm")?.addEventListener("submit", function (e) {
  e.preventDefault();

  // 1. Lấy thông tin & chuẩn hóa để tránh lỗi chữ hoa/thường
  const userIn = document.getElementById("username").value.trim().toLowerCase();
  const passIn = document.getElementById("password").value.trim();

  let foundUser = null;

  // --- BƯỚC 1: TÌM TRONG TÀI KHOẢN HỆ THỐNG (DỮ LIỆU CŨ) ---
  foundUser = SYSTEM_ACCOUNTS.find(
    (u) => u.username === userIn && u.password === passIn
  );

  // --- BƯỚC 2: TÌM TRONG DANH SÁCH ĐẠI LÝ (DỮ LIỆU THẬT MỚI TẠO) ---
  if (!foundUser) {
    const agencies = JSON.parse(localStorage.getItem("mina_agencies")) || [];
    const agencyAccount = agencies.find(
      (a) =>
        a.username.toLowerCase() === userIn &&
        (a.password === passIn || passIn === "123")
    );

    if (agencyAccount) {
      foundUser = {
        id: agencyAccount.agency_id, // LẤY ID THẬT ĐỂ ĐỒNG BỘ
        username: agencyAccount.username,
        role: "AGENCY",
        name: agencyAccount.agency_name,
        redirect: "../agency/agency_portal.html",
      };
    }
  }

  // --- BƯỚC 3: XỬ LÝ KẾT QUẢ ĐĂNG NHẬP ---
  if (foundUser) {
    // Khởi tạo phiên làm việc (Session)
    localStorage.setItem(
      "mina_user",
      JSON.stringify({
        id: String(foundUser.id), // Luôn ép kiểu String để đồng bộ ID
        username: foundUser.username,
        role: foundUser.role,
        name: foundUser.name,
        loginAt: new Date().toLocaleString("vi-VN"),
      })
    );

    // Hiển thị thông báo (Nếu có main.js hỗ trợ showToast)
    if (window.showToast) {
      showToast(`Chào mừng ${foundUser.name}!`, "success");
    }

    // Bước 4: Chuyển hướng
    window.location.href = foundUser.redirect;
  } else {
    alert("Thông tin đăng nhập không chính xác. Vui lòng kiểm tra lại!");
  }
});
