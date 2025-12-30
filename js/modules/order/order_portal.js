/**
 * order_portal.js - Quản lý trung tâm điều phối đơn hàng Mina Rubber
 * Tối ưu đếm chỉ số thông minh & Đồng bộ GPS thực tế
 */

document.addEventListener("DOMContentLoaded", () => {
  initOrderPortal();
});

/**
 * 1. KHỞI TẠO VÀ ĐIỀU PHỐI DỮ LIỆU
 */
function initOrderPortal() {
  const user = JSON.parse(localStorage.getItem("mina_user"));
  const allOrders = JSON.parse(localStorage.getItem("mina_orders")) || [];
  const liveData = JSON.parse(localStorage.getItem("mina_live_gps")) || {};

  if (!user) {
    window.location.href = "../../login.html";
    return;
  }

  // A. LỌC DỮ LIỆU THEO VAI TRÒ (Role-based Filtering)
  let myOrders = [];
  if (["ADMIN", "MANAGER", "WAREHOUSE"].includes(user.role)) {
    myOrders = allOrders;
  } else if (user.role === "AGENCY") {
    myOrders = allOrders.filter((o) => o.agencyId === user.id);
  }

  // B. CẬP NHẬT CÁC CHỈ SỐ DASHBOARD
  updateDashboardStats(myOrders, liveData);

  // C. RENDER BẢNG HOẠT ĐỘNG GẦN ĐÂY
  renderOrderTable(myOrders, user.role);

  // D. LẮNG NGHE SỰ THAY ĐỔI TỪ CÁC TAB KHÁC (Check-in, Confirm)
  window.addEventListener("storage", (e) => {
    if (["mina_orders", "mina_live_gps"].includes(e.key)) {
      initOrderPortal(); // Tự động làm mới dữ liệu
    }
  });
}

/**
 * 2. CẬP NHẬT CHỈ SỐ THỐNG KÊ (KPIs)
 */
function updateDashboardStats(orders, liveData) {
  // Chờ kho (PENDING hoặc READY_FOR_WAREHOUSE)
  const pending = orders.filter((o) =>
    ["PENDING", "READY_FOR_WAREHOUSE"].includes(o.status)
  ).length;

  // Đang giao (SHIPPING và còn đang di chuyển trên GPS)
  const shipping = orders.filter(
    (o) => o.status === "SHIPPING" && liveData[o.id]
  ).length;

  // Đã cập bến (SHIPPING nhưng đã dừng GPS - Chờ duyệt nhập kho)
  const arrived = orders.filter(
    (o) => o.status === "SHIPPING" && !liveData[o.id]
  ).length;

  // Thành công (DELIVERED)
  const delivered = orders.filter((o) => o.status === "DELIVERED").length;

  // Cập nhật lên giao diện
  updateElementText("countPending", pending);
  updateElementText("countShipping", shipping);
  updateElementText("countArrived", arrived); // Chỉ số mới
  updateElementText("countDelivered", delivered);
  updateElementText("countTotal", orders.length);
}

/**
 * 3. RENDER BẢNG DỮ LIỆU
 */
function renderOrderTable(dataList, role) {
  const tableBody = document.getElementById("recentOrdersTable");
  if (!tableBody) return;

  // Sắp xếp đơn mới nhất lên đầu
  const sortedData = [...dataList]
    .sort((a, b) => b.id.localeCompare(a.id))
    .slice(0, 10);

  if (sortedData.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="5" class="p-12 text-center text-slate-400 italic">Không tìm thấy hoạt động đơn hàng nào.</td></tr>`;
    return;
  }

  tableBody.innerHTML = sortedData
    .map((order) => {
      const statusConfig = {
        PENDING: "bg-slate-100 text-slate-600 border-slate-200",
        READY_FOR_WAREHOUSE: "bg-orange-100 text-orange-600 border-orange-200",
        SHIPPING: "bg-blue-100 text-blue-600 border-blue-200",
        DELIVERED: "bg-green-100 text-green-600 border-green-200",
      };

      const statusClass =
        statusConfig[order.status] || "bg-slate-50 text-slate-400";

      // Nút hành động theo trạng thái
      let actionBtn = "";
      if (order.status === "SHIPPING") {
        actionBtn = `<button onclick="window.location.href='order_shipping.html?id=${order.id}'" 
                         class="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                         <i class="fas fa-truck-fast text-[10px]"></i></button>`;
      } else if (order.status === "DELIVERED") {
        actionBtn = `<button class="w-8 h-8 bg-green-50 text-green-600 rounded-lg cursor-default">
                         <i class="fas fa-check-double text-[10px]"></i></button>`;
      }

      return `
            <tr class="border-b border-slate-50 hover:bg-slate-50 transition-all group">
                <td class="px-6 py-5">
                    <div class="text-xs font-black text-slate-900 italic tracking-tighter uppercase">#${
                      order.id
                    }</div>
                    <div class="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-widest">${
                      order.createdAt || "Vừa tạo"
                    }</div>
                </td>
                <td class="px-6 py-5">
                    <div class="text-sm font-black text-slate-700 italic uppercase leading-none mb-1">
                        ${
                          role === "AGENCY"
                            ? order.productName
                            : order.agencyName
                        }
                    </div>
                    <div class="text-[10px] text-slate-400 font-bold uppercase">
                        <i class="fas ${
                          role === "AGENCY" ? "fa-box" : "fa-store"
                        } mr-1 opacity-50"></i>
                        ${
                          role === "AGENCY"
                            ? `SL: ${order.quantity}kg`
                            : order.deliveryAddress
                        }
                    </div>
                </td>
                <td class="px-6 py-5 text-center">
                    <span class="px-3 py-1 ${statusClass} text-[9px] font-black rounded-full uppercase border italic shadow-sm">
                        ${order.status.replace(/_/g, " ")}
                    </span>
                </td>
                <td class="px-6 py-5 text-right font-mono font-black text-slate-800 tracking-tighter">
                    ${(order.totalAmount || 0).toLocaleString()}đ
                </td>
                <td class="px-6 py-5 text-right">
                    <div class="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        ${actionBtn}
                    </div>
                </td>
            </tr>`;
    })
    .join("");
}

function updateElementText(id, value) {
  const el = document.getElementById(id);
  if (el) el.innerText = value;
}
