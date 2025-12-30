/**
 * js/modules/warehouse/warehouse_export.js
 * Xử lý xuất kho, trừ tồn kho và đồng bộ dữ liệu giao nhận (GPS, Liên hệ)
 */

document.addEventListener("DOMContentLoaded", () => {
  initExportPage();

  // Sự kiện khi chọn đơn hàng từ danh sách
  document.getElementById("orderSelect").addEventListener("change", (e) => {
    loadOrderDetails(e.target.value);
  });

  // Sự kiện xác nhận xuất kho
  document
    .getElementById("btnConfirmExport")
    .addEventListener("click", processExport);
});

/**
 * 1. Khởi tạo trang Export
 */
function initExportPage() {
  loadPendingOrders();
  renderRecentExports();

  // Kiểm tra nếu được chuyển hướng từ trang Portal (có sẵn ID trong session)
  const preSelectedId = sessionStorage.getItem("processing_order_id");
  if (preSelectedId) {
    const select = document.getElementById("orderSelect");
    // Đợi danh sách nạp xong rồi mới gán giá trị
    setTimeout(() => {
      select.value = preSelectedId;
      loadOrderDetails(preSelectedId);
      sessionStorage.removeItem("processing_order_id");
    }, 100);
  }
}

/**
 * 2. Nạp danh sách đơn hàng đang ở trạng thái chờ (READY_FOR_WAREHOUSE)
 */
function loadPendingOrders() {
  const orders = JSON.parse(localStorage.getItem("mina_orders")) || [];
  const pending = orders.filter((o) => o.status === "READY_FOR_WAREHOUSE");
  const select = document.getElementById("orderSelect");

  if (!select) return;

  select.innerHTML =
    '<option value="">-- Danh sách đơn hàng sẵn sàng xuất kho --</option>' +
    pending
      .map(
        (o) => `<option value="${o.id}">Đơn #${o.id} - ${o.agencyName}</option>`
      )
      .join("");
}

/**
 * 3. Hiển thị chi tiết đơn hàng & Đồng bộ dữ liệu Đại lý
 */
function loadOrderDetails(orderId) {
  const card = document.getElementById("orderDetailCard");
  const btn = document.getElementById("btnConfirmExport");

  if (!orderId) {
    card.classList.add("hidden");
    return;
  }

  // Lấy dữ liệu nguồn
  const orders = JSON.parse(localStorage.getItem("mina_orders")) || [];
  const inventory = JSON.parse(localStorage.getItem("mina_inventory")) || [];
  const agencies = JSON.parse(localStorage.getItem("mina_agencies")) || [];

  const order = orders.find((o) => o.id === orderId);
  if (!order) return;

  // Tìm thông tin đại lý để lấy SĐT, Địa chỉ, GPS
  const agency = agencies.find((a) => a.agency_id === order.agencyId);

  // Tìm sản phẩm trong kho
  const stockItem = inventory.find(
    (i) => Number(i.productId) === Number(order.productId)
  );

  // A. Đổ dữ liệu cơ bản
  document.getElementById("displayAgency").innerText = order.agencyName;
  document.getElementById("displayProduct").innerText = order.productName;
  document.getElementById("displayQty").innerText = order.quantity;

  // B. Đổ dữ liệu liên hệ & GPS (Đồng bộ từ agency_list)
  document.getElementById("displayAddress").innerText = agency
    ? agency.address
    : "Chưa cập nhật địa chỉ";
  document.getElementById("displayContact").innerText = agency
    ? agency.contact_person
    : "N/A";
  document.getElementById("displayPhone").innerText = agency
    ? agency.contact_phone
    : "N/A";

  const gpsDisplay =
    agency && agency.lat
      ? `${parseFloat(agency.lat).toFixed(4)}, ${parseFloat(agency.lng).toFixed(
          4
        )}`
      : "Chưa định vị GPS";
  document.getElementById("displayGPS").innerText = gpsDisplay;

  // C. Kiểm tra tồn kho và cập nhật UI
  const currentStock = stockItem ? stockItem.stock : 0;
  const stockEl = document.getElementById("displayStock");
  const badgeContainer = document.getElementById("stockStatusBadge");

  stockEl.innerText = currentStock;

  if (currentStock < order.quantity) {
    stockEl.className = "text-2xl font-black text-red-600 font-mono";
    badgeContainer.innerHTML = `<span class="px-3 py-1 bg-red-100 text-red-600 text-[10px] font-black rounded-lg uppercase italic border border-red-200">Không đủ hàng</span>`;

    btn.disabled = true;
    btn.className =
      "w-full py-5 bg-slate-200 text-slate-400 rounded-2xl font-black uppercase italic cursor-not-allowed";
    btn.innerText = "Tồn kho không đủ để xuất";
  } else {
    stockEl.className = "text-2xl font-black text-green-600 font-mono";
    badgeContainer.innerHTML = `<span class="px-3 py-1 bg-green-100 text-green-600 text-[10px] font-black rounded-lg uppercase italic border border-green-200">Hàng sẵn sàng</span>`;

    btn.disabled = false;
    btn.className =
      "w-full py-5 bg-red-600 text-white rounded-2xl font-black uppercase italic hover:bg-red-700 shadow-xl shadow-red-200 cursor-pointer transition-all";
    btn.innerText = "Xác nhận xuất kho & Giao hàng";
  }

  card.classList.remove("hidden");
}

/**
 * 4. Xử lý xuất kho chính thức
 * Đồng bộ hóa dữ liệu với Module Vận tải (Transport Portal)
 */
function processExport() {
  const orderId = document.getElementById("orderSelect").value;
  if (!orderId) {
    alert("Vui lòng chọn một vận đơn để xuất kho!");
    return;
  }

  if (!confirm(`Xác nhận bốc hàng và thực hiện xuất kho cho đơn #${orderId}?`))
    return;

  // 1. Lấy dữ liệu nguồn
  let orders = JSON.parse(localStorage.getItem("mina_orders")) || [];
  let inventory = JSON.parse(localStorage.getItem("mina_inventory")) || [];
  let exportLogs = JSON.parse(localStorage.getItem("mina_export_logs")) || [];

  // 2. Tìm vị trí dữ liệu
  const orderIndex = orders.findIndex((o) => o.id === orderId);
  const order = orders[orderIndex];

  if (!order) {
    alert("Lỗi: Không tìm thấy thông tin đơn hàng trong hệ thống!");
    return;
  }

  const invIndex = inventory.findIndex(
    (i) => Number(i.productId) === Number(order.productId)
  );

  if (invIndex === -1) {
    alert("Lỗi: Sản phẩm này chưa có trong danh mục kho!");
    return;
  }

  // --- THỰC THI NGHIỆP VỤ ---

  // A. Trừ tồn kho thực tế
  inventory[invIndex].stock -= order.quantity;
  inventory[invIndex].lastUpdate = new Date().toLocaleString("vi-VN");

  // B. Cập nhật trạng thái chuyển giao sang Vận tải
  // Thiết lập SHIPPING nhưng partnerId = null để Portal tính vào nhóm "Chờ điều xe"
  orders[orderIndex].status = "SHIPPING";
  orders[orderIndex].partnerId = null;
  orders[orderIndex].shippedAt = new Date().toLocaleString("vi-VN");

  // C. Ghi nhật ký lịch sử xuất kho (Sử dụng cho KPIs vận hành)
  const currentUser = JSON.parse(localStorage.getItem("mina_user")) || {};
  exportLogs.unshift({
    log_id: Date.now(),
    date: new Date().toLocaleString("vi-VN"),
    orderId: orderId,
    productName: order.productName,
    quantity: order.quantity,
    agencyName: order.agencyName,
    operator: currentUser.username || currentUser.name || "Thủ kho",
  });

  // --- LƯU DỮ LIỆU (Bắt buộc chạy trước khi chuyển trang) ---
  localStorage.setItem("mina_orders", JSON.stringify(orders));
  localStorage.setItem("mina_inventory", JSON.stringify(inventory));
  localStorage.setItem("mina_export_logs", JSON.stringify(exportLogs));

  // --- THÔNG BÁO VÀ ĐIỀU HƯỚNG ---
  if (window.showToast) {
    showToast(
      `Đã xuất kho đơn #${orderId}. Chuyển giao bộ phận vận chuyển!`,
      "success"
    );
  }

  // Tạo hiệu ứng Highlight cho đơn hàng khi sang trang Transport Portal
  if (
    confirm(
      `Xuất kho đơn #${orderId} thành công! Bạn có muốn chuyển sang trang Điều phối vận tải để gán xe ngay không?`
    )
  ) {
    sessionStorage.setItem("just_exported_order_id", orderId);
    window.location.href = "../transport/transport_portal.html";
  } else {
    // Nếu ở lại trang, reset giao diện
    initExportPage();
    document.getElementById("orderDetailCard").classList.add("hidden");
    document.getElementById("orderSelect").value = "";
  }
}

/**
 * 5. Hiển thị lịch sử xuất kho gần đây
 */
function renderRecentExports() {
  const logs = JSON.parse(localStorage.getItem("mina_export_logs")) || [];
  const container = document.getElementById("recentExportList");
  if (!container) return;

  if (logs.length === 0) {
    container.innerHTML = `<p class="text-center text-slate-300 text-xs italic py-10">Chưa có lệnh xuất kho nào trong ca trực.</p>`;
    return;
  }

  container.innerHTML = logs
    .slice(0, 8)
    .map(
      (log) => `
    <div class="bg-slate-50 border-l-4 border-red-500 p-4 rounded-r-2xl hover:bg-white hover:shadow-sm transition-all">
        <div class="flex justify-between items-center mb-1">
            <p class="text-[9px] text-slate-400 font-black uppercase">${log.date}</p>
            <i class="fas fa-check-circle text-green-500 text-[10px]"></i>
        </div>
        <p class="text-xs font-black text-slate-700 uppercase italic">#${log.orderId} - ${log.agencyName}</p>
        <p class="text-[10px] text-slate-500 font-medium">${log.productName} (SL: ${log.quantity})</p>
    </div>
  `
    )
    .join("");
}
