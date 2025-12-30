/**
 * order_create.js - Xử lý đặt hàng kết nối dữ liệu Kho (Warehouse)
 */

document.addEventListener("DOMContentLoaded", () => {
  initOrderPage();

  // Sự kiện thay đổi lựa chọn
  document
    .getElementById("productSelect")
    .addEventListener("change", updateOrderPreview);
  document
    .getElementById("orderQty")
    .addEventListener("input", updateOrderPreview);

  // Nộp đơn hàng
  document
    .getElementById("orderForm")
    .addEventListener("submit", handleCreateOrder);
});

/**
 * 1. Nạp danh sách sản phẩm từ Master Data
 */
function initOrderPage() {
  const products = JSON.parse(localStorage.getItem("mina_products")) || [];
  const select = document.getElementById("productSelect");

  if (products.length === 0) {
    select.innerHTML =
      '<option value="">-- Hệ thống chưa có sản phẩm --</option>';
    return;
  }

  select.innerHTML =
    '<option value="">-- Chọn sản phẩm cần đặt --</option>' +
    products
      .map(
        (p) => `
            <option value="${p.product_id}" data-price="${p.current_price}">
                ${p.product_name} (Size: ${p.size || "N/A"})
            </option>
        `
      )
      .join("");
}

/**
 * 2. Cập nhật Preview & Kiểm tra tồn kho thời gian thực
 */
function updateOrderPreview() {
  const select = document.getElementById("productSelect");
  const qtyInput = document.getElementById("orderQty");
  const selectedOption = select.options[select.selectedIndex];

  const productId = select.value;
  let price = 0;
  let qty = parseInt(qtyInput.value) || 0;

  if (selectedOption && selectedOption.dataset.price) {
    price = parseFloat(selectedOption.dataset.price);
  }

  // A. Kiểm tra tồn kho thực tế từ 'mina_inventory'
  const inventory = JSON.parse(localStorage.getItem("mina_inventory")) || [];
  const stockItem = inventory.find(
    (i) => Number(i.productId) === Number(productId)
  );
  const currentStock = stockItem ? stockItem.stock : 0;

  // B. Cảnh báo nếu đặt quá số lượng tồn
  const warningEl = document.getElementById("stockWarning");
  const statusEl = document.getElementById("stockStatus");
  const btnSubmit = document.getElementById("btnSubmitOrder");

  if (productId) {
    statusEl.innerText = `Sẵn có: ${currentStock}`;
    if (qty > currentStock) {
      warningEl.innerText = `Cảnh báo: Kho chỉ còn ${currentStock} sản phẩm!`;
      warningEl.classList.remove("hidden");
      statusEl.className = "font-bold text-red-500";
    } else {
      warningEl.classList.add("hidden");
      statusEl.className = "font-bold text-green-400";
    }
  }

  // C. Tính tổng tiền
  const total = price * qty;
  document.getElementById("displayPrice").value =
    price.toLocaleString() + " VNĐ";
  document.getElementById("subtotal").innerText = total.toLocaleString() + "đ";
  document.getElementById("totalAmount").innerText =
    total.toLocaleString() + "đ";
}

/**
 * 3. Gửi đơn hàng vào hệ thống
 */
function handleCreateOrder(e) {
  e.preventDefault();

  const user = JSON.parse(localStorage.getItem("mina_user")) || {
    id: "GUEST",
    name: "Khách vãng lai",
  };
  const productId = document.getElementById("productSelect").value;
  const qty = parseInt(document.getElementById("orderQty").value);
  const note = document.getElementById("orderNote").value;

  const products = JSON.parse(localStorage.getItem("mina_products")) || [];
  const productInfo = products.find(
    (p) => Number(p.product_id) === Number(productId)
  );

  // Tạo mã đơn hàng duy nhất
  const orderId =
    "ORD-" + Math.random().toString(36).substr(2, 9).toUpperCase();

  const newOrder = {
    id: orderId,
    agencyId: user.id,
    agencyName: user.name,
    productId: productId,
    productName: productInfo.product_name,
    quantity: qty,
    totalAmount: productInfo.current_price * qty,
    status: "READY_FOR_WAREHOUSE", // Trạng thái để warehouse_export nhìn thấy
    note: note,
    createdAt: new Date().toLocaleString(),
  };

  // Lưu vào LocalStorage 'mina_orders'
  let orders = JSON.parse(localStorage.getItem("mina_orders")) || [];
  orders.unshift(newOrder);
  localStorage.setItem("mina_orders", JSON.stringify(orders));

  showToast(`Đơn hàng #${orderId} đã được khởi tạo!`);

  // Chuyển sang lịch sử đơn hàng
  setTimeout(() => {
    window.location.href = "order_history.html";
  }, 1200);
}
