/**
 * payment_portal.js - Hệ thống điều phối thanh toán Mina Rubber
 * Chức năng: Đồng bộ giá trị từ Invoice -> Phân loại Trả trước/Ghi nợ
 */

document.addEventListener("DOMContentLoaded", () => {
  initPaymentPortal();

  // Lắng nghe sự kiện storage để cập nhật dữ liệu liên thông
  window.addEventListener("storage", () => {
    initPaymentPortal();
  });
});

function initPaymentPortal() {
  renderPaymentStats();
  renderPaymentActions();
}

/**
 * 1. CẬP NHẬT THỐNG KÊ DASHBOARD (KPI TÀI CHÍNH)
 */
/**
 * 1. CẬP NHẬT THỐNG KÊ DASHBOARD (KPI TÀI CHÍNH)
 * Đã đồng bộ logic tính nợ với payment_postpayment và logic xử lý đơn hàng
 */
function renderPaymentStats() {
  const user = JSON.parse(localStorage.getItem("mina_user"));
  const wallets = JSON.parse(localStorage.getItem("mina_wallets")) || {};
  const orders = JSON.parse(localStorage.getItem("mina_orders")) || [];

  if (!user) return;

  // A. SỐ DƯ VÍ TRẢ TRƯỚC (POOL) - Lấy từ dữ liệu ví cá nhân
  const myWallet = wallets[user.id] || { balance: 0 };

  // B. TỔNG CÔNG NỢ TRẢ SAU (DEBT) - Đồng nhất với payment_postpayment
  // Chỉ tính các đơn: Đúng Đại lý + Đã chốt hình thức Ghi nợ + Chưa thanh toán xong
  const totalDebt = orders
    .filter(
      (o) =>
        String(o.agencyId) === String(user.id) &&
        o.paymentMethod === "POSTPAYMENT" &&
        o.accounting?.status === "DEBT_POSTING"
    )
    .reduce((sum, o) => sum + (Number(o.accounting?.totalAmount) || 0), 0);

  // C. VẬN ĐƠN CHỜ XỬ LÝ TIỀN - Các đơn mới nhận hàng nhưng chưa chốt thanh toán
  // Lọc các đơn: Đúng Đại lý + Đã bàn giao + Đã có hóa đơn duyệt + Chưa bấm chốt thanh toán
  const pendingCount = orders.filter(
    (o) =>
      String(o.agencyId) === String(user.id) &&
      (o.status === "DELIVERED" || o.status === "ARRIVED") &&
      o.accounting?.invoiceSent === true &&
      !o.paymentFinalized
  ).length;

  // D. GÁN DỮ LIỆU LÊN GIAO DIỆN (Sử dụng toLocaleString để hiển thị tiền tệ chuẩn)
  const walletEl = document.getElementById("walletPool");
  const debtEl = document.getElementById("debtPool");
  const pendingEl = document.getElementById("pendingCount");

  if (walletEl) {
    walletEl.innerText = myWallet.balance.toLocaleString("vi-VN") + "đ";
  }

  if (debtEl) {
    debtEl.innerText = totalDebt.toLocaleString("vi-VN") + "đ";

    // Thêm màu sắc cảnh báo nếu có nợ
    if (totalDebt > 0) {
      debtEl.classList.remove("text-slate-800");
      debtEl.classList.add("text-orange-600");
    } else {
      debtEl.classList.remove("text-orange-600");
      debtEl.classList.add("text-slate-800");
    }
  }

  if (pendingEl) {
    pendingEl.innerText = pendingCount + " đơn";
  }
}

/**
 * 2. HIỂN THỊ DANH SÁCH VẬN ĐƠN CHỜ PHÊ DUYỆT TIỀN
 */
function renderPaymentActions() {
  const user = JSON.parse(localStorage.getItem("mina_user"));
  const orders = JSON.parse(localStorage.getItem("mina_orders")) || [];
  const container = document.getElementById("paymentActionBody");

  if (!container || !user) return;

  // Chỉ lấy các đơn của đại lý này đã DELIVERED và đã được KẾ TOÁN DUYỆT HÓA ĐƠN
  const pendingPayments = orders.filter(
    (o) =>
      String(o.agencyId) === String(user.id) &&
      (o.status === "DELIVERED" || o.status === "ARRIVED") &&
      o.accounting?.invoiceSent === true &&
      !o.paymentFinalized
  );

  if (pendingPayments.length === 0) {
    container.innerHTML = `<tr><td colspan="5" class="px-10 py-20 text-center text-[10px] font-black text-slate-400 uppercase italic opacity-30">Không có vận đơn nào chờ xử lý thanh toán</td></tr>`;
    return;
  }

  container.innerHTML = pendingPayments
    .map((o) => {
      // Đồng bộ giá trị: Lấy đúng totalAmount từ Kế toán (Đã gồm thuế, bỏ ship)
      const total = Number(o.accounting?.totalAmount) || 0;

      return `
            <tr class="hover:bg-blue-50/30 transition-all group border-b border-slate-50">
                <td class="px-10 py-6">
                    <div class="font-mono text-blue-600 font-black text-xs italic">#ORD-${
                      o.id
                    }</div>
                    <div class="text-[8px] text-slate-400 font-bold uppercase mt-1 italic tracking-widest">${
                      o.deliveredAt || "Vừa cập bến"
                    }</div>
                </td>
                <td class="px-10 py-6">
                    <div class="font-black text-slate-700 uppercase italic text-[11px] leading-tight">${
                      o.agencyName
                    }</div>
                    <div class="text-[9px] text-slate-400 font-bold uppercase italic mt-1">Sản phẩm: ${
                      o.productName
                    }</div>
                </td>
                <td class="px-10 py-6 text-center">
                    <div class="text-sm font-black text-slate-900 italic tracking-tighter">${total.toLocaleString()}đ</div>
                    <p class="text-[8px] text-blue-400 font-black uppercase mt-1 italic">Giá thực tế đã đối soát</p>
                </td>
                <td class="px-10 py-6">
                    <select id="method-${
                      o.id
                    }" class="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-[10px] font-black uppercase italic outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer">
                        <option value="PREPAYMENT">Khấu trừ Ví Trả trước</option>
                        <option value="POSTPAYMENT">Ghi nợ vào Sổ trả sau</option>
                    </select>
                </td>
                <td class="px-10 py-6 text-right">
                    <button onclick="finalizeTransaction('${o.id}')" 
                        class="bg-slate-900 text-white px-6 py-3 rounded-2xl text-[9px] font-black uppercase italic hover:bg-blue-600 shadow-xl active:scale-95 transition-all">
                        Hoàn tất chốt tiền
                    </button>
                </td>
            </tr>`;
    })
    .join("");
}

/**
 * 3. XỬ LÝ CHỐT THANH TOÁN (TRỪ VÍ HOẶC GHI NỢ)
 * Chức năng: Cập nhật Ledger, Trạng thái Kế toán và Chuyển hướng Dashboard
 */
function finalizeTransaction(orderId) {
  const method = document.getElementById(`method-${orderId}`).value;
  let orders = JSON.parse(localStorage.getItem("mina_orders")) || [];
  let wallets = JSON.parse(localStorage.getItem("mina_wallets")) || {};

  const orderIdx = orders.findIndex((o) => String(o.id) === String(orderId));
  if (orderIdx === -1) return;

  const order = orders[orderIdx];
  const totalAmount = Number(order.accounting?.totalAmount) || 0;
  const agencyId = order.agencyId;

  if (method === "PREPAYMENT") {
    // NGHIỆP VỤ TRẢ TRƯỚC: Khấu trừ số dư ví thực tế
    const wallet = wallets[agencyId];

    if (!wallet || wallet.balance < totalAmount) {
      alert(
        `GIAO DỊCH THẤT BẠI: Ví trả trước không đủ số dư để thanh toán đơn này!`
      );
      return;
    }

    // Thực hiện khấu trừ tiền trong ví
    wallet.balance -= totalAmount;
    wallet.history = wallet.history || [];
    wallet.history.unshift({
      trans_id: "PAY-" + Date.now(),
      type: "ORDER_PAYMENT",
      amount: -totalAmount,
      orderId: orderId,
      date: new Date().toLocaleString("vi-VN"),
    });

    // Cập nhật trạng thái sang PAID (Đã thu tiền thực tế) để Admin Dashboard tính doanh thu
    order.accounting.status = "PAID";
    order.paymentMethod = "WALLET";
  } else {
    // NGHIỆP VỤ TRẢ SAU: Chuyển sang ghi nhận nợ chính thức
    order.accounting.status = "DEBT_POSTING"; // Trạng thái để Admin Dashboard tính vào Công nợ phải thu
    order.paymentMethod = "POSTPAYMENT";

    // Ghi chú hạn nợ (Scenario 5.3)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 15);
    order.paymentDueDate = dueDate.toLocaleDateString("vi-VN");
  }

  // Đánh dấu hoàn tất toàn bộ quy trình thanh toán cho vận đơn
  order.paymentFinalized = true;
  order.paymentDate = new Date().toLocaleString("vi-VN");

  // LƯU DỮ LIỆU ĐỒNG BỘ
  localStorage.setItem("mina_orders", JSON.stringify(orders));
  localStorage.setItem("mina_wallets", JSON.stringify(wallets));

  // CẬP NHẬT SỔ CÁI (LEDGER) ĐẠI LÝ ĐỂ ADMIN_DASHBOARD TRUY XUẤT CÔNG NỢ
  const ledgerKey = `mina_ledger_${agencyId}`;
  let ledger = JSON.parse(localStorage.getItem(ledgerKey)) || [];
  ledger.unshift({
    type: method === "PREPAYMENT" ? "PAYMENT_COMPLETE" : "DEBT_RECORD",
    amount: method === "PREPAYMENT" ? -totalAmount : totalAmount, // Trả trước thì trừ nợ, Ghi nợ thì tăng nợ
    timestamp: new Date().toLocaleString("vi-VN"),
    content: `Xác nhận thanh toán đơn #${orderId} (${
      method === "PREPAYMENT" ? "Ví trả trước" : "Ghi nợ trả sau"
    })`,
  });
  localStorage.setItem(ledgerKey, JSON.stringify(ledger));

  alert(
    "Hệ thống: Giao dịch hoàn tất. Đang chuyển hướng về Cổng thông tin Kế toán..."
  );

  // Xóa session chờ nếu có
  sessionStorage.removeItem("current_pending_payment");

  // PHÁT SỰ KIỆN STORAGE ĐỂ ADMIN DASHBOARD CẬP NHẬT BIỂU ĐỒ NGAY LẬP TỨC
  window.dispatchEvent(new Event("storage"));

  // CHUYỂN HƯỚNG VỀ ACCOUNTING_PORTAL (Thư mục portal của Kế toán)
  setTimeout(() => {
    window.location.href = "../invoice/invoice_portal.html";
  }, 1000);
}
