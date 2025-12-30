/**
 * invoice_portal.js - Cổng điều phối Hóa đơn & Tài chính Mina Rubber
 * Kết nối: Xác nhận nhận hàng (Warehouse) -> Hóa đơn (Accounting) -> Thanh toán (Agency)
 */

document.addEventListener("DOMContentLoaded", () => {
  // Khởi tạo giao diện khi trang tải xong
  renderInvoicePortal();

  // Lắng nghe sự thay đổi từ các tab khác (ví dụ: vừa Duyệt nhập kho ở tab khác)
  window.addEventListener("storage", (e) => {
    if (e.key === "mina_orders") {
      renderInvoicePortal();
    }
  });
});

/**
 * 1. RENDER BẢNG TỔNG QUÁT HÓA ĐƠN
 */
function renderInvoicePortal() {
  const user = JSON.parse(localStorage.getItem("mina_user"));
  const orders = JSON.parse(localStorage.getItem("mina_orders")) || [];
  const container = document.getElementById("invoicePortalBody");

  if (!container || !user) return;

  // LỌC DỮ LIỆU: Chỉ những đơn đã xác nhận nhận hàng (DELIVERED) mới tạo hóa đơn
  let invoiceData = orders.filter((o) => o.status === "DELIVERED");

  // PHÂN QUYỀN TRUY XUẤT:
  // Đại lý chỉ thấy hóa đơn của mình. Kế toán/Admin thấy toàn bộ.
  if (user.role === "AGENCY") {
    invoiceData = invoiceData.filter(
      (o) => String(o.agencyId) === String(user.id)
    );
  }

  if (invoiceData.length === 0) {
    container.innerHTML = `
            <tr>
                <td colspan="6" class="p-20 text-center">
                    <div class="flex flex-col items-center opacity-20">
                        <i class="fas fa-file-invoice text-5xl mb-4"></i>
                        <p class="text-xs font-black uppercase italic">Chưa có hóa đơn nào được xác lập</p>
                    </div>
                </td>
            </tr>`;
    return;
  }

  // RENDER DANH SÁCH HÓA ĐƠN
  container.innerHTML = invoiceData
    .map((inv) => {
      // Tính toán KPI Tài chính (Tổng tiền hóa đơn)
      const totalAmount = inv.totalAmount || inv.quantity * 50000;
      const status = inv.accounting?.status || "PENDING";

      return `
            <tr class="border-b border-slate-50 hover:bg-slate-50 transition-all">
                <td class="px-6 py-5 font-mono font-bold text-blue-600">#INV-${
                  inv.id
                }</td>
                <td class="px-6 py-5">
                    <div class="font-black text-slate-700 uppercase text-[10px] italic leading-tight">${
                      inv.agencyName
                    }</div>
                    <div class="text-[9px] text-slate-400 font-bold mt-1 tracking-tighter italic">
                        <i class="fas fa-clock mr-1"></i>${
                          inv.deliveredAt || "N/A"
                        }
                    </div>
                </td>
                <td class="px-6 py-5 font-mono font-black text-slate-800 text-sm">
                    ${Number(totalAmount).toLocaleString()} đ
                </td>
                <td class="px-6 py-5 text-center">
                    <span class="px-3 py-1 rounded-full text-[8px] font-black uppercase italic border shadow-sm
                        ${
                          status === "PAID"
                            ? "bg-green-50 text-green-600 border-green-200"
                            : "bg-orange-50 text-orange-600 border-orange-200"
                        }">
                        <i class="fas ${
                          status === "PAID"
                            ? "fa-check-circle"
                            : "fa-hourglass-half"
                        } mr-1"></i>
                        ${status === "PAID" ? "Đã thanh toán" : "Chờ xử lý"}
                    </span>
                </td>
                <td class="px-6 py-5 text-right">
                    <div class="flex justify-end gap-2">
                        ${renderActionButtons(user.role, inv.id)}
                    </div>
                </td>
            </tr>
        `;
    })
    .join("");
}

/**
 * 2. HÀM TẠO NÚT THAO TÁC THEO VAI TRÒ (Role-based Actions)
 */
function renderActionButtons(role, orderId) {
  let buttons = "";

  // Nút dành cho ĐẠI LÝ (Hoặc Admin hiển thị cả 2): Xem chi tiết để Thanh toán
  if (role === "AGENCY" || role === "ADMIN") {
    buttons += `
            <button onclick="navigateInvoice('agency', '${orderId}')" 
                class="px-4 py-2 bg-blue-600 hover:bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase italic transition-all shadow-lg shadow-blue-100">
                <i class="fas fa-file-alt mr-1"></i> Chi tiết & Thanh toán
            </button>`;
  }

  // Nút dành cho KẾ TOÁN (Hoặc Admin hiển thị cả 2): Gửi hóa đơn & Quản lý nợ
  if (role === "ACCOUNTANT" || role === "ADMIN") {
    buttons += `
            <button onclick="navigateInvoice('management', '${orderId}')" 
                class="px-4 py-2 bg-slate-900 hover:bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase italic transition-all shadow-lg">
                <i class="fas fa-cogs mr-1"></i> Quản lý (Kế toán)
            </button>`;
  }

  return buttons;
}

/**
 * 3. HÀM ĐIỀU HƯỚNG CHI TIẾT
 */
function navigateInvoice(type, orderId) {
  // Xác định file đích dựa trên loại nút bấm
  const targetFile =
    type === "agency" ? "invoice_agency.html" : "invoice_management.html";

  // Chuyển hướng kèm theo ID đơn hàng trên URL để các trang sau có thể truy xuất dữ liệu
  window.location.href = `${targetFile}?id=${orderId}`;
}
