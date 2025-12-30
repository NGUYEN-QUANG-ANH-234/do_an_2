/**
 * warehouse_stock-check.js - Nghiệp vụ kiểm kê và cân bằng kho
 */

document.addEventListener("DOMContentLoaded", () => {
  renderStockCheckList();
  renderCheckHistory();
});

/**
 * 1. Hiển thị danh sách sản phẩm để nhập số liệu thực tế
 */
function renderStockCheckList() {
  const inventory = JSON.parse(localStorage.getItem("mina_inventory")) || [];
  const tableBody = document.getElementById("stockCheckTableBody");

  if (inventory.length === 0) {
    tableBody.innerHTML =
      '<tr><td colspan="5" class="px-6 py-10 text-center text-slate-400 italic">Không có dữ liệu tồn kho để kiểm kê.</td></tr>';
    return;
  }

  tableBody.innerHTML = inventory
    .map(
      (item, index) => `
        <tr class="border-b border-slate-50">
            <td class="px-6 py-4">
                <div class="font-bold text-slate-700">${item.productName}</div>
                <div class="text-[10px] text-slate-400 font-mono">ID: ${item.productId}</div>
            </td>
            <td class="px-6 py-4 text-center font-bold text-slate-500">${item.stock}</td>
            <td class="px-6 py-4 text-center">
                <input type="number" value="${item.stock}" 
                    onchange="calculateDiff(this, ${item.stock}, ${index})"
                    class="actual-qty w-24 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-center font-black focus:ring-2 focus:ring-blue-500 outline-none"
                >
            </td>
            <td class="px-6 py-4 text-center">
                <span id="diff-${index}" class="font-black text-slate-400">0</span>
            </td>
            <td class="px-6 py-4">
                <input type="text" placeholder="Lý do chênh lệch..." class="note-input w-full px-3 py-2 text-xs border-b border-slate-100 focus:border-blue-500 outline-none">
            </td>
        </tr>
    `
    )
    .join("");
}

/**
 * 2. Tính toán chênh lệch tức thời
 */
function calculateDiff(input, systemQty, index) {
  const actualQty = parseInt(input.value) || 0;
  const diff = actualQty - systemQty;
  const diffEl = document.getElementById(`diff-${index}`);

  diffEl.innerText = diff > 0 ? `+${diff}` : diff;
  diffEl.className =
    diff === 0
      ? "font-black text-slate-400"
      : diff > 0
      ? "font-black text-green-600"
      : "font-black text-red-600";
}

/**
 * 3. Lưu kết quả kiểm kê và đồng bộ lại kho
 */
function saveStockCheck() {
  if (
    !confirm(
      "Xác nhận lưu kết quả kiểm kê? Tồn kho hệ thống sẽ được cập nhật theo số thực tế."
    )
  )
    return;

  let inventory = JSON.parse(localStorage.getItem("mina_inventory")) || [];
  const actualInputs = document.querySelectorAll(".actual-qty");
  const noteInputs = document.querySelectorAll(".note-input");

  let logs = [];

  actualInputs.forEach((input, index) => {
    const actualQty = parseInt(input.value);
    const oldQty = inventory[index].stock;

    if (actualQty !== oldQty) {
      logs.push({
        productName: inventory[index].productName,
        old: oldQty,
        new: actualQty,
        note: noteInputs[index].value || "Điều chỉnh kiểm kê",
      });
      // Cập nhật lại kho
      inventory[index].stock = actualQty;
      inventory[index].lastUpdate = new Date().toLocaleString();
    }
  });

  if (logs.length > 0) {
    // Lưu lịch sử kiểm kê
    let history =
      JSON.parse(localStorage.getItem("mina_stock_check_history")) || [];
    history.unshift({
      date: new Date().toLocaleString(),
      details: logs,
    });

    localStorage.setItem("mina_inventory", JSON.stringify(inventory));
    localStorage.setItem("mina_stock_check_history", JSON.stringify(history));

    showToast("Đã cân bằng kho thành công!", "success");
    renderCheckHistory();
  } else {
    showToast("Không có thay đổi so với hệ thống.", "info");
  }
}

function renderCheckHistory() {
  const history =
    JSON.parse(localStorage.getItem("mina_stock_check_history")) || [];
  const container = document.getElementById("stockCheckHistory");

  if (history.length === 0) {
    container.innerHTML =
      '<p class="text-xs text-slate-400 italic">Chưa có lịch sử kiểm kê.</p>';
    return;
  }

  container.innerHTML = history
    .slice(0, 3)
    .map(
      (h) => `
        <div class="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div class="flex justify-between items-center mb-2">
                <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">${
                  h.date
                }</span>
                <span class="text-[10px] bg-blue-100 text-blue-600 px-2 py-1 rounded-full font-bold">HOÀN TẤT</span>
            </div>
            <ul class="text-xs space-y-1">
                ${h.details
                  .map(
                    (d) => `
                    <li class="flex justify-between">
                        <span class="font-bold text-slate-600">${d.productName}</span>
                        <span class="italic text-slate-400">${d.old} ➔ ${d.new} (${d.note})</span>
                    </li>
                `
                  )
                  .join("")}
            </ul>
        </div>
    `
    )
    .join("");
}
