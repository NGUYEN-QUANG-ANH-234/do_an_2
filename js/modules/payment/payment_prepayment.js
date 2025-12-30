/**
 * payment_prepayment.js - Quản lý Quỹ trả trước Đại lý
 * Chức năng: Nạp quỹ -> Theo dõi số dư -> Đồng bộ Khía cạnh Tài chính
 */

document.addEventListener("DOMContentLoaded", () => {
  initPrepaymentPage();

  // Sự kiện nạp tiền
  const depositForm = document.getElementById("depositForm");
  if (depositForm) {
    depositForm.addEventListener("submit", handleDeposit);
  }

  // Sự kiện tìm kiếm
  const walletSearch = document.getElementById("walletSearch");
  if (walletSearch) {
    walletSearch.addEventListener("input", (e) => {
      renderWalletTable(e.target.value.toLowerCase());
    });
  }

  // Tự động cập nhật khi dữ liệu thay đổi từ tab khác
  window.addEventListener("storage", (e) => {
    if (e.key === "mina_wallets" || e.key === "mina_agencies") {
      initPrepaymentPage();
    }
  });
});

function initPrepaymentPage() {
  loadAgencyDropdown();
  renderWalletStats();
  renderWalletTable();
}

/**
 * 1. NẠP DANH SÁCH ĐẠI LÝ VÀO DROPDOWN
 * Sửa lỗi: Kiểm tra đa luồng ID để tránh undefined
 */
function loadAgencyDropdown() {
  const agencies = JSON.parse(localStorage.getItem("mina_agencies")) || [];
  const select = document.getElementById("depositAgency");
  if (!select) return;

  select.innerHTML =
    '<option value="">-- CHỌN ĐẠI LÝ --</option>' +
    agencies
      .map((a) => {
        // Kiểm tra đa luồng ID để tránh undefined
        const actualId = a.id || a.agency_id;
        // Kiểm tra đa luồng Tên để tránh không hiển thị tên
        const actualName = a.name || a.agency_name || "Đại lý chưa đặt tên";

        return `<option value="${actualId}">${actualName} (Mã: ${actualId})</option>`;
      })
      .join("");
}

/**
 * 2. CẬP NHẬT CÁC CHỈ SỐ KPI TÀI CHÍNH (BSC 5.1)
 * Chức năng: Tính toán tổng quỹ, số ví hoạt động và biến động dòng tiền trong ngày
 */
function renderWalletStats() {
  const wallets = JSON.parse(localStorage.getItem("mina_wallets")) || {};

  let totalPool = 0;
  let activeCount = 0;
  let todayTopup = 0;

  // Lấy ngày hiện tại chuẩn ISO để so sánh chính xác
  const now = new Date();
  const todayStr = now.toLocaleDateString("vi-VN");

  Object.values(wallets).forEach((w) => {
    // A. Cộng dồn tổng số dư khả dụng (Pool)
    const balance = Number(w.balance) || 0;
    totalPool += balance;

    // B. Đếm số ví có số dư dương (Ví đang hoạt động)
    if (balance > 0) activeCount++;

    // C. Tính tổng tiền nạp trong ngày
    if (w.history && Array.isArray(w.history)) {
      const dailySum = w.history
        .filter((h) => {
          if (!h.date || h.type !== "TOPUP") return false;
          // Tách lấy phần ngày để so sánh, bỏ qua phần giờ
          const recordDate = h.date.split(" ")[0];
          return recordDate === todayStr;
        })
        .reduce((sum, h) => sum + (Number(h.amount) || 0), 0);

      todayTopup += dailySum;
    }
  });

  // D. HIỂN THỊ LÊN GIAO DIỆN (Với xử lý an toàn ID)
  const elTotal = document.getElementById("totalDepositBalance");
  const elActive = document.getElementById("activeWalletCount");
  const elRecent = document.getElementById("recentTopupCount");

  if (elTotal) {
    elTotal.innerText = totalPool.toLocaleString("vi-VN") + "đ";
  }

  if (elActive) {
    elActive.innerText = activeCount.toLocaleString("vi-VN");
  }

  if (elRecent) {
    elRecent.innerText = todayTopup.toLocaleString("vi-VN") + "đ";

    // Thêm hiệu ứng màu sắc nếu có nạp tiền mới trong ngày
    if (todayTopup > 0) {
      elRecent.classList.remove("text-slate-800");
      elRecent.classList.add("text-green-600");
    }
  }
}

/**
 * 3. HIỂN THỊ BẢNG THEO DÕI SỐ DƯ
 * Sửa lỗi: Khắc phục hiển thị 'undefined' bằng cách kiểm tra thuộc tính id/agency_id
 */
function renderWalletTable(filter = "") {
  const wallets = JSON.parse(localStorage.getItem("mina_wallets")) || {};
  const agencies = JSON.parse(localStorage.getItem("mina_agencies")) || [];
  const container = document.getElementById("walletTableBody");
  if (!container) return;

  let displayAgencies = agencies;
  if (filter) {
    displayAgencies = agencies.filter((a) =>
      a.name.toLowerCase().includes(filter)
    );
  }

  if (displayAgencies.length === 0) {
    container.innerHTML = `<tr><td colspan="5" class="p-10 text-center text-slate-400 italic">Không tìm thấy đại lý phù hợp</td></tr>`;
    return;
  }

  container.innerHTML = displayAgencies
    .map((a) => {
      // GIẢI PHÁP SỬA LỖI UNDEFINED: Kiểm tra mọi thuộc tính ID có thể có
      const actualId = a.id || a.agency_id || "N/A";
      const wallet = wallets[actualId] || { balance: 0, history: [] };

      const totalDeposit = (wallet.history || [])
        .filter((h) => h.type === "TOPUP")
        .reduce((sum, h) => sum + (Number(h.amount) || 0), 0);

      const balance = Number(wallet.balance) || 0;

      return `
            <tr class="hover:bg-slate-50 transition-all border-b border-slate-50 group">
                <td class="px-10 py-6">
                    <div class="font-black text-slate-700 uppercase italic text-xs leading-none">${
                      a.name
                    }</div>
                    <div class="text-[9px] text-slate-400 mt-2 font-bold uppercase tracking-widest">MÃ ĐẠI LÝ: ${actualId}</div>
                </td>
                <td class="px-10 py-6">
                    <div class="text-sm font-black text-indigo-600">${balance.toLocaleString()}đ</div>
                </td>
                <td class="px-10 py-6">
                    <div class="text-xs font-bold text-slate-400 italic">${totalDeposit.toLocaleString()}đ</div>
                </td>
                <td class="px-10 py-6">
                    <span class="px-3 py-1 rounded-full text-[8px] font-black uppercase italic border 
                        ${
                          balance > 0
                            ? "bg-green-50 text-green-600 border-green-200"
                            : "bg-slate-100 text-slate-400 border-slate-200"
                        }">
                        ${balance > 0 ? "Đủ hạn mức" : "Cần nạp quỹ"}
                    </span>
                </td>
                <td class="px-10 py-6 text-right">
                    <button onclick="viewWalletHistory('${actualId}')" class="p-2 hover:text-indigo-600 transition-all active:scale-90">
                        <i class="fas fa-history text-sm"></i>
                    </button>
                </td>
            </tr>`;
    })
    .join("");
}

/**
 * 4. XỬ LÝ LỆNH NẠP TIỀN (BSC 5.3 - Scenario nạp quỹ)
 */
function handleDeposit(e) {
  e.preventDefault();

  const agencyId = document.getElementById("depositAgency").value;
  const amountInput = document.getElementById("depositAmount").value;
  const amount = parseFloat(amountInput);
  const note = document.getElementById("depositNote").value;

  if (!agencyId || isNaN(amount) || amount <= 0) {
    alert("Vui lòng chọn Đại lý thụ hưởng và nhập số tiền nạp hợp lệ!");
    return;
  }

  let wallets = JSON.parse(localStorage.getItem("mina_wallets")) || {};

  // Khởi tạo cấu trúc ví nếu chưa có
  if (!wallets[agencyId]) {
    wallets[agencyId] = { balance: 0, history: [] };
  }

  // Thực hiện cộng tiền vào "Pool" (Khía cạnh tài chính 5.1)
  wallets[agencyId].balance = (Number(wallets[agencyId].balance) || 0) + amount;
  wallets[agencyId].history.unshift({
    trans_id: "TOP-" + Date.now(),
    type: "TOPUP",
    amount: amount,
    note: note,
    date: new Date().toLocaleString("vi-VN"),
  });

  localStorage.setItem("mina_wallets", JSON.stringify(wallets));

  // Ghi log vào Ledger để đồng bộ công nợ
  const ledgerKey = `mina_ledger_${agencyId}`;
  let ledger = JSON.parse(localStorage.getItem(ledgerKey)) || [];
  ledger.unshift({
    type: "TOPUP",
    amount: amount,
    timestamp: new Date().toLocaleString("vi-VN"),
    content: `Nạp tiền quỹ trả trước: ${note || "Không có ghi chú"}`,
  });
  localStorage.setItem(ledgerKey, JSON.stringify(ledger));

  alert(
    `Nạp quỹ thành công cho Đại lý mã: ${agencyId}\nSố tiền: ${amount.toLocaleString()}đ`
  );

  e.target.reset();
  initPrepaymentPage();
  window.dispatchEvent(new Event("storage"));
}

/**
 * HÀM XEM LỊCH SỬ VÍ (DÙNG ĐỂ ĐỐI SOÁT)
 */
function viewWalletHistory(agencyId) {
  // Logic này bạn có thể mở modal hoặc chuyển sang trang payment_history.html?id=...
  console.log("Xem lịch sử cho đại lý: ", agencyId);
  alert(
    `Đang truy xuất lịch sử giao dịch cho mã ${agencyId}. Tính năng này đang được cập nhật.`
  );
}
