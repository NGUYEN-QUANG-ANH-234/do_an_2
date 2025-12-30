/**
 * main.js - Hệ thống điều hướng và phân quyền Mina Rubber
 */

document.addEventListener("DOMContentLoaded", () => {
  // Khởi chạy hệ thống theo thứ tự ưu tiên
  initApp();
});

async function initApp() {
  // 1. Tải Sidebar
  await loadSidebar();

  // 2. Tải Header User (Thêm dòng này)
  await loadHeaderUser();

  // 3. Kiểm tra quyền và hiển thị thông tin (Hàm này đã có sẵn)
  authorizeUI();

  // 4. Khởi tạo các sự kiện toàn cục
  initGlobalEventListeners();
  fixDropdownHover();

  console.log("Mina Rubber: Hệ thống sẵn sàng.");
}

/**
 * Tải Sidebar và thiết lập điều hướng động
 */
async function loadSidebar() {
  const aside = document.querySelector("aside");
  if (!aside) return;

  try {
    // Luôn tìm file từ gốc frontend/components/
    const response = await fetch("/components/sidebar.html");
    const html = await response.text();
    aside.innerHTML = html;

    setupOverviewLink(); // Thiết lập nút Home sau khi nạp HTML
    authorizeUI();
    markActiveMenu();
  } catch (err) {
    console.error("Lỗi: Không tìm thấy sidebar tại /components/sidebar.html");
  }
}

/**
 * Điều phối nút Tổng quan về đúng trang Dashboard của từng Role
 */
/**
 * Thiết lập điều hướng nút Tổng quan động dựa trên Role
 */
function setupOverviewLink() {
  const user = JSON.parse(localStorage.getItem("mina_user"));
  const btnOverview = document.getElementById("btnOverview");

  if (user && btnOverview) {
    // Bản đồ đường dẫn chuẩn xác theo cấu trúc folder của bạn
    const roleRedirects = {
      ADMIN: "/pages/admin/admin_dashboard.html",
      MANAGER: "/pages/admin/admin_dashboard.html",
      ACCOUNTANT: "/pages/accounting/accounting_portal.html",
      AGENCY: "/pages/agency/agency_portal.html",
      WAREHOUSE: "/pages/warehouse/warehouse_portal.html",
      TRANSPORT: "/pages/transport/transport_portal.html",
    };

    // Gán href tuyệt đối
    btnOverview.href = roleRedirects[user.role] || "/index.html";
  }
}

/**
 * Hàm kiểm soát bảo mật đường dẫn (Route Guard)
 */
function checkSecurityGate(user, path) {
  // Admin có quyền vào tất cả mọi nơi, không cần kiểm tra
  if (user.role === "ADMIN") return true;

  // Định nghĩa các vùng folder được phép truy cập cho từng Role
  const accessMatrix = {
    AGENCY: [
      "/agency/",
      "/product/",
      "/order/",
      "/transport/",
      "/payment/",
      "/invoice/",
    ],
    MANAGER: ["/admin/", "/agency/", "/product/", "/invoice/"],
    WAREHOUSE: ["/warehouse/", "/order/"],
    TRANSPORT: ["/transport/"],
    ACCOUNTANT: [
      "/accounting/",
      "/product/",
      "/order/",
      "/payment/",
      "/invoice/",
    ],
  };

  const allowedFolders = accessMatrix[user.role] || [];

  // Kiểm tra xem đường dẫn hiện tại có chứa bất kỳ folder được phép nào không
  const isAllowed = allowedFolders.some((folder) => path.includes(folder));

  // Luôn cho phép truy cập trang Dashboard riêng của họ và trang đổi mật khẩu
  if (
    path.includes("auth_") ||
    path.includes("dashboard") ||
    path.includes("portal")
  ) {
    return true;
  }

  return isAllowed;
}

/**
 * Kiểm soát truy cập và hiển thị thông tin cá nhân hóa Header
 */
function authorizeUI() {
  const user = JSON.parse(localStorage.getItem("mina_user"));
  const path = window.location.pathname;

  // 1. Chặn nếu chưa đăng nhập
  if (!user && !path.includes("auth_login.html")) {
    window.location.href = "/pages/auth/auth_login.html";
    return;
  }

  if (user) {
    // 2. Kiểm tra quyền truy cập thư mục (Route Guard)
    if (!checkSecurityGate(user, path)) {
      alert(`Vai trò ${user.role} không có quyền truy cập khu vực này!`);
      const roleRedirects = {
        ADMIN: "/pages/admin/admin_dashboard.html",
        AGENCY: "/pages/agency/agency_portal.html",
        WAREHOUSE: "/pages/warehouse/warehouse_portal.html",
        TRANSPORT: "/pages/transport/transport_portal.html",
        ACCOUNTANT: "/pages/accounting/accounting_portal.html",
      };
      window.location.href = roleRedirects[user.role] || "/index.html";
      return;
    }

    // 3. HIỂN THỊ THÔNG TIN HEADER (Phần bổ sung mới)
    const roleMap = {
      ADMIN: "Quản trị hệ thống",
      AGENCY: "Đối tác Đại lý",
      MANAGER: "Quản lý doanh nghiệp",
      WAREHOUSE: "Quản lý Kho hàng",
      SHIPPING: "Vận chuyển nội bộ",
      ACCOUNTANT: "Kế toán tổng hợp",
    };

    // Cập nhật tên người dùng
    const nameSelectors = [
      "#userName",
      "#userInfo",
      "#agencyDisplayName",
      "#headerUserName",
    ];
    nameSelectors.forEach((s) => {
      const el = document.querySelector(s);
      if (el) el.innerText = user.name;
    });

    // Cập nhật vai trò hiển thị
    const roleEl = document.getElementById("headerUserRole");
    if (roleEl) roleEl.innerText = roleMap[user.role] || user.role;

    // Cập nhật chữ cái đại diện (Avatar)
    const initialEl = document.getElementById("userInitials");
    if (initialEl && user.name) {
      initialEl.innerText = user.name.charAt(0).toUpperCase();
    }

    // 4. Lọc Sidebar theo data-role (Giữ nguyên logic cũ)
    document.querySelectorAll("[data-role]").forEach((el) => {
      const allowedRoles = el.getAttribute("data-role").split(",");
      if (!allowedRoles.includes(user.role)) {
        el.remove();
      }
    });
  }
}

/**
 * Đánh dấu trang hiện tại trên Sidebar
 */
function markActiveMenu() {
  const path = window.location.pathname;
  document.querySelectorAll("aside a").forEach((link) => {
    const href = link.getAttribute("href");
    // Kiểm tra nếu đường dẫn hiện tại chứa link của menu
    if (href && href !== "#" && path.includes(href.replace("/pages", ""))) {
      link.classList.add("bg-blue-600", "text-white");
      link.classList.remove("hover:bg-slate-800");
    }
  });
}

/**
 * Xử lý độ trễ Dropdown (200ms) tránh mất hover
 */
function fixDropdownHover() {
  document.querySelectorAll(".group").forEach((group) => {
    let timeout;
    const menu = group.querySelector(".absolute");
    if (!menu) return;

    group.addEventListener("mouseenter", () => {
      clearTimeout(timeout);
      menu.classList.remove("hidden");
    });

    group.addEventListener("mouseleave", () => {
      timeout = setTimeout(() => menu.classList.add("hidden"), 200);
    });
  });
}

/**
 * Sự kiện click toàn cục (Đăng xuất)
 */
function initGlobalEventListeners() {
  document.addEventListener("click", (e) => {
    const btnLogout = e.target.closest("#btnLogout");
    if (btnLogout) {
      e.preventDefault();
      if (confirm("Xác nhận: Thoát khỏi hệ thống Mina Rubber?")) {
        localStorage.removeItem("mina_user");
        window.location.href = "/pages/auth/auth_login.html";
      }
    }
  });
}

/**
 * Hiển thị thông báo Toast thông minh
 */
function showToast(msg, type = "success") {
  let container = document.getElementById("toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    container.className = "fixed bottom-5 right-5 z-[9999] space-y-2";
    document.body.appendChild(container);
  }

  const colors = {
    success: "bg-green-600",
    danger: "bg-red-600",
    warning: "bg-orange-500",
    info: "bg-blue-600",
  };
  const toast = document.createElement("div");
  toast.className = `${colors[type]} text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center transition-all duration-300 animate-bounce-in`;
  toast.innerHTML = `<i class="fas ${
    type === "success" ? "fa-check-circle" : "fa-exclamation-circle"
  } mr-3"></i><span class="font-bold text-sm">${msg}</span>`;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 500);
  }, 3000);
}

/**
 * Tải Header User component và cập nhật thông tin session
 */
async function loadHeaderUser() {
  // Tìm container chứa thông tin user trong Header (Bạn nên đặt id cho nó trong HTML gốc)
  const headerContainer = document.getElementById("headerUserContainer");
  if (!headerContainer) return;

  try {
    const response = await fetch("/components/header_user.html");
    const html = await response.text();
    headerContainer.innerHTML = html;

    // Sau khi nạp HTML xong, gọi lại hàm authorizeUI để điền dữ liệu người dùng vào các ID mới nạp
    authorizeUI();
  } catch (err) {
    console.error(
      "Lỗi: Không tìm thấy header component tại /components/header_user.html"
    );
  }
}

/**
 * Nâng cấp main.js: Cổng điều phối dữ liệu (Data Gateway)
 */
const MinaGateway = {
  // Hàm lọc dữ liệu theo quyền sở hữu
  getOwnedData: function (key) {
    const user = JSON.parse(localStorage.getItem("mina_user"));
    const rawData = JSON.parse(localStorage.getItem(key)) || [];

    if (!user) return [];

    // Nếu là ADMIN/ACCOUNTANT/MANAGER: Xem tất cả
    if (["ADMIN", "ACCOUNTANT", "MANAGER"].includes(user.role)) {
      return rawData;
    }

    // Nếu là AGENCY: Chỉ lọc những gì thuộc về mình
    if (user.role === "AGENCY") {
      return rawData.filter(
        (item) =>
          item.agencyId === user.id ||
          item.ownerId === user.id ||
          item.createdBy === user.id
      );
    }

    return [];
  },
};
