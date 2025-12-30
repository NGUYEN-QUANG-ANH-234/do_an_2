/**
 * payment_postpayment.js - Hệ thống Quản lý Công nợ (Góc nhìn Đại lý)
 * Chức năng: Theo dõi nợ cá nhân, Cảnh báo quá hạn và Thanh toán
 */

document.addEventListener("DOMContentLoaded", () => {
  initAgencyPostpaidPage();

  // Lắng nghe sự kiện tìm kiếm đơn nợ
  const debtSearch = document.getElementById("debtSearch");
  if (debtSearch) {
    debtSearch.addEventListener("input", (e) => {
      renderAgencyDebtList(e.target.value.toLowerCase());
    });
  }

  // Tự động cập nhật khi có thay đổi dữ liệu từ tab khác
  window.addEventListener("storage", () => initAgencyPostpaidPage());
});

function initAgencyPostpaidPage() {
  // Lấy thông tin đại lý đang đăng nhập từ hệ thống
  const user = JSON.parse(localStorage.getItem("mina_user"));
  if (!user) {
    console.error("Hệ thống: Không tìm thấy thông tin đại lý!");
    return;
  }

  renderAgencyDebtStats(user.id);
  renderAgencyDebtList("", user.id);
}

/**
 * 1. TỔNG HỢP KPIs CÔNG NỢ ĐẠI LÝ (BSC 5.1)
 */
function renderAgencyDebtStats(agencyId) {
  const orders = JSON.parse(localStorage.getItem("mina_orders")) || [];
  const now = new Date();

  let myTotalDebt = 0;
  let myOverdueCount = 0;
  let nearestDueDate = null;

  // Lọc các đơn nợ của chính đại lý này
  orders.forEach((o) => {
    if (
      String(o.agencyId) === String(agencyId) &&
      o.accounting?.status === "DEBT_POSTING"
    ) {
      const amount = Number(o.accounting.totalAmount) || 0;
      myTotalDebt += amount;

      if (o.paymentDueDate) {
        const parts = o.paymentDueDate.split("/");
        const dueDate = new Date(parts[2], parts[1] - 1, parts[0]);

        // Kiểm tra trạng thái quá hạn (Scenario 5.3)
        if (dueDate < now) myOverdueCount++;

        // Xác định ngày phải trả tiền gần nhất
        if (!nearestDueDate || dueDate < nearestDueDate) {
          nearestDueDate = dueDate;
        }
      }
    }
  });

  // Hiển thị lên Dashboard đại lý
  const debtEl = document.getElementById("myTotalDebt");
  const overdueEl = document.getElementById("myOverdueCount");
  const dateEl = document.getElementById("nextDueDate");
  const overdueCard = document.getElementById("overdueCard");

  if (debtEl) debtEl.innerText = myTotalDebt.toLocaleString() + "đ";
  if (overdueEl) overdueEl.innerText = myOverdueCount + " đơn";
  if (dateEl)
    dateEl.innerText = nearestDueDate
      ? nearestDueDate.toLocaleDateString("vi-VN")
      : "Sạch nợ";

  // Hiệu ứng cảnh báo nếu có nợ quá hạn
  if (myOverdueCount > 0 && overdueCard) {
    overdueCard.classList.add("pulse-red", "bg-red-50");
  } else if (overdueCard) {
    overdueCard.classList.remove("pulse-red", "bg-red-50");
  }
}

/**
 * 2. HIỂN THỊ DANH SÁCH CHI TIẾT CÁC ĐƠN NỢ
 */
function renderAgencyDebtList(filter = "") {
  const user = JSON.parse(localStorage.getItem("mina_user"));
  const orders = JSON.parse(localStorage.getItem("mina_orders")) || [];
  const container = document.getElementById("myPostpaidTableBody");

  if (!container || !user) return;

  // Lọc đơn: Đúng mã đại lý + Đang ghi nợ
  let myDebts = orders.filter(
    (o) =>
      String(o.agencyId) === String(user.id) &&
      o.accounting?.status === "DEBT_POSTING"
  );

  // Lọc theo tìm kiếm mã đơn
  if (filter) {
    myDebts = myDebts.filter((o) => o.id.toLowerCase().includes(filter));
  }

  if (myDebts.length === 0) {
    container.innerHTML = `<tr><td colspan="5" class="p-20 text-center opacity-30 italic font-black uppercase text-[10px]">Bạn hiện không có khoản nợ nào cần thanh toán</td></tr>`;
    return;
  }

  container.innerHTML = myDebts
    .map((o) => {
      const parts = o.paymentDueDate.split("/");
      const dueDate = new Date(parts[2], parts[1] - 1, parts[0]);
      const isOverdue = dueDate < new Date();

      return `
            <tr class="hover:bg-orange-50/30 transition-all border-b border-slate-50 group">
                <td class="px-10 py-6">
                    <div class="font-bold text-blue-600 italic">#ORD-${
                      o.id
                    }</div>
                    <div class="text-[9px] text-slate-400 uppercase mt-1 tracking-widest">Mua ngày: ${
                      o.paymentDate || "---"
                    }</div>
                </td>
                <td class="px-10 py-6">
                    <div class="font-black text-slate-700 uppercase italic text-xs leading-none">${
                      o.productName
                    }</div>
                    <div class="text-[8px] text-slate-400 mt-1 font-bold uppercase italic">Sản lượng: ${
                      o.quantity
                    }kg</div>
                </td>
                <td class="px-10 py-6 text-center">
                    <div class="text-sm font-black text-slate-900 tracking-tighter">${(
                      Number(o.accounting?.totalAmount) || 0
                    ).toLocaleString()}đ</div>
                </td>
                <td class="px-10 py-6 text-center">
                    <span class="px-3 py-1 rounded-full text-[9px] font-black italic border 
                        ${
                          isOverdue
                            ? "bg-red-100 text-red-600 border-red-200"
                            : "bg-blue-50 text-blue-600 border-blue-200"
                        }">
                        <i class="fas ${
                          isOverdue
                            ? "fa-exclamation-triangle"
                            : "fa-hourglass-half"
                        } mr-1"></i>
                        Hạn: ${o.paymentDueDate}
                    </span>
                </td>
                <td class="px-10 py-6 text-right">
                    <button onclick="payDebtNow('${o.id}', ${
        o.accounting.totalAmount
      })" 
                        class="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-[9px] font-black uppercase italic hover:bg-blue-600 shadow-lg active:scale-95 transition-all">
                        Thanh toán nợ
                    </button>
                </td>
            </tr>`;
    })
    .join("");
}

/**
 * 3. XỬ LÝ THANH TOÁN NỢ TRỰC TIẾP (Khấu trừ ví ngay lập tức)
 * Đồng bộ Khía cạnh Tài chính (BSC 5.1)
 */
function payDebtNow(orderId, amount) {
  const user = JSON.parse(localStorage.getItem("mina_user"));
  if (!user) return;

  // 1. Lấy dữ liệu ví và đơn hàng hiện tại
  let wallets = JSON.parse(localStorage.getItem("mina_wallets")) || {};
  let orders = JSON.parse(localStorage.getItem("mina_orders")) || [];

  const myWallet = wallets[user.id];
  const balance = myWallet ? Number(myWallet.balance) : 0;

  // 2. Kiểm tra điều kiện thanh toán (Scenario 5.3)
  if (balance < amount) {
    alert(
      `THANH TOÁN THẤT BẠI!\n\n` +
        `Số dư ví hiện tại (${balance.toLocaleString()}đ) không đủ để thanh toán khoản nợ này (${amount.toLocaleString()}đ).\n\n` +
        `Vui lòng nạp thêm tiền vào ví trả trước.`
    );
    return;
  }

  const confirmPay = confirm(
    `XÁC NHẬN THANH TOÁN TRỰC TIẾP\n\n` +
      `Đơn hàng: #ORD-${orderId}\n` +
      `Số tiền: ${amount.toLocaleString()}đ\n` +
      `Số dư ví sau khi trả: ${(balance - amount).toLocaleString()}đ\n\n` +
      `Hệ thống sẽ khấu trừ trực tiếp vào ví của bạn.`
  );

  if (!confirmPay) return;

  // 3. THỰC HIỆN NGHIỆP VỤ TÀI CHÍNH

  // A. Khấu trừ số dư ví
  wallets[user.id].balance = balance - amount;
  wallets[user.id].history = wallets[user.id].history || [];
  wallets[user.id].history.unshift({
    trans_id: "PAY-DEBT-" + Date.now(),
    type: "ORDER_PAYMENT",
    amount: -amount,
    orderId: orderId,
    note: `Thanh toán nợ cho đơn #${orderId}`,
    date: new Date().toLocaleString("vi-VN"),
  });

  // B. Cập nhật trạng thái đơn hàng sang PAID
  const orderIdx = orders.findIndex((o) => String(o.id) === String(orderId));
  if (orderIdx !== -1) {
    orders[orderIdx].accounting.status = "PAID";
    orders[orderIdx].paymentFinalized = true;
    orders[orderIdx].paymentDate = new Date().toLocaleString("vi-VN");
  }

  // C. Ghi Sổ cái (Ledger) để cấn trừ dư nợ đại lý
  const ledgerKey = `mina_ledger_${user.id}`;
  let ledger = JSON.parse(localStorage.getItem(ledgerKey)) || [];
  ledger.unshift({
    type: "DEBT_COLLECTION",
    amount: -amount, // Số âm để triệt tiêu nợ dương trong sổ cái
    timestamp: new Date().toLocaleString("vi-VN"),
    content: `Đại lý tự thanh toán nợ đơn #ORD-${orderId} bằng ví`,
  });

  // 4. LƯU DỮ LIỆU & ĐỒNG BỘ
  localStorage.setItem("mina_wallets", JSON.stringify(wallets));
  localStorage.setItem("mina_orders", JSON.stringify(orders));
  localStorage.setItem(ledgerKey, JSON.stringify(ledger));

  // Phát sự kiện để các tab khác (như Dashboard) cập nhật theo
  window.dispatchEvent(new Event("storage"));

  alert("Thanh toán thành công! Khoản nợ đã được tất toán.");
  initAgencyPostpaidPage(); // Load lại dữ liệu tại chỗ
}
