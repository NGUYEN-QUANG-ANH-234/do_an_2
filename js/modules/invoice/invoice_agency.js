/**
 * invoice_agency.js - Cổng thanh toán và quản lý công nợ dành cho Đại lý
 * Chức năng: Xem hóa đơn (Đồng bộ giao diện Kế toán), Đối soát giá trị, Thanh toán trực tuyến
 */

document.addEventListener("DOMContentLoaded", () => {
  renderAgencyInvoices();

  const searchInput = document.getElementById("agencyInvoiceSearch");
  if (searchInput) {
    searchInput.addEventListener("input", (e) =>
      renderAgencyInvoices(e.target.value.toLowerCase())
    );
  }

  window.addEventListener("storage", (e) => {
    if (e.key === "mina_orders") renderAgencyInvoices();
  });
});

/**
 * 1. RENDER DANH SÁCH HÓA ĐƠN RIÊNG BIỆT
 */
function renderAgencyInvoices(filter = "") {
  const user = JSON.parse(localStorage.getItem("mina_user"));
  const orders = JSON.parse(localStorage.getItem("mina_orders")) || [];
  const container = document.getElementById("agencyInvoiceTable");
  const debtEl = document.getElementById("totalAgencyDebt");

  if (!container || !user) return;

  // Lọc: Đúng đại lý + Đã phát hành hóa đơn
  let myInvoices = orders.filter(
    (o) =>
      String(o.agencyId) === String(user.id) &&
      o.accounting?.invoiceSent === true
  );

  // Tính tổng nợ (Các đơn chưa thanh toán)
  const totalDebt = myInvoices
    .filter((i) => i.accounting.status !== "PAID")
    .reduce((sum, i) => sum + (Number(i.accounting.totalAmount) || 0), 0);

  if (debtEl) debtEl.innerText = totalDebt.toLocaleString() + " đ";

  if (filter)
    myInvoices = myInvoices.filter((i) => String(i.id).includes(filter));

  if (myInvoices.length === 0) {
    container.innerHTML = `<tr><td colspan="5" class="p-20 text-center italic opacity-30 text-[10px] font-black uppercase">Chưa có hóa đơn nào</td></tr>`;
    return;
  }

  container.innerHTML = myInvoices
    .map((o) => {
      const isPaid = o.accounting.status === "PAID";
      return `
            <tr class="hover:bg-slate-50 transition-all border-b border-slate-50 group">
                <td class="px-8 py-5 text-blue-600 font-black italic">#INV-${
                  o.id
                }</td>
                <td class="px-8 py-5 uppercase font-black text-slate-700">${
                  o.productName
                }</td>
                <td class="px-8 py-5 text-slate-900 font-black italic">${(
                  Number(o.accounting.totalAmount) || 0
                ).toLocaleString()}đ</td>
                <td class="px-8 py-5 text-center">
                    <span class="px-4 py-1.5 rounded-full text-[9px] font-black italic border 
                        ${
                          isPaid
                            ? "bg-green-50 text-green-600 border-green-200"
                            : "bg-orange-50 text-orange-600 border-orange-200"
                        }">
                        ${isPaid ? "ĐÃ THANH TOÁN" : "CHỜ THANH TOÁN"}
                    </span>
                </td>
                <td class="px-8 py-5 text-right">
                    <button onclick="openInvoiceModal('${o.id}')" 
                        class="px-5 py-2.5 ${
                          isPaid
                            ? "bg-slate-100 text-slate-500"
                            : "bg-slate-900 text-white"
                        } rounded-xl text-[9px] font-black uppercase italic hover:shadow-lg transition-all">
                        ${isPaid ? "Chi tiết" : "Thanh toán"}
                    </button>
                </td>
            </tr>`;
    })
    .join("");
}

/**
 * 2. MỞ CHI TIẾT - ĐỒNG BỘ GIAO DIỆN VÀ TÍNH GIÁ
 */
function openInvoiceModal(orderId) {
  const orders = JSON.parse(localStorage.getItem("mina_orders")) || [];
  const order = orders.find((o) => String(o.id) === String(orderId));
  if (!order) return;

  // LOGIC TÍNH GIÁ ĐỒNG BỘ
  const quantity = Number(order.quantity) || 1;
  let realPrice = Number(order.price) || Number(order.product_price) || 0;

  // Nếu giá bằng 0, tính ngược từ totalAmount (trừ thuế 10%)
  if (realPrice === 0 && order.totalAmount) {
    realPrice = Number(order.totalAmount) / (quantity * 1.1);
  }

  const subTotal = quantity * realPrice;
  const tax = subTotal * 0.1;
  const totalFinal = Number(order.accounting.totalAmount) || subTotal + tax;

  const modal = document.getElementById("invoiceModal");
  const content = document.getElementById("modalContent");
  const footer = document.getElementById("modalFooter");

  // Gán dữ liệu thật vào biểu mẫu (Đồng bộ với invoice_management)
  content.innerHTML = `
        <div class="invoice-container bg-white overflow-hidden">
            <div class="bg-slate-900 p-10 text-white flex justify-between items-start">
                <div>
                    <div class="flex items-center gap-3 mb-6">
                        <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-1">
                            <img src="../../assets/img/123.ico" class="w-7 h-7" alt="Logo" />
                        </div>
                        <div>
                            <h1 class="text-xl font-black italic tracking-tighter leading-none uppercase">MINA RUBBER</h1>
                            <p class="text-[8px] uppercase font-bold tracking-[0.3em] opacity-50 mt-1">Finance Excellence</p>
                        </div>
                    </div>
                    <div class="text-[10px] space-y-1 opacity-70 italic font-medium">
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
                          order.accounting.sentAt
                        }</p>
                    </div>
                </div>
            </div>

            <div class="p-10 grid grid-cols-2 gap-10 border-b border-slate-50 bg-slate-50/30">
                <div>
                    <h3 class="text-[9px] font-black uppercase text-slate-400 mb-3 tracking-widest italic">Đại lý thanh toán</h3>
                    <p class="text-lg font-black text-slate-800 uppercase italic leading-none">${
                      order.agencyName
                    }</p>
                    <p class="text-[10px] text-slate-500 mt-2 font-bold uppercase italic tracking-tight">Địa chỉ: ${
                      order.deliveryAddress || "KCN Quang Minh"
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
                            <th class="py-4">Sản phẩm / Quy cách</th>
                            <th class="py-4 text-center">Khối lượng</th>
                            <th class="py-4 text-right">Đơn giá</th>
                            <th class="py-4 text-right">Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody class="text-[11px] font-bold divide-y divide-slate-50">
                        <tr>
                            <td class="py-5 font-black uppercase">${
                              order.productName
                            }</td>
                            <td class="py-5 text-center">${quantity} kg</td>
                            <td class="py-5 text-right">${realPrice.toLocaleString()} đ</td>
                            <td class="py-5 text-right font-black text-slate-800">${subTotal.toLocaleString()} đ</td>
                        </tr>
                    </tbody>
                </table>

                <div class="flex justify-end pt-6 border-t border-slate-100">
                    <div class="w-64 space-y-2 text-[10px] font-black uppercase italic">
                        <div class="flex justify-between text-slate-400"><span>Tiền hàng hóa:</span> <span class="text-slate-800">${subTotal.toLocaleString()}đ</span></div>
                        <div class="flex justify-between text-slate-400 border-b border-slate-100 pb-2"><span>Thuế VAT (10%):</span> <span class="text-slate-800">${tax.toLocaleString()}đ</span></div>
                        <div class="flex justify-between items-center pt-2 text-blue-600 font-black">
                            <span class="text-[11px]">TỔNG CỘNG:</span> 
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
                    <p class="text-[8px] font-black uppercase italic text-slate-400 mb-12 italic">Kế toán Mina Rubber</p>
                    <div class="border-b border-slate-200 w-32 mx-auto"></div>
                </div>
            </div>
        </div>
    `;

  const isPaid = order.accounting.status === "PAID";
  footer.innerHTML = isPaid
    ? `<button onclick="window.print()" class="bg-slate-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase italic shadow-xl transition-all hover:bg-blue-600"><i class="fas fa-print mr-2"></i> In PDF đối soát</button>`
    : `<button onclick="processPayment('${order.id}', ${totalFinal})" class="bg-blue-600 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase italic hover:bg-slate-900 transition-all shadow-xl"><i class="fas fa-credit-card mr-2"></i> Xác nhận Thanh toán</button>`;

  modal.classList.add("active");
  modal.classList.remove("hidden");
}

/**
 * 3. XỬ LÝ THANH TOÁN & KHẤU TRỪ NỢ
 */
/**
 * Chuyển hướng đại lý từ Hóa đơn sang Cổng xử lý thanh toán thực tế
 * @param {string} orderId - Mã đơn hàng/hóa đơn
 * @param {number} amount - Tổng số tiền cần thanh toán
 */
function processPayment(orderId, amount) {
  // 1. Xác nhận với người dùng trước khi rời trang
  const isConfirm = confirm(
    `Xác nhận thanh toán hóa đơn #INV-${orderId}?\n` +
      `Số tiền: ${amount.toLocaleString()} đ\n\n` +
      `Hệ thống sẽ chuyển bạn đến Cổng thanh toán để tiếp tục.`
  );

  if (!isConfirm) return;

  // 2. Lấy thông tin đơn hàng đầy đủ để truyền sang trang thanh toán
  let orders = JSON.parse(localStorage.getItem("mina_orders")) || [];
  const order = orders.find((o) => String(o.id) === String(orderId));

  if (order) {
    // 3. Lưu thông tin hóa đơn "đang chờ xử lý" vào sessionStorage
    // Việc dùng sessionStorage giúp dữ liệu mất đi khi đóng trình duyệt, tăng tính bảo mật
    const paymentSession = {
      orderId: order.id,
      agencyId: order.agencyId,
      agencyName: order.agencyName,
      productName: order.productName,
      amount: amount,
      createdAt: new Date().toLocaleString("vi-VN"),
    };
    sessionStorage.setItem(
      "current_pending_payment",
      JSON.stringify(paymentSession)
    );

    // 4. Chuyển hướng sang thư mục payment
    // Đường dẫn từ pages/invoice/invoice_agency.html sang pages/payment/payment_portal.html
    window.location.href = "../payment/payment_portal.html";
  } else {
    alert("Lỗi: Không tìm thấy dữ liệu vận đơn để thanh toán!");
  }
}
function closeInvoiceModal() {
  const modal = document.getElementById("invoiceModal");
  modal.classList.add("hidden");
  modal.classList.remove("active");
}
