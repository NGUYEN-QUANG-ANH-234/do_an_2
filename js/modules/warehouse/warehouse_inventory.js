/**
 * warehouse_inventory.js - Tổng hợp báo cáo tồn kho và giá trị tài sản
 */

document.addEventListener("DOMContentLoaded", () => {
  renderInventoryTable();
});

function renderInventoryTable(data = null) {
  // 1. Lấy dữ liệu từ cả hai nguồn
  const products = JSON.parse(localStorage.getItem("mina_products")) || [];
  const inventory =
    data || JSON.parse(localStorage.getItem("mina_inventory")) || [];
  const tableBody = document.getElementById("inventoryTableBody");

  let totalValue = 0;

  if (inventory.length === 0) {
    tableBody.innerHTML =
      '<tr><td colspan="7" class="px-6 py-10 text-center text-slate-400 italic font-bold">Kho hàng hiện tại đang trống.</td></tr>';
    return;
  }

  tableBody.innerHTML = inventory
    .map((item) => {
      // 2. Tìm thông tin bổ sung từ module Product
      const productInfo = products.find(
        (p) => Number(p.product_id) === Number(item.productId)
      );

      const price = productInfo ? productInfo.current_price : 0;

      product_cost = price * 0.85;

      const size = productInfo ? productInfo.size : "N/A";
      const itemTotal = product_cost * item.stock;

      totalValue += itemTotal;

      // 3. Xác định nhãn trạng thái dựa trên số lượng
      let statusBadge = "";
      if (item.stock === 0) {
        statusBadge =
          '<span class="px-2 py-1 bg-red-100 text-red-600 text-[10px] font-black rounded-full uppercase">Hết hàng</span>';
      } else if (item.stock < 10) {
        statusBadge =
          '<span class="px-2 py-1 bg-orange-100 text-orange-600 text-[10px] font-black rounded-full uppercase">Sắp hết</span>';
      } else {
        statusBadge =
          '<span class="px-2 py-1 bg-green-100 text-green-600 text-[10px] font-black rounded-full uppercase">An toàn</span>';
      }

      return `
            <tr class="border-b border-slate-50 hover:bg-blue-50/50 transition-colors">
                <td class="px-6 py-4">
                    <div class="font-bold text-slate-800">${
                      item.productName
                    }</div>
                    <div class="text-[10px] text-blue-500 font-mono">ID: ${
                      item.productId
                    }</div>
                </td>
                <td class="px-6 py-4 text-slate-500 font-medium">${size}</td>
                <td class="px-6 py-4 text-center font-black text-lg">${item.stock.toLocaleString()}</td>
                <td class="px-6 py-4 text-slate-600">${product_cost.toLocaleString()}đ</td>
                <td class="px-6 py-4 font-bold text-slate-900">${itemTotal.toLocaleString()}đ</td>
                <td class="px-6 py-4">${statusBadge}</td>
                <td class="px-6 py-4 text-right text-[10px] text-slate-400 font-medium">${
                  item.lastUpdate
                }</td>
            </tr>
        `;
    })
    .join("");

  // 4. Cập nhật tổng giá trị tài sản
  document.getElementById("totalInventoryValue").innerText =
    totalValue.toLocaleString() + "đ";
}

/**
 * Tìm kiếm nhanh sản phẩm trong kho
 */
function filterInventory() {
  const keyword = document
    .getElementById("inventorySearch")
    .value.toLowerCase();
  const inventory = JSON.parse(localStorage.getItem("mina_inventory")) || [];

  const filtered = inventory.filter(
    (item) =>
      item.productName.toLowerCase().includes(keyword) ||
      item.productId.toString().includes(keyword)
  );

  renderInventoryTable(filtered);
}

/**
 * Giả lập xuất Excel
 */
function exportToExcel() {
  showToast("Đang khởi tạo tệp báo cáo Excel...", "info");
  setTimeout(() => {
    showToast("Tải xuống báo cáo tồn kho thành công!", "success");
  }, 1500);
}
