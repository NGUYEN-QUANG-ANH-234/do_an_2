/**
 * accounting_portal.js - Trung tâm Điều phối Tài chính & KPI Mina Rubber
 * Tích hợp: Doanh thu thực, Nợ phải thu, Giá vốn (COGS) và Lợi nhuận thực tế
 */

document.addEventListener("DOMContentLoaded", () => {
  initAccountingDashboard();

  // Tìm kiếm hóa đơn theo mã hoặc tên đại lý
  document.getElementById("invoiceSearch")?.addEventListener("input", (e) => {
    renderInvoiceList(e.target.value.toLowerCase());
  });

  // Lắng nghe thay đổi từ các tab khác để cập nhật số liệu tức thì
  window.addEventListener("storage", (e) => {
    const syncKeys = [
      "mina_orders",
      "mina_inventory",
      "mina_products",
      "mina_wallets",
    ];
    if (syncKeys.includes(e.key)) {
      updateFinancialStats();
      renderInvoiceList();
    }
  });
});

function initAccountingDashboard() {
  updateFinancialStats();
  renderInvoiceList();
}

/**
 * 2. TỔNG HỢP KPIs TÀI CHÍNH VỚI SỐ LIỆU THẬT (BSC 5.1 & 5.2)
 * Lấy Giá vốn từ danh mục sản phẩm và Phí vận chuyển từ đơn hàng thực tế.
 */
function updateFinancialStats() {
  const orders = JSON.parse(localStorage.getItem("mina_orders")) || [];
  const products = JSON.parse(localStorage.getItem("mina_products")) || [];

  let stats = {
    revenue: 0, // Doanh thu từ các đơn đã PAID
    receivables: 0, // Nợ phải thu từ các đơn chưa PAID
    cogs: 0, // Giá vốn hàng bán thực tế
    shipping: 0, // Phí vận chuyển thực tế
  };

  orders.forEach((o) => {
    // Chỉ tính toán cho các vận đơn đã phát hành hóa đơn (Kế toán đã duyệt)
    if (o.accounting && o.accounting.invoiceSent) {
      const finalAmount = Number(o.accounting.totalAmount) || 0;
      // PHÍ VẬN CHUYỂN THẬT: Lấy từ trường chi phí thực tế hoặc ước tính trong đơn
      const realShipFee = Number(o.estimatedFreightCost) || 0;

      // A. PHÂN LOẠI DÒNG TIỀN (BSC 5.1)
      if (o.accounting.status === "PAID") {
        stats.revenue += finalAmount;
      } else {
        stats.receivables += finalAmount;
      }

      // B. TÍNH GIÁ VỐN (COGS) THẬT
      // Ưu tiên lấy giá nhập từ danh mục sản phẩm
      const productInfo = products.find(
        (p) => String(p.product_id) === String(o.productId)
      );

      let unitCost = 0;
      if (productInfo && productInfo.import_price) {
        // Nếu có giá nhập (import_price) thì lấy trực tiếp
        unitCost = Number(productInfo.import_price);
      } else {
        // Nếu không có giá nhập, sử dụng công thức dự phòng 85% giá bán hiện tại
        const currentPrice = productInfo
          ? Number(productInfo.current_price)
          : finalAmount / (o.quantity || 1);
        unitCost = currentPrice * 0.85;
      }

      stats.cogs += unitCost * (Number(o.quantity) || 0);

      // C. CHI PHÍ VẬN CHUYỂN THẬT
      stats.shipping += realShipFee;
    }
  });

  // D. TÍNH LỢI NHUẬN RÒNG THỰC TẾ (NET PROFIT)
  // Lợi nhuận = (Doanh thu thực + Nợ phải thu) - (Tổng giá vốn + Tổng phí ship)
  const totalGross = stats.revenue + stats.receivables;
  const netProfit = totalGross - (stats.cogs + stats.shipping);

  // Cập nhật số liệu lên giao diện
  displayCurrency("totalRevenue", stats.revenue);
  displayCurrency("totalReceivables", stats.receivables);
  displayCurrency("totalCOGS", stats.cogs);
  displayCurrency("totalShipping", stats.shipping);
  displayCurrency("totalProfit", netProfit);
}

/**
 * 3. HIỂN THỊ DANH SÁCH HÓA ĐƠN ĐÃ PHÁT HÀNH
 */
function renderInvoiceList(searchTerm = "") {
  const orders = JSON.parse(localStorage.getItem("mina_orders")) || [];
  const container = document.getElementById("invoiceTableBody");
  if (!container) return;

  const filtered = orders.filter(
    (o) =>
      o.accounting?.invoiceSent === true &&
      (o.id.toLowerCase().includes(searchTerm) ||
        o.agencyName.toLowerCase().includes(searchTerm))
  );

  if (filtered.length === 0) {
    container.innerHTML = `<tr><td colspan="5" class="p-20 text-center opacity-30 font-black uppercase italic">Không có dữ liệu hóa đơn</td></tr>`;
    return;
  }

  container.innerHTML = filtered
    .map((o) => {
      const total = Number(o.accounting.totalAmount) || 0;
      const isPaid = o.accounting.status === "PAID";
      const freight = Number(o.estimatedFreightCost) || 0;

      return `
            <tr class="border-b border-slate-50 hover:bg-blue-50/30 transition-all group">
                <td class="px-10 py-6">
                    <div class="text-[10px] font-black text-blue-600 italic uppercase">#INV-${
                      o.id
                    }</div>
                    <div class="text-[9px] text-slate-400 font-bold mt-1 uppercase italic">Duyệt: ${
                      o.accounting.sentAt || "N/A"
                    }</div>
                </td>
                <td class="px-10 py-6">
                    <div class="font-black text-slate-700 uppercase italic text-sm mb-1">${
                      o.agencyName
                    }</div>
                    <div class="text-[9px] text-slate-400 font-bold italic uppercase">Vận chuyển: ${
                      o.partnerName || "Chờ gán"
                    }</div>
                </td>
                <td class="px-10 py-6 text-center">
                    <div class="text-sm font-black ${
                      isPaid ? "text-green-600" : "text-slate-800"
                    }">${total.toLocaleString()}đ</div>
                    <div class="text-[8px] text-slate-400 font-bold uppercase mt-1 italic">
                        Hàng: ${total.toLocaleString()}đ | Ship: ${freight.toLocaleString()}đ
                    </div>
                </td>
                <td class="px-10 py-6">
                    <span class="px-3 py-1 ${
                      isPaid
                        ? "bg-green-50 text-green-600 border-green-200"
                        : "bg-orange-50 text-orange-600 border-orange-200"
                    } 
                               rounded-full text-[9px] font-black uppercase italic border shadow-sm">
                        ${isPaid ? "Đã thu" : "Nợ phải thu (AR)"}
                    </span>
                </td>
                
            </tr>`;
    })
    .join("");
}

function navigateManagement(orderId) {
  window.location.href = "invoice_management.html?id=" + orderId;
}

function displayCurrency(id, val) {
  const el = document.getElementById(id);
  if (el) el.innerText = val.toLocaleString("vi-VN") + "đ";
}
