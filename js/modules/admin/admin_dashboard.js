/**
 * admin_dashboard.js - Trung tâm xử lý dữ liệu tổng hợp Admin
 * Tối ưu hóa: Tách biệt Doanh thu thực và Nợ phải thu theo chuẩn BSC 5.1
 */

document.addEventListener("DOMContentLoaded", () => {
  refreshDashboard();

  window.addEventListener("storage", () => {
    refreshDashboard();
  });
});

function refreshDashboard() {
  const agencies = JSON.parse(localStorage.getItem("mina_agencies")) || [];
  const contracts = JSON.parse(localStorage.getItem("mina_contracts")) || [];
  const orders = JSON.parse(localStorage.getItem("mina_orders")) || [];
  const logs = JSON.parse(localStorage.getItem("mina_contract_logs")) || [];

  // 1. Cập nhật các chỉ số cơ bản
  updateCounter("statTotalAgencies", agencies.length);
  updateCounter("statTotalOrders", orders.length);
  const pendingCount = contracts.filter((c) => c.status === "Pending").length;
  updateCounter("statPendingContracts", pendingCount);

  // 2. PHÂN TÍCH TÀI CHÍNH THỰC TẾ (Đã sửa lỗi cộng dồn nợ)

  // A. Doanh thu thực tế (Chỉ tính các đơn đã thanh toán xong - PAID)
  const actualRevenue = orders
    .filter((o) => o.accounting?.status === "PAID")
    .reduce((sum, o) => sum + (Number(o.accounting?.totalAmount) || 0), 0);

  // B. Nợ phải thu (Chỉ tính các đơn đang treo nợ - DEBT_POSTING hoặc AWAITING_PAYMENT)
  const accountsReceivable = orders
    .filter(
      (o) =>
        o.accounting?.status === "DEBT_POSTING" ||
        o.accounting?.status === "AWAITING_PAYMENT"
    )
    .reduce((sum, o) => sum + (Number(o.accounting?.totalAmount) || 0), 0);

  // Hiển thị nợ phải thu (Đơn vị: Triệu đồng)
  const debtInMillion = (accountsReceivable / 1000000).toFixed(2);
  updateCounter("statTotalDebt", debtInMillion);

  // (Tùy chọn) Nếu bạn có ô hiển thị Doanh thu thực trên Dashboard Admin:
  const revenueInMillion = (actualRevenue / 1000000).toFixed(2);
  if (document.getElementById("statTotalRevenue")) {
    updateCounter("statTotalRevenue", revenueInMillion);
  }

  // 3. Hiển thị hoạt động gần đây
  renderRecentActivities(logs, orders);
}

/**
 * Hiển thị bảng hoạt động mới nhất (Đồng bộ nhãn trạng thái)
 */
function renderRecentActivities(logs, orders) {
  const container = document.getElementById("recentActivityBody");
  if (!container) return;

  const activities = [
    ...logs.map((l) => ({
      name: `Đại lý #${l.agency_id}`,
      type: "Hợp đồng",
      desc: l.change_description,
      time: l.changed_at,
      value: "-",
      color: "blue",
    })),
    ...orders.map((o) => {
      // Xác định trạng thái để hiển thị màu sắc phù hợp
      const isPaid = o.accounting?.status === "PAID";
      return {
        name: o.agencyName || `ĐL #${o.agencyId}`,
        type: isPaid ? "Thanh toán" : "Đơn hàng",
        desc: isPaid ? `Đã tất toán đơn #${o.id}` : `Đặt mua: ${o.productName}`,
        time: o.updatedAt || o.createdAt,
        value:
          (
            Number(o.accounting?.totalAmount) ||
            Number(o.totalAmount) ||
            0
          ).toLocaleString() + " đ",
        color: isPaid ? "indigo" : "green",
      };
    }),
  ];

  // Sắp xếp: Mới nhất lên đầu và lấy 8 hoạt động
  const sortedActivities = activities
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .slice(0, 8);

  if (sortedActivities.length === 0) {
    container.innerHTML = `<tr><td colspan="4" class="p-10 text-center text-slate-400 italic opacity-30 uppercase font-black text-[10px]">Chưa có hoạt động nào.</td></tr>`;
    return;
  }

  container.innerHTML = sortedActivities
    .map(
      (act) => `
        <tr class="hover:bg-slate-50 transition-all border-b border-slate-50">
            <td class="px-8 py-4 font-bold text-slate-700 text-xs">${act.name}</td>
            <td class="px-8 py-4">
                <span class="px-2 py-1 bg-${act.color}-50 text-${act.color}-600 text-[9px] font-black rounded-lg uppercase italic border border-${act.color}-100">
                    ${act.type}
                </span>
            </td>
            <td class="px-8 py-4 text-[10px] text-slate-400 font-bold italic">${act.time}</td>
            <td class="px-8 py-4 text-right font-mono font-bold text-slate-900 text-xs">${act.value}</td>
        </tr>
    `
    )
    .join("");
}

function updateCounter(id, value) {
  const el = document.getElementById(id);
  if (el) el.innerText = value;
}
