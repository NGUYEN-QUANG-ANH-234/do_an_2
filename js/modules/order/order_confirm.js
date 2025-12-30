/**
 * order_confirm.js - Hệ thống phê duyệt hoàn tất chuỗi cung ứng Mina Rubber
 * Tối ưu đồng bộ đa tầng: Vận tải - Kho - Đại lý - Kế toán
 */

document.addEventListener("DOMContentLoaded", () => {
  initConfirmPage();

  // Lắng nghe thay đổi từ các tab khác (ví dụ trang Check-in vừa chạy xong xe)
  window.addEventListener("storage", (e) => {
    if (e.key === "mina_orders" || e.key === "mina_live_gps") {
      renderConfirmList();
    }
  });
});

function initConfirmPage() {
  renderConfirmList();
  updateAccountingStats();
}

/**
 * 1. HIỂN THỊ DANH SÁCH PHÊ DUYỆT
 */
/**
 * HIỂN THỊ DANH SÁCH PHÊ DUYỆT NHẬP KHO
 * Tối ưu hóa cho hệ thống đại lý mới và đồng bộ trạng thái vận tải
 */
function renderConfirmList() {
  // 1. Lấy thông tin người dùng và dữ liệu nguồn
  const user = JSON.parse(localStorage.getItem("mina_user"));
  let orders = JSON.parse(localStorage.getItem("mina_orders")) || [];
  const liveData = JSON.parse(localStorage.getItem("mina_live_gps")) || {};
  const container = document.getElementById("confirmListBody");

  if (!container || !user) return;

  // 2. LỌC DỮ LIỆU THEO QUYỀN HẠN (Security Guard)
  // Nếu là AGENCY: Chỉ hiển thị đơn hàng của chính mình (Đồng bộ ID chuỗi)
  if (user.role === "AGENCY") {
    orders = orders.filter((o) => String(o.agencyId) === String(user.id));
  }

  // 3. LỌC TRẠNG THÁI CHỜ PHÊ DUYỆT
  // Chấp nhận cả SHIPPING (đang đi) và ARRIVED (đã tới đích nhưng chưa duyệt)
  const displayOrders = orders.filter(
    (o) => o.status === "SHIPPING" || o.status === "ARRIVED"
  );

  // 4. XỬ LÝ GIAO DIỆN KHI TRỐNG
  if (displayOrders.length === 0) {
    container.innerHTML = `
            <tr>
                <td colspan="5" class="p-20 text-center">
                    <div class="flex flex-col items-center opacity-20">
                        <i class="fas fa-clipboard-check text-5xl mb-4"></i>
                        <p class="text-xs font-black uppercase italic tracking-widest text-slate-400">Không có vận đơn chờ xác nhận</p>
                    </div>
                </td>
            </tr>`;
    return;
  }

  // 5. RENDER DANH SÁCH
  container.innerHTML = displayOrders
    .map((o) => {
      /** * ĐIỀU KIỆN PHÊ DUYỆT:
       * Đơn đã chuyển sang trạng thái ARRIVED (đã đến đích)
       * HOẶC không còn tọa độ Live GPS (xe đã tắt máy/hoàn tất hành trình)
       */
      const isArrived = o.status === "ARRIVED" || !liveData[o.id];

      return `
            <tr class="border-b border-slate-50 hover:bg-slate-50/80 transition-all group">
                <td class="px-6 py-5 font-mono font-bold text-blue-600">#${
                  o.id
                }</td>
                
                <td class="px-6 py-5">
                    <div class="font-black text-slate-700 uppercase text-[10px] italic leading-tight">
                        ${o.agencyName}
                    </div>
                    <div class="text-[9px] text-slate-400 font-bold mt-1 tracking-tighter">
                        <i class="fas fa-map-marker-alt mr-1"></i>${
                          o.deliveryAddress
                        }
                    </div>
                </td>
                
                <td class="px-6 py-5">
                    <div class="text-[10px] font-black uppercase text-slate-500">${
                      o.productName
                    }</div>
                    <div class="text-[9px] text-blue-500 font-bold mt-1 italic">SL: ${
                      o.quantity
                    } kg</div>
                </td>
                
                <td class="px-6 py-5 text-center">
                    ${
                      isArrived
                        ? `<span class="px-3 py-1 bg-green-50 text-green-600 rounded-full text-[8px] font-black uppercase italic border border-green-200 shadow-sm flex items-center justify-center w-fit mx-auto">
                            <i class="fas fa-check-double mr-1 text-[7px]"></i> Đã cập bến
                           </span>`
                        : `<span class="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[8px] font-black uppercase italic border border-blue-200 animate-pulse flex items-center justify-center w-fit mx-auto">
                            <i class="fas fa-truck-loading mr-1 text-[7px]"></i> Đang vận chuyển
                           </span>`
                    }
                </td>
                
                <td class="px-6 py-5 text-right">
                    <button onclick="approveArrival('${o.id}')" 
                        ${!isArrived ? "disabled" : ""}
                        class="px-5 py-2.5 rounded-xl text-[9px] font-black uppercase italic transition-all shadow-lg active:scale-95
                        ${
                          isArrived
                            ? "bg-slate-900 text-white hover:bg-blue-600 cursor-pointer shadow-blue-100"
                            : "bg-slate-100 text-slate-300 cursor-not-allowed shadow-none"
                        }">
                        Duyệt nhập kho
                    </button>
                </td>
            </tr>`;
    })
    .join("");
}

/**
 * 2. PHÊ DUYỆT HOÀN TẤT VÀ ĐẨY DỮ LIỆU KẾ TOÁN
 */
function approveArrival(orderId) {
  if (
    !confirm(
      `Xác nhận đơn #${orderId} đã nhận hàng đầy đủ?\nDữ liệu sẽ được chốt để lập hóa đơn kế toán.`
    )
  )
    return;

  let orders = JSON.parse(localStorage.getItem("mina_orders")) || [];
  const idx = orders.findIndex((o) => o.id === orderId);

  if (idx !== -1) {
    const arrivalTime = new Date();

    // A. Cập nhật trạng thái vận tải
    orders[idx].status = "DELIVERED";
    orders[idx].deliveredAt = arrivalTime.toLocaleString("vi-VN");

    // B. Cấu trúc dữ liệu cho Accounting (Kế toán)
    orders[idx].accounting = {
      status: "PENDING_PAYMENT",
      confirmedBy: "Warehouse_Admin",
      invoiceDate: arrivalTime.toISOString(),
      revenueStatus: "UNRECOGNIZED",
    };

    // C. Lưu trữ bộ nhớ chính
    localStorage.setItem("mina_orders", JSON.stringify(orders));

    // D. Cập nhật lịch sử mua hàng riêng cho Đại lý
    syncAgencyLedger(orders[idx]);

    // E. Xóa rác dữ liệu GPS để tránh xe chạy ảo
    cleanupLiveGPS(orderId);

    if (window.showToast)
      showToast(`Vận đơn #${orderId} đã chốt. Chờ thanh toán!`, "success");

    initConfirmPage();

    // Đồng bộ các trang Check-in và History đang mở
    window.dispatchEvent(new Event("storage"));
  }
}

/**
 * 3. TIỆN ÍCH ĐỒNG BỘ
 */
function syncAgencyLedger(order) {
  const key = `mina_ledger_${order.agencyId}`;
  let ledger = JSON.parse(localStorage.getItem(key)) || [];
  ledger.unshift({
    orderId: order.id,
    content: `Nhận hàng thành công: ${order.productName}`,
    qty: order.quantity,
    timestamp: order.deliveredAt,
    status: "COMPLETED",
  });
  localStorage.setItem(key, JSON.stringify(ledger));
}

function cleanupLiveGPS(id) {
  let liveGPS = JSON.parse(localStorage.getItem("mina_live_gps")) || {};
  delete liveGPS[id];
  localStorage.setItem("mina_live_gps", JSON.stringify(liveGPS));
}

function updateAccountingStats() {
  const orders = JSON.parse(localStorage.getItem("mina_orders")) || [];
  const pendingAcc = orders.filter(
    (o) =>
      o.status === "DELIVERED" && o.accounting?.status === "PENDING_PAYMENT"
  ).length;
  const el = document.getElementById("pendingAccountingCount");
  if (el) el.innerText = pendingAcc;
}
