/**
 * payment_history.js - Trung tâm đối soát giao dịch Mina Rubber
 * Chức năng: Hợp nhất dòng tiền từ Ví và Công nợ
 */

document.addEventListener("DOMContentLoaded", () => {
  initHistoryPage();

  // Sự kiện tìm kiếm và lọc
  document
    .getElementById("historySearch")
    ?.addEventListener("input", () => renderPaymentHistory());
  document
    .getElementById("typeFilter")
    ?.addEventListener("change", () => renderPaymentHistory());

  // Tự động cập nhật khi dữ liệu thay đổi
  window.addEventListener("storage", () => initHistoryPage());
});

function initHistoryPage() {
  updateHistoryStats();
  renderPaymentHistory();
}

/**
 * 1. TỔNG HỢP CHỈ SỐ DASHBOARD TỨC THỜI (BSC 5.1)
 */
function updateHistoryStats() {
  const user = JSON.parse(localStorage.getItem("mina_user"));
  if (!user) return;

  const wallets = JSON.parse(localStorage.getItem("mina_wallets")) || {};
  const myWallet = wallets[user.id] || { balance: 0, history: [] };

  let totalTopup = 0;
  let totalPayment = 0;

  // Tính toán từ lịch sử ví
  (myWallet.history || []).forEach((h) => {
    if (h.type === "TOPUP") totalTopup += Number(h.amount) || 0;
    if (h.type === "ORDER_PAYMENT")
      totalPayment += Math.abs(Number(h.amount) || 0);
  });

  // Cập nhật giao diện
  displayVal("statTotalTopup", totalTopup.toLocaleString() + "đ");
  displayVal("statTotalPayment", totalPayment.toLocaleString() + "đ");
  displayVal(
    "statCurrentBalance",
    (Number(myWallet.balance) || 0).toLocaleString() + "đ"
  );
}

/**
 * 2. TRUY XUẤT VÀ HỢP NHẤT DỮ LIỆU GIAO DỊCH
 */
function renderPaymentHistory() {
  const user = JSON.parse(localStorage.getItem("mina_user"));
  if (!user) return;

  const wallets = JSON.parse(localStorage.getItem("mina_wallets")) || {};
  const ledgerKey = `mina_ledger_${user.id}`;
  const ledger = JSON.parse(localStorage.getItem(ledgerKey)) || [];

  // Nguồn 1: Giao dịch từ Ví Trả trước
  const walletData = (wallets[user.id]?.history || []).map((h) => ({
    date: h.date,
    id: h.trans_id || "TRX-" + Date.now(),
    type: h.type,
    amount: Number(h.amount) || 0,
    note:
      h.note ||
      (h.type === "TOPUP" ? "Nạp tiền vào tài khoản" : "Thanh toán đơn hàng"),
    ref: h.orderId ? `#ORD-${h.orderId}` : "N/A",
  }));

  // Nguồn 2: Giao dịch từ Sổ nợ (Chỉ lấy các đơn Ghi nợ mới để đối soát nợ AR)
  const debtData = ledger
    .filter((l) => l.type === "DEBT_RECORD")
    .map((l) => ({
      date: l.timestamp,
      id: "DEBT-" + Date.now(),
      type: "DEBT_RECORD",
      amount: Number(l.amount) || 0,
      note: l.content || "Ghi nhận nợ đơn hàng",
      ref: "Sổ trả sau",
    }));

  // Hợp nhất và Sắp xếp theo thời gian (Mới nhất lên đầu)
  let combined = [...walletData, ...debtData].sort((a, b) => {
    return parseDateTime(b.date) - parseDateTime(a.date);
  });

  // Áp dụng Bộ lọc
  const searchTerm =
    document.getElementById("historySearch")?.value.toLowerCase() || "";
  const typeFilter = document.getElementById("typeFilter")?.value || "ALL";

  if (typeFilter !== "ALL") {
    combined = combined.filter((h) => h.type === typeFilter);
  }
  if (searchTerm) {
    combined = combined.filter(
      (h) =>
        h.note.toLowerCase().includes(searchTerm) ||
        h.id.toLowerCase().includes(searchTerm)
    );
  }

  renderTable(combined);
}

/**
 * 3. RENDER BẢNG DỮ LIỆU
 */
function renderTable(data) {
  const container = document.getElementById("historyTableBody");
  const emptyState = document.getElementById("emptyState");
  if (!container) return;

  if (data.length === 0) {
    container.innerHTML = "";
    emptyState?.classList.remove("hidden");
    return;
  }

  emptyState?.classList.add("hidden");
  container.innerHTML = data
    .map((h) => {
      const isPositive = h.amount > 0;
      const config = getStatusConfig(h.type);

      return `
            <tr class="history-row border-b border-slate-50">
                <td class="px-10 py-6">
                    <div class="text-[11px] font-bold text-slate-700">${
                      h.date.split(" ")[1] || ""
                    }</div>
                    <div class="text-[9px] text-slate-400 font-medium">${
                      h.date.split(" ")[0]
                    }</div>
                </td>
                <td class="px-10 py-6 font-mono text-[10px] text-indigo-600 font-bold">${
                  h.id
                }</td>
                <td class="px-10 py-6">
                    <span class="px-3 py-1 bg-${config.color}-50 text-${
        config.color
      }-600 border border-${
        config.color
      }-100 rounded-lg text-[9px] font-black uppercase italic">
                        ${config.label}
                    </span>
                </td>
                <td class="px-10 py-6 text-center">
                    <div class="text-xs font-black ${
                      isPositive ? "text-blue-600" : "text-red-600"
                    }">
                        ${isPositive ? "+" : ""}${h.amount.toLocaleString()}đ
                    </div>
                </td>
                <td class="px-10 py-6">
                    <div class="text-[10px] text-slate-600 font-black uppercase italic">${
                      h.note
                    }</div>
                    <div class="text-[8px] text-slate-400 mt-1 font-bold">Tham chiếu: ${
                      h.ref
                    }</div>
                </td>
            </tr>
        `;
    })
    .join("");
}

/**
 * TIỆN ÍCH HỖ TRỢ
 */
function getStatusConfig(type) {
  const mapping = {
    TOPUP: { label: "Nạp Quỹ", color: "blue" },
    ORDER_PAYMENT: { text: "Thanh Toán", label: "Thanh Toán", color: "red" },
    DEBT_RECORD: { label: "Ghi Nợ", color: "orange" },
    DEBT_COLLECTION: { label: "Trả Nợ", color: "green" },
  };
  return mapping[type] || { label: type, color: "slate" };
}

function parseDateTime(dateStr) {
  // Chuyển "dd/mm/yyyy, hh:mm:ss" thành Date object để so sánh
  try {
    const parts = dateStr.split(", ");
    const dateParts = parts[0].split("/");
    return new Date(dateParts[2], dateParts[1] - 1, dateParts[0]);
  } catch (e) {
    return 0;
  }
}

function displayVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.innerText = val;
}

function exportToExcel() {
  alert("Hệ thống: Đang trích xuất nhật ký giao dịch tài chính cá nhân...");
  // Logic export thực tế có thể thêm tại đây
}
