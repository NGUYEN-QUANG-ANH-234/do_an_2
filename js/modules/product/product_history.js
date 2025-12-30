/**
 * NHẬT KÝ HOẠT ĐỘNG HỆ THỐNG - MINA RUBBER
 */

// Lấy dữ liệu từ LocalStorage
let priceHistory = JSON.parse(localStorage.getItem("mina_price_history")) || [];
let products = JSON.parse(localStorage.getItem("mina_products")) || [];

document.addEventListener("DOMContentLoaded", () => {
  initProductSelect();

  // 1. Kiểm tra tham số ID trên URL (ví dụ: ?id=123)
  const urlParams = new URLSearchParams(window.location.search);
  const productIdFromUrl = urlParams.get("id");

  if (productIdFromUrl) {
    const select = document.getElementById("productSelect");
    select.value = productIdFromUrl;
  }

  // 2. Tự động load dữ liệu lần đầu
  loadPriceHistory();
});

/**
 * Khởi tạo danh sách chọn sản phẩm
 * Đặc biệt: Hiển thị được cả những sản phẩm đã bị xóa nhưng vẫn còn lịch sử
 */
function initProductSelect() {
  const select = document.getElementById("productSelect");
  if (!select) return;

  // Lấy tất cả ID duy nhất từng xuất hiện trong lịch sử
  const allIdsInHistory = [
    ...new Set(priceHistory.map((h) => Number(h.product_id))),
  ];

  let optionsHtml = '<option value="">-- Tất cả sản phẩm --</option>';

  allIdsInHistory.forEach((id) => {
    // Tìm thông tin sản phẩm trong danh sách hiện tại
    const p = products.find((prod) => Number(prod.product_id) === id);

    if (p) {
      optionsHtml += `<option value="${id}">${p.product_code} - ${p.product_name}</option>`;
    } else {
      // Nếu không tìm thấy tức là sản phẩm đã bị xóa khỏi danh sách chính
      optionsHtml += `<option value="${id}" class="text-red-500">[ĐÃ XÓA] ID: ${id}</option>`;
    }
  });

  select.innerHTML = optionsHtml;
}

/**
 * Hàm chính: Tải và hiển thị nhật ký hoạt động
 */
function loadPriceHistory() {
  const productId = document.getElementById("productSelect")?.value;
  const actionFilter = document.getElementById("actionFilter")?.value;
  const body = document.getElementById("historyBody");

  if (!body) return;

  let filteredLogs = priceHistory;

  if (productId) {
    filteredLogs = filteredLogs.filter(
      (log) => Number(log.product_id) === Number(productId)
    );
  }

  if (actionFilter) {
    filteredLogs = filteredLogs.filter((log) => log.action === actionFilter);
  }

  filteredLogs.sort((a, b) => (b.log_id || 0) - (a.log_id || 0));

  if (filteredLogs.length === 0) {
    // Tăng colspan lên 5 vì đã thêm 1 cột
    body.innerHTML =
      '<tr><td colspan="5" class="px-6 py-10 text-center text-slate-400 italic">Không tìm thấy hoạt động nào phù hợp.</td></tr>';
    return;
  }

  body.innerHTML = filteredLogs
    .map((log) => {
      // --- LOGIC MỚI: Truy xuất thông tin sản phẩm ---
      const productInfo = products.find(
        (p) => Number(p.product_id) === Number(log.product_id)
      );
      const productDisplay = productInfo
        ? `<div class="font-bold text-slate-800 text-xs">${productInfo.product_name}</div>
           <div class="text-[10px] text-blue-600 font-mono font-bold">ID: ${log.product_id}</div>`
        : `<div class="font-bold text-red-400 text-xs">[Đã xóa khỏi DM]</div>
           <div class="text-[10px] text-slate-400 font-mono font-bold">ID: ${log.product_id}</div>`;

      // Định dạng nhãn (Badge)
      let actionBadge = "";
      switch (log.action) {
        case "CREATE":
          actionBadge =
            '<span class="bg-blue-100 text-blue-700 px-2 py-1 rounded text-[10px] font-bold border border-blue-200">THÊM MỚI</span>';
          break;
        case "UPDATE":
          actionBadge =
            '<span class="bg-amber-100 text-amber-700 px-2 py-1 rounded text-[10px] font-bold border border-amber-200">SỬA THÔNG TIN</span>';
          break;
        case "PRICE_CHANGE":
          actionBadge =
            '<span class="bg-purple-100 text-purple-700 px-2 py-1 rounded text-[10px] font-bold border border-purple-200">ĐỔI GIÁ</span>';
          break;
        case "DELETE":
          actionBadge =
            '<span class="bg-red-100 text-red-700 px-2 py-1 rounded text-[10px] font-bold border border-red-200">XÓA / DỪNG BÁN</span>';
          break;
        default:
          actionBadge = `<span class="bg-slate-100 text-slate-700 px-2 py-1 rounded text-[10px] font-bold">${log.action}</span>`;
      }

      let detailText = log.details;
      if (log.action === "PRICE_CHANGE" && log.old_price && log.new_price) {
        const diff = log.new_price - log.old_price;
        const diffText =
          diff >= 0
            ? `+${new Intl.NumberFormat("vi-VN").format(diff)}đ`
            : `${new Intl.NumberFormat("vi-VN").format(diff)}đ`;
        const colorClass = diff >= 0 ? "text-green-600" : "text-red-600";
        detailText += ` <span class="${colorClass} font-bold">(${diffText})</span>`;
      }

      return `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="px-6 py-4 font-medium text-slate-500 whitespace-nowrap">
                    <div class="text-slate-700 font-bold">${new Date(
                      log.log_id
                    ).toLocaleDateString("vi-VN")}</div>
                    <div class="text-[10px] text-slate-400">${new Date(
                      log.log_id
                    ).toLocaleTimeString("vi-VN")}</div>
                </td>
                <td class="px-6 py-4">
                    ${productDisplay} <!-- Hiển thị thông tin sản phẩm và ID -->
                </td>
                <td class="px-6 py-4">
                    ${actionBadge}
                </td>
                <td class="px-6 py-4 text-slate-600 leading-relaxed">
                    ${detailText}
                </td>
                <td class="px-6 py-4 text-center">
                    <div class="flex items-center justify-center">
                        <div class="w-7 h-7 bg-slate-200 rounded-full flex items-center justify-center me-2 text-[10px] font-bold text-slate-600 border border-white shadow-sm">
                            ${(log.changed_by || "A").charAt(0)}
                        </div>
                        <span class="text-slate-600 font-medium">${
                          log.changed_by || "Admin"
                        }</span>
                    </div>
                </td>
            </tr>
        `;
    })
    .join("");
}
