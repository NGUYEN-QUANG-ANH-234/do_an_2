/**
 * warehouse_import.js - Xử lý nhập hàng và đồng bộ danh mục Sản phẩm
 * Mina Rubber System 2025
 */

document.addEventListener("DOMContentLoaded", () => {
  // 1. Nạp danh sách sản phẩm từ Master Data (module Product) ngay khi mở trang
  loadProductListFromMaster();

  // 2. Hiển thị lịch sử nhập kho gần đây
  renderImportHistory();

  // 3. Lắng nghe sự kiện gửi form
  const importForm = document.getElementById("importForm");
  if (importForm) {
    importForm.addEventListener("submit", processImport);
  }
});

/**
 * Nạp danh sách sản phẩm từ LocalStorage 'mina_products'
 */
function loadProductListFromMaster() {
  const products = JSON.parse(localStorage.getItem("mina_products")) || [];
  const select = document.getElementById("productSelect");

  if (!select) return;

  if (products.length === 0) {
    select.innerHTML =
      '<option value="">-- Hệ thống chưa có sản phẩm nào --</option>';
    return;
  }

  // Sử dụng product_id và product_name để khớp với module Product
  select.innerHTML =
    '<option value="">-- Chọn sản phẩm từ danh mục --</option>' +
    products
      .map(
        (p) => `
            <option value="${p.product_id}">
                ${p.product_name} (Mã: ${p.product_code})
            </option>
        `
      )
      .join("");
}

/**
 * Xử lý nghiệp vụ Nhập kho
 */
function processImport(e) {
  e.preventDefault();

  // Lấy thông tin từ Form
  const productId = document.getElementById("productSelect").value;
  const qty = parseInt(document.getElementById("importQty").value);
  const source =
    document.getElementById("importSource").value || "Nhà máy Mina";
  const note = document.getElementById("importNote").value;

  // Kiểm tra tính hợp lệ của dữ liệu đầu vào
  if (!productId || isNaN(qty) || qty <= 0) {
    showToast("Vui lòng chọn sản phẩm và nhập số lượng hợp lệ!", "danger");
    return;
  }

  // A. Lấy dữ liệu nguồn (Master Products & Current Inventory)
  const products = JSON.parse(localStorage.getItem("mina_products")) || [];
  let inventory = JSON.parse(localStorage.getItem("mina_inventory")) || [];

  // B. Tìm thông tin chi tiết sản phẩm để đảm bảo dữ liệu đồng bộ
  const productInfo = products.find(
    (p) => Number(p.product_id) === Number(productId)
  );

  if (!productInfo) {
    showToast("Lỗi: Sản phẩm không tồn tại trong hệ thống!", "danger");
    return;
  }

  const now = new Date().toLocaleString();

  // C. Cập nhật số dư tồn kho (Inventory)
  const invIndex = inventory.findIndex(
    (item) => Number(item.productId) === Number(productId)
  );

  if (invIndex > -1) {
    // Nếu đã có trong kho, cộng dồn và cập nhật tên mới nhất
    inventory[invIndex].stock += qty;
    inventory[invIndex].productName = productInfo.product_name;
    inventory[invIndex].lastUpdate = now;
  } else {
    // Nếu sản phẩm lần đầu nhập kho
    inventory.push({
      productId: Number(productId),
      productName: productInfo.product_name,
      stock: qty,
      lastUpdate: now,
    });
  }

  // D. Ghi nhật ký nhập kho (Import Logs)
  let importLogs = JSON.parse(localStorage.getItem("mina_import_logs")) || [];
  importLogs.unshift({
    id: Date.now(),
    date: now,
    productId: productId,
    productName: productInfo.product_name,
    quantity: qty,
    source: source,
    note: note,
  });

  // E. Lưu trữ vào hệ thống
  localStorage.setItem("mina_inventory", JSON.stringify(inventory));
  localStorage.setItem("mina_import_logs", JSON.stringify(importLogs));

  // F. Phản hồi người dùng và làm mới giao diện
  showToast(`Đã nạp kho thành công: +${qty} ${productInfo.product_name}`);
  e.target.reset();
  renderImportHistory();
}

/**
 * Hiển thị nhật ký 5 lần nhập hàng gần nhất
 */
function renderImportHistory() {
  const logs = JSON.parse(localStorage.getItem("mina_import_logs")) || [];
  const tableBody = document.getElementById("importHistoryTable");

  if (!tableBody) return;

  if (logs.length === 0) {
    tableBody.innerHTML =
      '<tr><td colspan="4" class="px-6 py-4 text-center text-slate-400 italic">Chưa có nhật ký nhập hàng.</td></tr>';
    return;
  }

  tableBody.innerHTML = logs
    .slice(0, 5)
    .map(
      (log) => `
        <tr class="border-b border-slate-50 hover:bg-slate-50 transition-colors">
            <td class="px-6 py-4 text-[10px] text-slate-500 font-medium">${
              log.date
            }</td>
            <td class="px-6 py-4">
                <div class="text-sm font-bold text-slate-700">${
                  log.productName
                }</div>
                <div class="text-[10px] text-blue-500 font-mono">ID: ${
                  log.productId
                }</div>
            </td>
            <td class="px-6 py-4 font-black text-green-600">+${log.quantity.toLocaleString()}</td>
            <td class="px-6 py-4">
                <span class="text-[10px] px-2 py-1 bg-slate-100 rounded text-slate-600 font-bold uppercase italic">
                    ${log.source}
                </span>
            </td>
        </tr>
    `
    )
    .join("");
}
