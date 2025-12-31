/**
 * invoice_management.js - Sửa lỗi hiển thị giá 0đ
 */

document.addEventListener("DOMContentLoaded", () => {
  loadManagementTable();
  updateCounters();

  const searchInput = document.getElementById("managementSearch");
  if (searchInput) {
    searchInput.addEventListener("input", (e) =>
      loadManagementTable(e.target.value.toLowerCase())
    );
  }
});

// 1. Tải danh sách vận đơn (Giữ nguyên)
function loadManagementTable(filter = "") {
  const orders = JSON.parse(localStorage.getItem("mina_orders")) || [];
  const container = document.getElementById("managementTableBody");
  if (!container) return;

  let displayOrders = orders.filter(
    (o) => o.status === "DELIVERED" || o.status === "ARRIVED"
  );
  if (filter)
    displayOrders = displayOrders.filter((o) =>
      o.agencyName.toLowerCase().includes(filter)
    );

  if (displayOrders.length === 0) {
    container.innerHTML = `<tr><td colspan="5" class="p-20 text-center italic opacity-30 text-[10px] font-black uppercase">Không có vận đơn chờ đối soát</td></tr>`;
    return;
  }

  container.innerHTML = displayOrders
    .map((o) => {
      const isSent = o.accounting?.invoiceSent === true;
      return `
            <tr class="hover:bg-slate-50 transition-all border-b border-slate-50 group">
                <td class="px-8 py-5 text-blue-600 font-black italic">#${
                  o.id
                }</td>
                <td class="px-8 py-5 uppercase font-black text-slate-700">${
                  o.agencyName
                }</td>
                <td class="px-8 py-5 text-slate-500 font-bold italic">${
                  o.deliveredAt || "Vừa cập bến"
                }</td>
                <td class="px-8 py-5 text-center">
                    <span class="px-4 py-1.5 rounded-full text-[9px] font-black italic border 
                        ${
                          isSent
                            ? "bg-green-50 text-green-600 border-green-200"
                            : "bg-orange-50 text-orange-600 border-orange-200"
                        }">
                        ${isSent ? "ĐÃ PHÁT HÀNH" : "CHỜ ĐỐI SOÁT"}
                    </span>
                </td>
                <td class="px-8 py-5 text-right">
                    <button onclick="openInvoiceModal('${o.id}')" 
                        class="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase italic hover:bg-blue-600 shadow-lg transition-all">
                        <i class="fas fa-file-signature mr-1"></i> Xem chi tiết
                    </button>
                </td>
            </tr>`;
    })
    .join("");
}

// 2. Hàm mở Modal - SỬA LỖI LẤY GIÁ THỰC TẾ
function openInvoiceModal(orderId) {
  const orders = JSON.parse(localStorage.getItem("mina_orders")) || [];
  const order = orders.find((o) => String(o.id) === String(orderId));
  if (!order) return;

  /** * SỬA LỖI 0đ: Kiểm tra đa luồng thuộc tính giá
   * 1. Thử lấy từ 'price' (bản đồng bộ mới)
   * 2. Nếu không có, thử lấy từ 'product_price'
   * 3. Nếu vẫn không có, lấy 'totalAmount' chia cho 'quantity'
   */
  const quantity = Number(order.quantity) || 1;
  let realPrice = Number(order.price) || Number(order.product_price) || 0;

  if (realPrice === 0 && order.totalAmount) {
    realPrice = Number(order.totalAmount) / quantity;
  }

  const subTotal = quantity * realPrice;
  const tax = subTotal * 0.1;
  const totalFinal = subTotal + tax;

  const modal = document.getElementById("invoiceModal");
  const content = document.getElementById("modalContent");
  const footer = document.getElementById("modalFooter");

  content.innerHTML = `
        <div class="invoice-container bg-white overflow-hidden">
            <div class="bg-slate-900 p-10 text-white flex justify-between items-start rounded-t-[30px]">
                <div>
                    <div class="flex items-center gap-3 mb-6">
                        <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-1 shadow-inner">
                            <img src="../../assets/img/123.ico" class="w-7 h-7" alt="Logo" />
                        </div>
                        <div>
                            <h1 class="text-xl font-black italic tracking-tighter leading-none uppercase">MINA RUBBER</h1>
                            <p class="text-[8px] uppercase font-bold tracking-[0.3em] opacity-50 mt-1">Finance Excellence</p>
                        </div>
                    </div>
                    <div class="text-[10px] space-y-1 opacity-70 font-medium italic">
                        <p><i class="fas fa-building mr-2 text-blue-400"></i> Công ty CP Cao su Mina Hà Nội</p>
                        <p><i class="fas fa-envelope mr-2 text-blue-400"></i> finance@minarubber.vn</p>
                    </div>
                </div>
                <div class="text-right">
                    <h2 class="text-5xl font-black opacity-10 uppercase tracking-tighter leading-none">INVOICE</h2>
                    <div class="mt-4">
                        <p class="text-sm font-black text-blue-400 uppercase italic">Mã số: #INV-${
                          order.id
                        }</p>
                        <p class="text-[9px] font-bold opacity-50 uppercase mt-1">Ngày lập: ${
                          order.deliveredAt || order.createdAt
                        }</p>
                    </div>
                </div>
            </div>

            <div class="p-10 grid grid-cols-2 gap-10 border-b border-slate-50 bg-slate-50/30">
                <div>
                    <h3 class="text-[9px] font-black uppercase text-slate-400 mb-3 tracking-widest italic">Đại lý đối soát</h3>
                    <p class="text-lg font-black text-slate-800 uppercase italic leading-none">${
                      order.agencyName
                    }</p>
                    <p class="text-[10px] text-slate-500 mt-2 font-bold uppercase italic tracking-tight">Giao tới: ${
                      order.deliveryAddress || "Địa chỉ đăng ký đại lý"
                    }</p>
                </div>
                <div class="text-right flex flex-col items-end">
                    <h3 class="text-[9px] font-black uppercase text-slate-400 mb-3 tracking-widest italic">Giá trị quyết toán thực</h3>
                    <p class="text-3xl font-black text-blue-600 tracking-tighter leading-none">${totalFinal.toLocaleString()}đ</p>
                </div>
            </div>

            <div class="p-10">
                <table class="w-full text-left border-collapse mb-8">
                    <thead>
                        <tr class="text-[10px] font-black uppercase text-slate-400 border-b-2 border-slate-900 pb-3">
                            <th class="py-4">Mô tả sản phẩm / Quy cách</th>
                            <th class="py-4 text-center">Khối lượng</th>
                            <th class="py-4 text-right">Đơn giá thật</th>
                            <th class="py-4 text-right">Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody class="text-[11px] font-bold divide-y divide-slate-50">
                        <tr>
                            <td class="py-5 font-black uppercase">${
                              order.productName
                            }</td>
                            <td class="py-5 text-center">${quantity} cái</td>
                            <td class="py-5 text-right">${realPrice.toLocaleString()} đ</td>
                            <td class="py-5 text-right font-black text-slate-800">${subTotal.toLocaleString()} đ</td>
                        </tr>
                    </tbody>
                </table>

                <div class="flex justify-end pt-6 border-t border-slate-100">
                    <div class="w-64 space-y-2 text-[10px] font-black uppercase italic">
                        <div class="flex justify-between text-slate-400"><span>Giá trị hàng hóa:</span> <span class="text-slate-800">${subTotal.toLocaleString()}đ</span></div>
                        <div class="flex justify-between text-slate-400 border-b border-slate-100 pb-2"><span>Thuế VAT (10%):</span> <span class="text-slate-800">${tax.toLocaleString()}đ</span></div>
                        <div class="flex justify-between items-center pt-2 text-blue-600">
                            <span class="text-[11px]">TỔNG PHẢI THU:</span> 
                            <span class="text-xl tracking-tighter">${totalFinal.toLocaleString()}đ</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="px-10 pb-10 grid grid-cols-2 gap-10 mt-6 opacity-40">
                <div class="text-center">
                    <p class="text-[8px] font-black uppercase italic text-slate-400 mb-12 italic">Đại diện khách hàng</p>
                    <div class="border-b border-slate-200 w-32 mx-auto"></div>
                </div>
                <div class="text-center">
                    <p class="text-[8px] font-black uppercase italic text-slate-400 mb-12 italic">Kế toán Mina</p>
                    <div class="border-b border-slate-200 w-32 mx-auto"></div>
                </div>
            </div>
        </div>
    `;

  const isSent = order.accounting?.invoiceSent;
  footer.innerHTML = isSent
    ? `<button onclick="window.print()" class="bg-slate-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase italic shadow-xl transition-all hover:bg-blue-600"><i class="fas fa-print mr-2"></i> In bản đối soát</button>`
    : `<button onclick="confirmAndSendInModal('${order.id}', ${totalFinal})" class="bg-blue-600 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase italic hover:bg-slate-900 transition-all shadow-xl"><i class="fas fa-check-double mr-2"></i> Phê duyệt & Gửi hóa đơn</button>`;

  modal.classList.remove("hidden");
  modal.classList.add("active");
}

// 3. Xử lý phê duyệt (Giữ nguyên)
function confirmAndSendInModal(orderId, finalAmount) {
  if (!confirm(`Xác nhận đối soát hoàn tất đơn #${orderId}?`)) return;

  let orders = JSON.parse(localStorage.getItem("mina_orders")) || [];
  const idx = orders.findIndex((o) => String(o.id) === String(orderId));

  if (idx !== -1) {
    orders[idx].totalAmount = finalAmount;
    orders[idx].accounting = {
      invoiceSent: true,
      status: "AWAITING_PAYMENT",
      totalAmount: finalAmount,
      sentAt: new Date().toLocaleString("vi-VN"),
    };
    localStorage.setItem("mina_orders", JSON.stringify(orders));

    const key = `mina_ledger_${orders[idx].agencyId}`;
    let ledger = JSON.parse(localStorage.getItem(key)) || [];
    ledger.unshift({
      type: "INVOICE",
      amount: finalAmount,
      timestamp: new Date().toLocaleString("vi-VN"),
      content: `Hóa đơn vận đơn #${orderId}`,
    });
    localStorage.setItem(key, JSON.stringify(ledger));

    alert("Thành công: Hóa đơn đã được phát hành.");
    closeInvoiceModal();
    loadManagementTable();
    updateCounters();
    window.dispatchEvent(new Event("storage"));
  }
}

function closeInvoiceModal() {
  const modal = document.getElementById("invoiceModal");
  modal.classList.add("hidden");
  modal.classList.remove("active");
}

function updateCounters() {
  const orders = JSON.parse(localStorage.getItem("mina_orders")) || [];
  const pending = orders.filter(
    (o) =>
      (o.status === "DELIVERED" || o.status === "ARRIVED") &&
      !o.accounting?.invoiceSent
  ).length;
  const issued = orders.filter(
    (o) => o.accounting?.invoiceSent === true
  ).length;
  const pEl = document.getElementById("pendingApprovalCount");
  const iEl = document.getElementById("issuedInvoiceCount");
  if (pEl) pEl.innerText = pending;
  if (iEl) iEl.innerText = issued;
}
