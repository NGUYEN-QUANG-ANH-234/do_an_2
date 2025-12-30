let priceHistory = JSON.parse(localStorage.getItem("mina_price_history")) || [];
let products = JSON.parse(localStorage.getItem("mina_products")) || [];

// Chặn truy cập trực tiếp bằng URL nếu không phải Admin/Manager
const user = JSON.parse(localStorage.getItem("mina_user"));
if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER")) {
  alert("Bạn không có quyền xem nhật ký hệ thống!");
  window.location.href = "product_list.html";
}

document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = Number(urlParams.get("id"));

  if (!productId) {
    window.location.href = "product_list.html";
    return;
  }

  renderPriceDetails(productId);
});

function renderPriceDetails(productId) {
  const product = products.find((p) => Number(p.product_id) === productId);
  const body = document.getElementById("priceBody");
  const info = document.getElementById("productInfo");

  if (product) {
    info.innerText = `${product.product_code} - ${product.product_name}`;
    document.getElementById("currentPriceDisplay").innerText =
      new Intl.NumberFormat("vi-VN").format(product.current_price) + "đ";
  }

  // Lọc: CHỈ lấy hành động PRICE_CHANGE và CREATE (vì CREATE có giá khởi tạo)
  const history = priceHistory
    .filter(
      (h) =>
        Number(h.product_id) === productId &&
        (h.action === "PRICE_CHANGE" || h.action === "CREATE")
    )
    .sort((a, b) => b.log_id - a.log_id);

  if (history.length > 0) {
    document.getElementById("lastChangeDisplay").innerText = new Date(
      history[0].log_id
    ).toLocaleDateString("vi-VN");
  }

  body.innerHTML = history
    .map((log, index) => {
      let varianceHtml = '<span class="text-slate-400">---</span>';

      // So sánh với bản ghi cũ hơn liền kề
      if (index < history.length - 1) {
        const oldPrice = history[index + 1].new_price;
        const newPrice = log.new_price;
        const diff = newPrice - oldPrice;
        const percent = ((diff / oldPrice) * 100).toFixed(1);

        const color = diff >= 0 ? "text-green-600" : "text-red-600";
        const icon = diff >= 0 ? "fa-arrow-up" : "fa-arrow-down";

        varianceHtml = `
                <div class="${color} font-bold">
                    ${diff >= 0 ? "+" : ""}${new Intl.NumberFormat(
          "vi-VN"
        ).format(diff)}đ
                    <span class="text-[10px] ml-1">(${Math.abs(
                      percent
                    )}%) <i class="fas ${icon}"></i></span>
                </div>
            `;
      }

      return `
            <tr class="hover:bg-slate-50 transition-all">
                <td class="px-6 py-4 font-medium text-slate-600">
                    ${new Date(log.log_id).toLocaleDateString("vi-VN")}
                    <div class="text-[10px] text-slate-400">${new Date(
                      log.log_id
                    ).toLocaleTimeString("vi-VN")}</div>
                </td>
                <td class="px-6 py-4 font-black text-slate-800">
                    ${new Intl.NumberFormat("vi-VN").format(log.new_price)}đ
                </td>
                <td class="px-6 py-4 text-center">
                    ${varianceHtml}
                </td>
                <td class="px-6 py-4 text-slate-500 text-xs italic">
                    ${log.details}
                </td>
            </tr>
        `;
    })
    .join("");
}
