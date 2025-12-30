/**
 * transport_portal.js - Trung tâm điều phối vận tải Mina Rubber
 * Tối ưu: Tính phí vận chuyển tập trung và cập nhật Live Fee
 */

document.addEventListener("DOMContentLoaded", () => {
  initTransportPortal();

  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      renderTransportTasks(e.target.value.toLowerCase());
    });
  }

  const regionFilter = document.getElementById("regionFilter");
  if (regionFilter) {
    regionFilter.addEventListener("change", () => {
      renderTransportTasks(
        document.getElementById("searchInput")?.value.toLowerCase()
      );
    });
  }
});

/**
 * 1. CÔNG THỨC TÍNH PHÍ VẬN CHUYỂN TẬP TRUNG (KPI Tài chính 5.1)
 * Luôn sử dụng hàm này để đảm bảo đồng bộ với trang Partner.
 */
function calculateFreightCost(order, partnerType) {
  if (!partnerType) return 0;

  // Cấu hình định mức chi phí (Nguồn sự thật duy nhất)
  const rates = {
    products: { standard: 500, heavy: 800 },
    distance: { internal: 4500, external: 7000 },
  };

  const productRate = order.productName.toLowerCase().includes("đặc")
    ? rates.products.heavy
    : rates.products.standard;

  const distRate =
    partnerType === "Nội bộ"
      ? rates.distance.internal
      : rates.distance.external;

  // Quãng đường: Ưu tiên khoảng cách thực tế, nếu chưa có lấy dự phòng 20km
  const distance = order.distance || 20;

  return order.quantity * productRate + distance * distRate;
}

/**
 * 2. CẬP NHẬT GIÁ VẬN CHUYỂN TỨC THÌ (LIVE UPDATE)
 */
function updateLiveFee(orderId) {
  const partnerSelect = document.getElementById(`selectPartner_${orderId}`);
  const feeDisplay = document.getElementById(`fee_${orderId}`);
  const orders = JSON.parse(localStorage.getItem("mina_orders")) || [];
  const order = orders.find((o) => o.id === orderId);

  if (!partnerSelect || !feeDisplay || !order) return;

  const selectedOption = partnerSelect.options[partnerSelect.selectedIndex];
  const partnerType = selectedOption.getAttribute("data-type");

  if (!partnerType) {
    feeDisplay.innerText = "---";
    feeDisplay.className = "text-xs font-black text-slate-400 italic";
    return;
  }

  const cost = calculateFreightCost(order, partnerType);
  feeDisplay.innerText = cost.toLocaleString() + "đ";
  feeDisplay.className = "text-xs font-black text-red-500 italic animate-pulse";
}

/**
 * 3. HIỂN THỊ DANH SÁCH VẬN ĐƠN CHỜ ĐIỀU PHỐI
 */
function renderTransportTasks(searchTerm = "") {
  const orders = JSON.parse(localStorage.getItem("mina_orders")) || [];
  const partners =
    JSON.parse(localStorage.getItem("mina_transport_partners")) || [];
  const tableBody = document.getElementById("transportTaskBody");
  if (!tableBody) return;

  const highlightId = sessionStorage.getItem("just_exported_order_id");

  const pendingTasks = orders.filter((o) => {
    const matchSearch =
      o.id.toLowerCase().includes(searchTerm) ||
      o.agencyName.toLowerCase().includes(searchTerm);
    return o.status === "SHIPPING" && !o.partnerId && matchSearch;
  });

  if (pendingTasks.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="6" class="p-20 text-center opacity-30 italic font-bold">Mọi vận đơn đã được điều phối xong</td></tr>`;
    return;
  }

  tableBody.innerHTML = pendingTasks
    .map((o) => {
      const isNew =
        o.id === highlightId
          ? "highlight-new-task shadow-inner border-l-4 border-blue-600"
          : "";

      return `
        <tr class="${isNew} border-b border-slate-50 hover:bg-blue-50/50 transition-all group">
            <td class="px-6 py-5">
                <div class="text-[10px] font-black text-blue-600 italic uppercase">#${
                  o.id
                }</div>
                <div class="text-[9px] text-slate-400 font-bold mt-1 uppercase italic">${
                  o.createdAt || "---"
                }</div>
            </td>
            <td class="px-6 py-5">
                <div class="font-black text-slate-700 uppercase italic text-sm mb-1">${
                  o.agencyName
                }</div>
                <div class="text-[9px] text-slate-400 font-bold italic truncate w-40">
                    <i class="fas fa-map-marker-alt mr-1 text-red-400"></i>${
                      o.deliveryAddress || "Chưa định vị"
                    }
                </div>
            </td>
            <td class="px-6 py-5">
                <div class="text-xs font-bold text-slate-600 uppercase">${
                  o.productName
                }</div>
                <div class="inline-block mt-1 px-2 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-black rounded italic text-center">SL: ${
                  o.quantity
                }kg</div>
            </td>
            
            <td class="px-6 py-5 text-center">
                <div id="fee_${
                  o.id
                }" class="text-xs font-black text-slate-400 italic tracking-tighter">---</div>
                <p class="text-[8px] text-slate-400 font-bold uppercase mt-1 italic tracking-tighter">Phí dự toán</p>
            </td>

            <td class="px-6 py-5">
                <select id="selectPartner_${o.id}" 
                        onchange="updateLiveFee('${o.id}')"
                        class="w-full bg-white border border-slate-100 rounded-xl text-[10px] font-black uppercase p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer">
                    <option value="">-- CHỌN ĐỐI TÁC --</option>
                    ${partners
                      .map(
                        (p) =>
                          `<option value="${p.id}" data-type="${p.type}">${p.name}</option>`
                      )
                      .join("")}
                </select>
            </td>
            <td class="px-6 py-5 text-right">
                <button onclick="dispatchOrder('${
                  o.id
                }')" class="bg-slate-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase italic shadow-xl hover:bg-blue-600 active:scale-95 transition-all">
                    Xác nhận gán xe
                </button>
            </td>
        </tr>`;
    })
    .join("");

  if (highlightId) {
    setTimeout(() => sessionStorage.removeItem("just_exported_order_id"), 5000);
  }
}

/**
 * 4. LỆNH ĐIỀU XE & BÀN GIAO VẬN ĐƠN
 */
function dispatchOrder(orderId) {
  const partnerSelect = document.getElementById(`selectPartner_${orderId}`);
  const selectedOption = partnerSelect.options[partnerSelect.selectedIndex];
  const partnerId = partnerSelect.value;
  const partnerType = selectedOption.getAttribute("data-type");

  if (!partnerId) {
    showToast("Lỗi: Vui lòng chỉ định đơn vị vận chuyển!", "warning");
    return;
  }

  if (
    !confirm(
      `Xác nhận bàn giao đơn #${orderId} cho đơn vị: ${selectedOption.text}?`
    )
  )
    return;

  let orders = JSON.parse(localStorage.getItem("mina_orders")) || [];
  const idx = orders.findIndex((o) => o.id === orderId);

  if (idx !== -1) {
    // Sử dụng công thức tập trung để lưu giá trị tài chính chính thức
    const finalCost = calculateFreightCost(orders[idx], partnerType);

    orders[idx].partnerId = partnerId;
    orders[idx].partnerName = selectedOption.text;
    orders[idx].partnerType = partnerType;
    orders[idx].estimatedFreightCost = finalCost;
    orders[idx].shippedAt = new Date().toLocaleString("vi-VN");

    localStorage.setItem("mina_orders", JSON.stringify(orders));
    recordTransportActivity(orders[idx]);

    showToast(
      `Đã gán xe. Phí dự toán: ${finalCost.toLocaleString()}đ`,
      "success"
    );
    updateTransportStats();
    renderTransportTasks(
      document.getElementById("searchInput")?.value.toLowerCase()
    );
    window.dispatchEvent(new Event("storage"));
  }
}

// Các hàm bổ trợ (initTransportPortal, updateTransportStats, recordTransportActivity, showToast) giữ nguyên...
function initTransportPortal() {
  const user = JSON.parse(localStorage.getItem("mina_user"));
  if (!user || !["ADMIN", "WAREHOUSE", "MANAGER"].includes(user.role)) {
    alert("Bạn không có quyền truy cập trung tâm điều phối vận tải!");
    window.location.href = "../order/order_portal.html";
    return;
  }
  updateTransportStats();
  renderTransportTasks();
  window.addEventListener("storage", (e) => {
    if (e.key === "mina_orders" || e.key === "mina_transport_partners") {
      updateTransportStats();
      renderTransportTasks(
        document.getElementById("searchInput")?.value.toLowerCase()
      );
    }
  });
}

function updateTransportStats() {
  const orders = JSON.parse(localStorage.getItem("mina_orders")) || [];
  const stats = {
    pending: orders.filter((o) => o.status === "SHIPPING" && !o.partnerId)
      .length,
    shipping: orders.filter((o) => o.status === "SHIPPING" && o.partnerId)
      .length,
    delivered: orders.filter((o) => o.status === "DELIVERED").length,
  };
  if (document.getElementById("countPending"))
    document.getElementById("countPending").innerText = stats.pending;
  if (document.getElementById("countShipping"))
    document.getElementById("countShipping").innerText = stats.shipping;
  if (document.getElementById("countDelivered"))
    document.getElementById("countDelivered").innerText = stats.delivered;
}

function recordTransportActivity(order) {
  let history =
    JSON.parse(localStorage.getItem("mina_transport_history")) || [];
  const user = JSON.parse(localStorage.getItem("mina_user"));
  history.unshift({
    log_id: "T-LOG-" + Date.now(),
    orderId: order.id,
    agencyName: order.agencyName,
    partnerName: order.partnerName,
    action: "GÁN XE THÀNH CÔNG",
    operator: user?.name || "Điều phối viên",
    timestamp: new Date().toLocaleString("vi-VN"),
  });
  localStorage.setItem("mina_transport_history", JSON.stringify(history));
}

function showToast(message, type = "info") {
  if (window.showToast) window.showToast(message, type);
  else alert(message);
}
