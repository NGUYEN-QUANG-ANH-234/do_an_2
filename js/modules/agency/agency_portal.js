/**
 * js/modules/agency/agency_portal.js
 * Quản lý giao diện dành riêng cho Đại lý (Portal)
 */

document.addEventListener("DOMContentLoaded", () => {
  // 1. Kiểm tra quyền truy cập từ Session (LocalStorage)
  const user = JSON.parse(localStorage.getItem("mina_user"));

  if (user && user.role === "AGENCY") {
    initAgencyDashboard(user);
  } else {
    // Nếu không phải Agency, có thể điều hướng về trang login hoặc báo lỗi
    console.warn("Truy cập bị từ chối: Không phải tài khoản đại lý.");
  }
});

/**
 * Khởi tạo dữ liệu Dashboard
 */
function initAgencyDashboard(user) {
  // Lấy dữ liệu từ LocalStorage
  const contracts = JSON.parse(localStorage.getItem("mina_contracts")) || [];
  const agencies = JSON.parse(localStorage.getItem("mina_agencies")) || [];
  const logs = JSON.parse(localStorage.getItem("mina_contract_logs")) || [];

  // Tìm thông tin đại lý dựa trên ID người dùng đang đăng nhập
  const myAgencyInfo = agencies.find(
    (a) => String(a.agency_id) === String(user.id)
  );

  if (myAgencyInfo) {
    const agencyId = myAgencyInfo.agency_id;

    // Tìm hợp đồng của chính đại lý này
    const myContract = contracts.find(
      (c) => String(c.agency_id) === String(agencyId)
    );

    // Cập nhật giao diện trạng thái hợp đồng
    updateAgencyContractUI(myContract);

    // Hiển thị nhật ký hoạt động (Logs)
    renderPersonalLogs(logs, agencyId);
  } else {
    // Trường hợp hy hữu: User login hợp lệ nhưng không tìm thấy profile trong danh sách đại lý
    const txtStatus = document.getElementById("txtStatus");
    if (txtStatus) txtStatus.innerText = "LỖI: KHÔNG TÌM THẤY DỮ LIỆU";
  }
}

/**
 * Cập nhật giao diện Hợp đồng (Trạng thái, thông báo, nút kích hoạt)
 */
function updateAgencyContractUI(contract) {
  const txtStatus = document.getElementById("txtStatus");
  const activationZone = document.getElementById("activationZone");
  const txtNote = document.getElementById("txtNote");

  if (!txtStatus || !activationZone || !txtNote) return;

  if (!contract) {
    txtStatus.innerText = "CHƯA KHỞI TẠO";
    txtStatus.className = "font-bold text-slate-400";
    activationZone.classList.add("hidden");
    txtNote.innerText =
      "Vui lòng liên hệ quản trị viên để khởi tạo hợp đồng điện tử.";
    return;
  }

  // Chuẩn hóa trạng thái về chữ thường để so sánh
  const status = contract.status.toLowerCase();

  if (status === "pending") {
    txtStatus.innerText = "CHỜ KÍCH HOẠT";
    txtStatus.className = "font-black text-orange-500 italic";
    activationZone.classList.remove("hidden");
    txtNote.innerText =
      "Hợp đồng đã được soạn thảo. Vui lòng xác nhận các điều khoản bên dưới.";
  } else if (status === "active") {
    txtStatus.innerText = "ĐANG HIỆU LỰC";
    txtStatus.className = "font-black text-green-600 italic";
    activationZone.classList.add("hidden");
    txtNote.innerText =
      "Hợp đồng đang trong thời gian hiệu lực. Bạn có quyền đặt hàng và hưởng chiết khấu.";
  } else {
    txtStatus.innerText = contract.status.toUpperCase();
    txtStatus.className = "font-bold text-slate-600";
    activationZone.classList.add("hidden");
  }
}

/**
 * Hàm kích hoạt hợp đồng (Gọi khi đại lý nhấn nút "Xác nhận kích hoạt")
 */
window.activateContract = function () {
  const user = JSON.parse(localStorage.getItem("mina_user"));
  if (!user || !user.id) {
    alert("Phiên đăng nhập hết hạn!");
    return;
  }

  if (confirm("Bạn xác nhận đã đọc và đồng ý với các điều khoản của MINA?")) {
    let contracts = JSON.parse(localStorage.getItem("mina_contracts")) || [];

    // Tìm vị trí hợp đồng của người đang đăng nhập
    const index = contracts.findIndex(
      (c) => String(c.agency_id) === String(user.id)
    );

    if (index !== -1) {
      // Cập nhật trạng thái thành Active
      contracts[index].status = "Active";
      contracts[index].activated_at = new Date().toISOString();
      localStorage.setItem("mina_contracts", JSON.stringify(contracts));

      // Lưu nhật ký biến động
      saveContractLog(
        user.id,
        "Active",
        "Đại lý đã tự xác nhận và kích hoạt hợp đồng qua Portal"
      );

      alert("Chúc mừng! Hợp đồng của bạn đã được kích hoạt thành công.");
      location.reload(); // Tải lại trang để cập nhật UI
    } else {
      alert("Không tìm thấy dữ liệu hợp đồng hợp lệ trên hệ thống!");
    }
  }
};

/**
 * Lưu nhật ký thay đổi trạng thái
 */
function saveContractLog(agencyId, status, desc) {
  let logs = JSON.parse(localStorage.getItem("mina_contract_logs")) || [];
  logs.push({
    log_id: Date.now(),
    agency_id: String(agencyId),
    changed_at: new Date().toLocaleString("vi-VN"),
    new_status: status,
    change_description: desc,
  });
  localStorage.setItem("mina_contract_logs", JSON.stringify(logs));
}

/**
 * Render bảng nhật ký biến động dành riêng cho đại lý
 */
function renderPersonalLogs(logs, agencyId) {
  const container = document.getElementById("portalLogBody");
  if (!container) return;

  // Lọc chỉ lấy log của chính đại lý này và sắp xếp mới nhất lên đầu
  const myLogs = logs
    .filter((l) => String(l.agency_id) === String(agencyId))
    .sort((a, b) => b.log_id - a.log_id);

  if (myLogs.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="4" class="p-10 text-center text-slate-400 italic">
          Chưa có nhật ký hoạt động nào được ghi nhận.
        </td>
      </tr>`;
    return;
  }

  container.innerHTML = myLogs
    .map(
      (l) => `
        <tr class="hover:bg-slate-50 transition-all border-b border-slate-50">
            <td class="px-8 py-4 text-slate-500 font-mono text-[11px]">${l.changed_at}</td>
            <td class="px-8 py-4">
                <span class="font-bold text-blue-600 uppercase text-[10px] bg-blue-50 px-2 py-1 rounded">Biến động</span>
            </td>
            <td class="px-8 py-4 text-slate-600 italic text-xs">${l.change_description}</td>
            <td class="px-8 py-4 text-right">
                <span class="px-3 py-1 bg-green-50 text-green-600 rounded-full text-[9px] font-black italic border border-green-100 uppercase">
                  Thành công
                </span>
            </td>
        </tr>
    `
    )
    .join("");
}
