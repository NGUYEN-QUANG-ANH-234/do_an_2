/**
 * transport_history.js - Quản lý lịch sử và hiệu suất vận tải Mina Rubber
 * Phục vụ mục tiêu xác định KPIs khía cạnh Tài chính và Vận hành
 */

document.addEventListener("DOMContentLoaded", () => {
  initTransportHistory();
});

/**
 * 1. KHỞI TẠO TRANG
 */
function initTransportHistory() {
  renderHistoryTable();
  updateHistoryStats();

  // Lắng nghe thay đổi dữ liệu từ các bộ phận khác
  window.addEventListener("storage", (e) => {
    if (e.key === "mina_orders" || e.key === "mina_transport_history") {
      renderHistoryTable();
      updateHistoryStats();
    }
  });
}

/**
 * 2. CẬP NHẬT CHỈ SỐ TỔNG QUAN (KPIs)
 */
function updateHistoryStats() {
  const orders = JSON.parse(localStorage.getItem("mina_orders")) || [];
  const deliveredOrders = orders.filter((o) => o.status === "DELIVERED");

  // Tính tổng số kiện hàng đã giao thành công
  const totalItems = deliveredOrders.reduce(
    (sum, o) => sum + (parseInt(o.quantity) || 0),
    0
  );

  // Tính tỉ lệ hoàn thành (Ví dụ đơn giản cho KPIs)
  const completionRate =
    orders.length > 0
      ? ((deliveredOrders.length / orders.length) * 100).toFixed(1)
      : 0;

  if (document.getElementById("totalDeliveredCount"))
    document.getElementById("totalDeliveredCount").innerText =
      deliveredOrders.length;
  if (document.getElementById("totalItemsCount"))
    document.getElementById("totalItemsCount").innerText = totalItems;
  if (document.getElementById("completionRate"))
    document.getElementById("completionRate").innerText = completionRate + "%";
}

/**
 * 3. HIỂN THỊ BẢNG LỊCH SỬ CHI TIẾT
 */
function renderHistoryTable(searchTerm = "") {
  const orders = JSON.parse(localStorage.getItem("mina_orders")) || [];
  const historyBody = document.getElementById("historyBody");
  if (!historyBody) return;

  // Lọc các đơn hàng đã giao thành công hoặc đã hoàn tất hành trình
  const completedTasks = orders.filter(
    (o) =>
      o.status === "DELIVERED" &&
      (o.id.toLowerCase().includes(searchTerm) ||
        o.agencyName.toLowerCase().includes(searchTerm))
  );

  if (completedTasks.length === 0) {
    historyBody.innerHTML = `
            <tr>
                <td colspan="6" class="p-10 text-center text-slate-400 italic">
                    Chưa có lịch sử chuyến hàng hoàn tất.
                </td>
            </tr>`;
    return;
  }

  historyBody.innerHTML = completedTasks
    .map(
      (o) => `
        <tr class="border-b border-slate-50 hover:bg-slate-50 transition-all">
            <td class="px-6 py-4 font-black text-blue-600 text-xs italic">#${
              o.id
            }</td>
            <td class="px-6 py-4 font-bold text-slate-700 uppercase text-xs">${
              o.agencyName
            }</td>
            <td class="px-6 py-4">
                <div class="text-[11px] font-bold text-slate-600 uppercase">${
                  o.productName
                }</div>
                <div class="text-[9px] text-slate-400">Số lượng: ${
                  o.quantity
                }</div>
            </td>
            <td class="px-6 py-4">
                <span class="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-black uppercase">
                    ${o.partnerName || "Nội bộ"}
                </span>
            </td>
            <td class="px-6 py-4 text-[10px] text-slate-500 font-medium">
                <div>Đi: ${o.shippedAt || "---"}</div>
                <div class="text-green-600 font-bold">Đến: ${
                  o.deliveredAt || "---"
                }</div>
            </td>
            <td class="px-6 py-4 text-right">
                <span class="px-3 py-1 bg-green-100 text-green-600 rounded-full text-[10px] font-black uppercase italic">
                    Thành công
                </span>
            </td>
        </tr>
    `
    )
    .join("");
}

/**
 * 4. XUẤT BÁO CÁO (Dành cho mục tiêu 5.3: Scenarios/Tools)
 */
function exportTransportReport() {
  const orders = JSON.parse(localStorage.getItem("mina_orders")) || [];
  const delivered = orders.filter((o) => o.status === "DELIVERED");

  console.log("Dữ liệu báo cáo vận tải:", delivered);
  alert(
    "Dữ liệu đã được trích xuất ra console. Bạn có thể tích hợp xuất Excel tại đây."
  );
}
