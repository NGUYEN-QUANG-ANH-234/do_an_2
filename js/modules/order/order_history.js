/**
 * order_history.js - Quản lý nhật ký và trạng thái đơn hàng Mina Rubber
 */

document.addEventListener("DOMContentLoaded", () => {
  renderOrderHistory();
});

/**
 * 1. Render danh sách đơn hàng có phân quyền
 */
function renderOrderHistory(filteredData = null) {
  const user = JSON.parse(localStorage.getItem("mina_user"));
  const allOrders = JSON.parse(localStorage.getItem("mina_orders")) || [];
  const tableBody = document.getElementById("orderHistoryTable");

  if (!tableBody) return;

  // A. LỌC DỮ LIỆU THEO VAI TRÒ (Tách bạch đại lý)
  let displayData = filteredData || allOrders;

  if (user.role === "AGENCY") {
    displayData = displayData.filter((o) => o.agencyId === user.id);
  }

  if (displayData.length === 0) {
    tableBody.innerHTML =
      '<tr><td colspan="6" class="p-10 text-center text-slate-400 italic">Không tìm thấy đơn hàng nào phù hợp.</td></tr>';
    return;
  }

  // B. RENDER GIAO DIỆN
  tableBody.innerHTML = displayData
    .map((order) => {
      let statusBadge = "";
      // Định nghĩa màu sắc cho từng trạng thái
      switch (order.status) {
        case "READY_FOR_WAREHOUSE":
          statusBadge =
            '<span class="px-3 py-1 bg-orange-100 text-orange-600 text-[10px] font-black rounded-full uppercase italic">Chờ Kho Xử Lý</span>';
          break;
        case "SHIPPING":
          statusBadge =
            '<span class="px-3 py-1 bg-blue-100 text-blue-600 text-[10px] font-black rounded-full uppercase italic">Đang Giao Hàng</span>';
          break;
        case "DELIVERED":
          statusBadge =
            '<span class="px-3 py-1 bg-green-100 text-green-600 text-[10px] font-black rounded-full uppercase italic">Đã Hoàn Tất</span>';
          break;
        default:
          statusBadge = `<span class="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-black rounded-full uppercase">${order.status}</span>`;
      }

      return `
            <tr class="border-b border-slate-50 hover:bg-slate-50/80 transition-all group">
                <td class="px-6 py-5">
                    <div class="text-sm font-black text-blue-600 italic tracking-tighter">#${
                      order.id
                    }</div>
                    <div class="text-[10px] text-slate-400 mt-1 font-medium">${
                      order.createdAt
                    }</div>
                </td>
                <td class="px-6 py-5">
                    <div class="font-bold text-slate-700">${
                      order.agencyName
                    }</div>
                    <div class="text-[10px] text-slate-400 uppercase italic">Mã ĐL: ${
                      order.agencyId
                    }</div>
                </td>
                <td class="px-6 py-5">
                    <div class="text-sm font-medium text-slate-800">${
                      order.productName
                    }</div>
                    <div class="text-xs font-black text-slate-400 mt-1">SỐ LƯỢNG: ${
                      order.quantity
                    }</div>
                </td>
                <td class="px-6 py-5 font-black text-slate-900">
                    ${(order.totalAmount || 0).toLocaleString()}đ
                </td>
                <td class="px-6 py-5">${statusBadge}</td>
                <td class="px-6 py-5 text-right">
                    <button onclick="viewOrderDetail('${
                      order.id
                    }')" class="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-900 hover:text-white transition-all shadow-sm">
                        <i class="fas fa-eye text-xs"></i>
                    </button>
                </td>
            </tr>
        `;
    })
    .join("");
}

/**
 * 2. Tìm kiếm và Lọc trạng thái
 */
function filterOrders() {
  const user = JSON.parse(localStorage.getItem("mina_user"));
  const keyword = document.getElementById("orderSearch").value.toLowerCase();
  const status = document.getElementById("statusFilter").value;
  const allOrders = JSON.parse(localStorage.getItem("mina_orders")) || [];

  // BỘ LỌC BẢO MẬT:
  if (user.role === "AGENCY") {
    allOrders = allOrders.filter((o) => o.agencyId === user.id);
  }

  const filtered = allOrders.filter((o) => {
    const matchKeyword =
      o.id.toLowerCase().includes(keyword) ||
      o.productName.toLowerCase().includes(keyword);
    const matchStatus = status === "" || o.status === status;
    return matchKeyword && matchStatus;
  });

  renderOrderHistory(filtered);
}

/**
 * 3. Xem chi tiết đơn hàng (Giả lập mở hóa đơn)
 */
function viewOrderDetail(orderId) {
  showToast(`Đang tải chi tiết đơn hàng #${orderId}...`, "info");
}
