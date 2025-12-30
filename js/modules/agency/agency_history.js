/**
 * js/modules/agency/agency_history.js
 * Đồng bộ và hiển thị nhật ký biến động chi tiết từ hệ thống Mina Rubber
 */

let currentAgencyId = null;

document.addEventListener("DOMContentLoaded", () => {
  loadContractPortal();
  setupSearch();
});

/**
 * 1. Khởi tạo cổng thông tin và phân quyền hiển thị
 */
function loadContractPortal() {
  const user = JSON.parse(localStorage.getItem("mina_user"));
  if (!user) {
    window.location.href = "/pages/auth/auth_login.html";
    return;
  }

  const contracts = JSON.parse(localStorage.getItem("mina_contracts")) || [];
  const logs = JSON.parse(localStorage.getItem("mina_contract_logs")) || [];
  const agencies = JSON.parse(localStorage.getItem("mina_agencies")) || [];

  if (user.role === "ADMIN" || user.role === "MANAGER") {
    // Quản trị: Xem toàn bộ log hệ thống
    const statusView = document.getElementById("agencyStatusView");
    if (statusView) statusView.classList.add("hidden");
    renderLogs(logs);
  } else if (user.role === "AGENCY") {
    // Đại lý: Tìm mã đại lý dựa trên username hoặc ID liên kết
    const myAgency = agencies.find((a) => a.agency_id === user.id);

    if (myAgency) {
      currentAgencyId = myAgency.agency_id;
      const statusView = document.getElementById("agencyStatusView");
      if (statusView) statusView.classList.remove("hidden");

      // Lọc dữ liệu riêng cho đại lý này
      const myContract = contracts.find((c) => c.agency_id === currentAgencyId);
      const myLogs = logs.filter((l) => l.agency_id === currentAgencyId);

      updateAgencyStatusUI(myContract);
      renderLogs(myLogs);
    } else {
      const body = document.getElementById("myLogBody");
      if (body)
        body.innerHTML = `<tr><td colspan="5" class="px-8 py-10 text-center text-slate-400 italic">Tài khoản đại lý chưa được kích hoạt trên hệ thống.</td></tr>`;
    }
  }
}

/**
 * 2. Hiển thị danh sách nhật ký với định dạng chuyên nghiệp
 */
function renderLogs(logData) {
  const body = document.getElementById("myLogBody");
  if (!body) return;

  if (logData.length === 0) {
    body.innerHTML = `<tr><td colspan="5" class="px-8 py-10 text-center text-slate-400 italic font-medium">Chưa ghi nhận biến động nào.</td></tr>`;
    return;
  }

  // Sắp xếp log mới nhất lên trên đầu
  const sortedLogs = [...logData].sort((a, b) => b.log_id - a.log_id);

  body.innerHTML = sortedLogs
    .map((l) => {
      const statusClass =
        l.new_status === "Active"
          ? "bg-green-100 text-green-600 border-green-200"
          : "bg-orange-100 text-orange-600 border-orange-200";

      // Tự động thêm icon minh họa dựa trên nội dung mô tả
      let iconHtml = '<i class="fas fa-edit text-slate-300 mr-2"></i>';
      const desc = l.change_description.toLowerCase();

      if (desc.includes("địa chỉ") || desc.includes("vị trí")) {
        iconHtml = '<i class="fas fa-map-marker-alt text-blue-400 mr-2"></i>';
      } else if (desc.includes("hợp đồng") || desc.includes("ký kết")) {
        iconHtml = '<i class="fas fa-file-signature text-amber-500 mr-2"></i>';
      } else if (desc.includes("liên hệ") || desc.includes("điện thoại")) {
        iconHtml = '<i class="fas fa-phone-alt text-purple-400 mr-2"></i>';
      }

      return `
            <tr class="hover:bg-slate-50 transition-all border-b border-slate-50 group">
                <td class="px-8 py-5 font-mono text-[11px] text-slate-400 italic">
                    ${l.changed_at}
                </td>
                <td class="px-8 py-5">
                    <span class="px-2 py-1 bg-slate-100 rounded text-slate-600 font-bold text-[10px] border border-slate-200">
                        #${l.agency_id}
                    </span>
                </td>
                <td class="px-8 py-5">
                    <div class="flex items-center gap-2">
                        <span class="text-[9px] font-black text-slate-300 uppercase">${
                          l.old_status || "NONE"
                        }</span>
                        <i class="fas fa-arrow-right text-[8px] text-slate-200"></i>
                        <span class="text-[9px] font-black text-blue-600 uppercase italic">${
                          l.new_status
                        }</span>
                    </div>
                </td>
                <td class="px-8 py-5 text-slate-600 font-medium italic text-xs leading-relaxed">
                    <div class="flex items-start">
                        ${iconHtml}
                        <span class="group-hover:text-slate-900 transition-colors">${
                          l.change_description
                        }</span>
                    </div>
                </td>
                <td class="px-8 py-5 text-right">
                    <span class="px-3 py-1 ${statusClass} text-[9px] font-black rounded-full uppercase border shadow-sm tracking-widest">
                        ${l.new_status}
                    </span>
                </td>
            </tr>
        `;
    })
    .join("");
}

/**
 * 3. Cập nhật Card trạng thái dành cho giao diện Đại lý
 */
function updateAgencyStatusUI(contract) {
  const statusEl = document.getElementById("currentStatus");
  const cardEl = document.getElementById("statusCard");
  const actionArea = document.getElementById("actionArea");
  const noteEl = document.getElementById("systemNote");

  if (!contract) {
    statusEl.innerText = "CHƯA KHỞI TẠO";
    statusEl.className =
      "text-2xl font-black text-slate-300 tracking-tighter italic";
    noteEl.innerText =
      "Hệ thống chưa tìm thấy thông tin hợp đồng của bạn. Vui lòng liên hệ bộ phận hỗ trợ.";
    if (actionArea) actionArea.classList.add("hidden");
    return;
  }

  statusEl.innerText = contract.status.toUpperCase();

  if (contract.status === "Pending") {
    statusEl.className =
      "text-3xl font-black text-orange-600 tracking-tighter italic";
    cardEl.className =
      "bg-white p-8 rounded-3xl shadow-sm border-t-8 border-orange-500 transition-all";
    noteEl.innerText =
      "Hợp đồng đã được soạn thảo. Vui lòng kiểm tra các điều khoản và nhấn KÍCH HOẠT để bắt đầu quyền lợi Đại lý.";
    if (actionArea) actionArea.classList.remove("hidden");
  } else if (contract.status === "Active") {
    statusEl.className =
      "text-3xl font-black text-green-600 tracking-tighter italic";
    cardEl.className =
      "bg-white p-8 rounded-3xl shadow-sm border-t-8 border-green-500 transition-all";
    noteEl.innerText =
      "Trạng thái: HIỆU LỰC. Cảm ơn bạn đã là đối tác của Mina Rubber. Bạn hiện có thể sử dụng đầy đủ các tính năng đặt hàng và vận chuyển.";
    if (actionArea) actionArea.classList.add("hidden");
  }
}

/**
 * 4. Nghiệp vụ kích hoạt hợp đồng (Từ phía Đại lý)
 */
window.activateContract = function () {
  if (!currentAgencyId) return;

  if (
    confirm(
      `Xác nhận: Bạn đã đọc kỹ điều khoản và muốn kích hoạt hợp đồng điện tử cho mã đại lý #${currentAgencyId}?`
    )
  ) {
    let contracts = JSON.parse(localStorage.getItem("mina_contracts")) || [];
    let logs = JSON.parse(localStorage.getItem("mina_contract_logs")) || [];

    const idx = contracts.findIndex((c) => c.agency_id === currentAgencyId);
    if (idx !== -1) {
      const oldStatus = contracts[idx].status;
      contracts[idx].status = "Active";

      // Tạo log biến động đồng bộ với format của agency_list.js
      const newLog = {
        log_id: Date.now(),
        agency_id: currentAgencyId,
        old_status: oldStatus,
        new_status: "Active",
        change_description:
          "Đại lý đã tự xác nhận điều khoản và kích hoạt hợp đồng thành công qua Portal.",
        changed_at: new Date().toLocaleString("vi-VN"),
      };

      logs.push(newLog);

      localStorage.setItem("mina_contracts", JSON.stringify(contracts));
      localStorage.setItem("mina_contract_logs", JSON.stringify(logs));

      // Hiển thị thông báo Toast nếu có hàm showToast từ main.js
      if (window.showToast) {
        showToast("Hợp đồng của bạn đã có hiệu lực!", "success");
      } else {
        alert("Kích hoạt thành công!");
      }

      loadContractPortal();
    }
  }
};

/**
 * 5. Xử lý tìm kiếm log nhanh (Admin/Manager)
 */
function setupSearch() {
  const input = document.getElementById("logSearch");
  if (!input) return;

  input.addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase().trim();
    const allLogs =
      JSON.parse(localStorage.getItem("mina_contract_logs")) || [];

    const user = JSON.parse(localStorage.getItem("mina_user"));
    if (user.role === "AGENCY") {
      allLogs = allLogs.filter((l) => l.agency_id === user.id);
    }

    const filtered = allLogs.filter(
      (l) =>
        l.agency_id.toLowerCase().includes(term) ||
        l.change_description.toLowerCase().includes(term) ||
        l.new_status.toLowerCase().includes(term)
    );

    renderLogs(filtered);
  });
}
