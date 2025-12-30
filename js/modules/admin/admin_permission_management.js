/**
 * admin_permission_management.js - Trung tâm quản trị đặc quyền
 * Đồng bộ logic với auth_login.js và cấu hình 6 ô KPI
 */

const SYSTEM_ACCOUNTS = [
  {
    id: "STAFF-01",
    name: "Quản trị viên",
    username: "admin",
    role: "ADMIN",
    email: "admin@minarubber.vn",
  },
  {
    id: "STAFF-02",
    name: "Quản lý Doanh nghiệp",
    username: "doanhnghiep",
    role: "MANAGER",
    email: "manager@minarubber.vn",
  },
  {
    id: "STAFF-03",
    name: "Thủ kho Mina",
    username: "kho01",
    role: "WAREHOUSE",
    email: "warehouse@minarubber.vn",
  },
  {
    id: "STAFF-04",
    name: "Vận chuyển nội bộ",
    username: "vanchuyen01",
    role: "SHIPPING",
    email: "transport@minarubber.vn",
  },
  {
    id: "STAFF-05",
    name: "Kế toán tổng hợp",
    username: "ketoan01",
    role: "ACCOUNTANT",
    email: "accounting@minarubber.vn",
  },
];

document.addEventListener("DOMContentLoaded", () => {
  initPermissionPage();

  document.getElementById("userSearch")?.addEventListener("input", (e) => {
    renderUserTable(e.target.value.toLowerCase());
  });

  document
    .getElementById("roleForm")
    ?.addEventListener("submit", handleUpdateRole);

  window.addEventListener("storage", () => initPermissionPage());
});

function initPermissionPage() {
  updateUserStats();
  renderUserTable();
}

/**
 * 1. TỔNG HỢP KPIs TÀI KHOẢN (Đã tách biệt 6 nhóm)
 */
function updateUserStats() {
  const agencies = JSON.parse(localStorage.getItem("mina_agencies")) || [];

  const stats = {
    total: SYSTEM_ACCOUNTS.length + agencies.length,
    admin: SYSTEM_ACCOUNTS.filter(
      (u) => u.role === "ADMIN" || u.role === "MANAGER"
    ).length,
    accountant: SYSTEM_ACCOUNTS.filter((u) => u.role === "ACCOUNTANT").length,
    warehouse: SYSTEM_ACCOUNTS.filter((u) => u.role === "WAREHOUSE").length,
    shipping: SYSTEM_ACCOUNTS.filter((u) => u.role === "SHIPPING").length,
    agency: agencies.length,
  };

  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.innerText = val;
  };

  setEl("totalUsers", stats.total);
  setEl("adminCount", stats.admin);
  setEl("accCount", stats.accountant); // Kế toán
  setEl("warehouseCount", stats.warehouse); // Kho hàng
  setEl("transCount", stats.shipping); // Vận chuyển (SHIPPING)
  setEl("agencyUserCount", stats.agency); // Đại lý đối tác
}

/**
 * 2. HIỂN THỊ DANH SÁCH TÀI KHOẢN
 */
function renderUserTable(filter = "") {
  const agencies = JSON.parse(localStorage.getItem("mina_agencies")) || [];
  const container = document.getElementById("userTableBody");
  if (!container) return;

  const agencyUsers = agencies.map((a) => ({
    id: a.agency_id,
    name: a.agency_name,
    username: a.username,
    role: "AGENCY",
    email: a.email || `${a.username}@agency.com`,
    isSystem: false,
  }));

  const systemUsers = SYSTEM_ACCOUNTS.map((s) => ({ ...s, isSystem: true }));
  let allUsers = [...systemUsers, ...agencyUsers];

  if (filter) {
    allUsers = allUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(filter) ||
        u.username.toLowerCase().includes(filter) ||
        u.role.toLowerCase().includes(filter)
    );
  }

  const matrixMap = {
    ADMIN: "Hệ thống tổng (Full Access)",
    MANAGER: "Quản trị /admin/, /agency/...",
    ACCOUNTANT: "Tài chính /accounting/, /invoice/...",
    WAREHOUSE: "Kho vận /warehouse/, /order/...",
    SHIPPING: "Giao nhận /transport/",
    AGENCY: "Portal /agency/, /order/, /payment/...",
  };

  container.innerHTML = allUsers
    .map(
      (u) => `
    <tr class="user-row hover:bg-slate-50 border-b border-slate-50 transition-all group">
        <td class="px-10 py-6">
            <div class="flex items-center gap-3">
                <div class="w-9 h-9 ${
                  u.isSystem
                    ? "bg-rose-600 text-white"
                    : "bg-slate-100 text-slate-400"
                } rounded-xl flex items-center justify-center text-[10px] font-black shadow-sm uppercase">
                    ${u.name.charAt(0)}
                </div>
                <div>
                    <div class="font-black text-slate-700 uppercase italic text-xs leading-none">${
                      u.name
                    }</div>
                    <div class="text-[8px] text-slate-400 mt-1 font-bold uppercase tracking-tighter italic">ID: ${
                      u.id
                    }</div>
                </div>
            </div>
        </td>
        <td class="px-10 py-6">
            <div class="text-[10px] font-bold text-slate-500">${
              u.username
            }</div>
            <div class="text-[8px] text-slate-300 font-medium">${
              u.email || ""
            }</div>
        </td>
        <td class="px-10 py-6">
            <span class="px-3 py-1 rounded-lg text-[9px] font-black uppercase italic border ${getRoleStyle(
              u.role
            )}">
                ${u.role}
            </span>
        </td>
        <td class="px-10 py-6">
            <div class="text-[9px] text-slate-400 font-medium italic">${
              matrixMap[u.role] || "Chưa cấp vùng truy cập"
            }</div>
        </td>
        <td class="px-10 py-6 text-right">
            ${
              u.isSystem
                ? `<i class="fas fa-lock text-slate-200 text-xs" title="Tài khoản hệ thống cố định"></i>`
                : `<button onclick="openRoleModal('${u.id}', '${u.username}', '${u.role}')" class="w-8 h-8 rounded-xl bg-slate-50 text-slate-300 hover:bg-rose-600 hover:text-white transition-all shadow-sm">
                  <i class="fas fa-user-cog text-xs"></i>
                </button>`
            }
        </td>
    </tr>`
    )
    .join("");
}

/**
 * 3. STYLE CHO TỪNG ROLE
 */
function getRoleStyle(role) {
  const maps = {
    ADMIN: "bg-rose-50 text-rose-600 border-rose-100",
    MANAGER: "bg-rose-50 text-rose-600 border-rose-100",
    ACCOUNTANT: "bg-indigo-50 text-indigo-600 border-indigo-100",
    WAREHOUSE: "bg-amber-50 text-amber-600 border-amber-100",
    SHIPPING: "bg-blue-50 text-blue-600 border-blue-100",
    AGENCY: "bg-emerald-50 text-emerald-600 border-emerald-100",
  };
  return maps[role] || "bg-slate-50 text-slate-400 border-slate-100";
}

/**
 * 4. XỬ LÝ MODAL
 */
function openRoleModal(id, username, currentRole) {
  document.getElementById("targetUserId").value = id;
  document.getElementById("targetUserEmail").innerText = username;
  document.getElementById("newRole").value = currentRole;
  document.getElementById("roleModal").classList.replace("hidden", "flex");
}

function closeRoleModal() {
  document.getElementById("roleModal").classList.replace("flex", "hidden");
}

function handleUpdateRole(e) {
  e.preventDefault();
  const id = document.getElementById("targetUserId").value;
  const newRole = document.getElementById("newRole").value;

  let agencies = JSON.parse(localStorage.getItem("mina_agencies")) || [];
  const idx = agencies.findIndex((a) => String(a.agency_id) === String(id));

  if (idx !== -1) {
    agencies[idx].role = newRole;
    localStorage.setItem("mina_agencies", JSON.stringify(agencies));

    if (window.showToast) showToast("Cập nhật quyền thành công!", "success");
    closeRoleModal();
    initPermissionPage();
    window.dispatchEvent(new Event("storage"));
  }
}
