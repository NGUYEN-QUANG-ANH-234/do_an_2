/**
 * warehouse_portal.js - Trung tâm điều hành kho Mina Rubber
 */

document.addEventListener("DOMContentLoaded", () => {
  // Khởi tạo Dashboard
  initWarehouseDashboard();
});

/**
 * Hàm khởi tạo và làm mới toàn bộ dữ liệu giao diện
 */
function initWarehouseDashboard() {
  renderKPIs();
  renderPendingOrders();
}

/**
 * 1. Thống kê nhanh các chỉ số kho (KPIs)
 */
function renderKPIs() {
  const inventory = JSON.parse(localStorage.getItem("mina_inventory")) || [];
  const orders = JSON.parse(localStorage.getItem("mina_orders")) || [];
  const exportLogs = JSON.parse(localStorage.getItem("mina_export_logs")) || [];

  // Chỉ số hàng thấp (dưới 10)
  const lowStockCount = inventory.filter((item) => item.stock < 10).length;

  // Đơn hàng đang chờ xử lý
  const pendingCount = orders.filter(
    (o) => o.status === "READY_FOR_WAREHOUSE"
  ).length;

  // Số đơn đã xuất trong ngày hôm nay
  const today = new Date().toLocaleDateString();
  const shippedTodayCount = exportLogs.filter((log) =>
    log.date.includes(today)
  ).length;

  // Đổ dữ liệu ra các thẻ HTML
  if (document.getElementById("totalProducts"))
    document.getElementById("totalProducts").innerText = inventory.length;
  if (document.getElementById("lowStockAlert"))
    document.getElementById("lowStockAlert").innerText = lowStockCount;
  if (document.getElementById("pendingOrdersCount"))
    document.getElementById("pendingOrdersCount").innerText = pendingCount;
  if (document.getElementById("shippedToday"))
    document.getElementById("shippedToday").innerText = shippedTodayCount;
}

/**
 * 2. Hiển thị danh sách đơn hàng cần xuất kho
 */
function renderPendingOrders() {
  const allOrders = JSON.parse(localStorage.getItem("mina_orders")) || [];
  const pendingOrders = allOrders.filter(
    (order) => order.status === "READY_FOR_WAREHOUSE"
  );

  const tableBody = document.getElementById("pendingOrdersTable");
  if (!tableBody) return;

  if (pendingOrders.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-10 text-center text-slate-400 italic font-medium">Hiện không có đơn hàng nào chờ xuất kho.</td></tr>`;
    return;
  }

  tableBody.innerHTML = pendingOrders
    .map((order) => {
      // Tìm thông tin đại lý để lấy khu vực
      const agencies = JSON.parse(localStorage.getItem("mina_agencies")) || [];
      const agency = agencies.find((a) => a.agency_id === order.agencyId);

      return `
        <tr class="border-b border-slate-50 hover:bg-slate-50 transition-all">
            <td class="px-6 py-4 font-black text-blue-600 italic">#${
              order.id
            }</td>
            <td class="px-6 py-4">
                <div class="font-bold text-slate-700">${order.agencyName}</div>
                <div class="text-[9px] text-slate-400 font-black uppercase italic">
                    <i class="fas fa-map-marker-alt mr-1"></i>${
                      agency ? agency.region_name : "N/A"
                    }
                </div>
            </td>
            <td class="px-6 py-4 text-sm font-medium">${order.productName}</td>
            <td class="px-6 py-4 font-black text-slate-900">${
              order.quantity
            }</td>
            <td class="px-6 py-4 text-right">
                <button onclick="goToExport('${order.id}')" 
                    class="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase italic hover:bg-red-600 transition-all shadow-lg shadow-slate-200">
                    Xử lý xuất kho <i class="fas fa-arrow-right ml-1"></i>
                </button>
            </td>
        </tr>
    `;
    })
    .join("");
}

/**
 * 3. Chuyển hướng sang trang Export (Xử lý chi tiết)
 */
function goToExport(orderId) {
  // Lưu tạm ID vào Session để trang warehouse_export.html tự động nạp dữ liệu
  sessionStorage.setItem("processing_order_id", orderId);
  window.location.href = "warehouse_export.html";
}
