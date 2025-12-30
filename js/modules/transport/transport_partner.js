/**
 * transport_partner.js - Quản lý Đối tác & Định mức tài chính tập trung
 */

document.addEventListener("DOMContentLoaded", () => {
  initPartnerPage();

  window.addEventListener("storage", (e) => {
    if (e.key === "mina_orders" || e.key === "mina_transport_partners") {
      renderPartnerList();
    }
  });

  document
    .getElementById("addPartnerForm")
    ?.addEventListener("submit", handleAddPartner);
});

let transportPartners =
  JSON.parse(localStorage.getItem("mina_transport_partners")) || [];

/**
 * 1. CÔNG THỨC TÍNH PHÍ VẬN CHUYỂN TẬP TRUNG (Single Source of Truth)
 * Dùng chung cho cả báo cáo đối tác và hiển thị phí dự toán tại Portal.
 */
function calculateFreightCost(order, partnerType) {
  if (!partnerType) return 0;

  // Cấu hình đơn giá định mức (KPI Tài chính 5.1)
  const rates = {
    products: { standard: 500, heavy: 800 },
    distance: { internal: 4500, external: 7000 },
  };

  // A. Định mức theo loại sản phẩm
  const productRate = order.productName.toLowerCase().includes("đặc")
    ? rates.products.heavy
    : rates.products.standard;

  // B. Định mức theo quãng đường & loại đối tác
  const distRate =
    partnerType === "Nội bộ"
      ? rates.distance.internal
      : rates.distance.external;

  // C. Khoảng cách: Ưu tiên khoảng cách thực tế, nếu chưa có thì lấy dự phòng 20km
  const distance = order.distance || 20;

  return order.quantity * productRate + distance * distRate;
}

/**
 * 2. HIỂN THỊ DANH SÁCH VỚI HIỆU SUẤT TÀI CHÍNH
 */
function renderPartnerList() {
  const orders = JSON.parse(localStorage.getItem("mina_orders")) || [];
  const container = document.getElementById("partnerTableBody");
  if (!container) return;

  container.innerHTML = transportPartners
    .map((p) => {
      const partnerOrders = orders.filter((o) => o.partnerId === p.id);

      let totalCargoValue = 0;
      let totalFreightExpense = 0;

      partnerOrders.forEach((o) => {
        totalCargoValue += parseFloat(o.totalAmount) || 0;
        // Sử dụng hàm tính toán tập trung để đảm bảo đồng bộ
        totalFreightExpense += calculateFreightCost(o, p.type);
      });

      return `
        <tr class="border-b border-slate-50 hover:bg-slate-50 transition-all group">
            <td class="px-8 py-5 font-mono font-bold text-blue-600 text-[10px]">${
              p.id
            }</td>
            <td class="px-8 py-5">
                <div class="font-black text-slate-700 uppercase italic text-sm leading-tight">${
                  p.name
                }</div>
                <div class="text-[9px] text-slate-400 font-bold mt-1 tracking-widest">${
                  p.contact
                }</div>
            </td>
            <td class="px-8 py-5">
                <span class="px-3 py-1 ${
                  p.type === "Nội bộ"
                    ? "bg-indigo-50 text-indigo-600 border-indigo-100"
                    : "bg-amber-50 text-amber-600 border-amber-100"
                } 
                             rounded-full text-[9px] font-black uppercase italic border shadow-sm">
                    ${p.type}
                </span>
            </td>
            <td class="px-8 py-5">
                <div class="text-[10px] font-bold text-slate-500 uppercase leading-none">Giá trị hàng: ${totalCargoValue.toLocaleString()}đ</div>
                <div class="text-red-500 font-black italic text-[11px] mt-2 flex items-center gap-1">
                    <i class="fas fa-coins text-[9px]"></i> Phí vận chuyển: ${totalFreightExpense.toLocaleString()}đ
                </div>
            </td>
            <td class="px-8 py-5 text-right">
                <div class="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button onclick="deletePartner('${
                      p.id
                    }')" class="w-8 h-8 bg-red-50 text-red-500 rounded-lg hover:bg-red-600 hover:text-white shadow-sm transition-all">
                        <i class="fas fa-trash-alt text-[10px]"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    })
    .join("");

  updateGlobalStats(orders);
}

function initPartnerPage() {
  renderPartnerList();
}

function handleAddPartner(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData.entries());
  const newPartner = {
    id: "PARTNER-" + Math.floor(1000 + Math.random() * 9000),
    name: data.name,
    type: data.type,
    contact: data.contact,
    status: "Active",
  };
  transportPartners.push(newPartner);
  saveAndSync();
  e.target.reset();
}

function deletePartner(id) {
  if (!confirm("Hệ thống sẽ xóa đối tác này và ngừng gán vận đơn. Tiếp tục?"))
    return;
  transportPartners = transportPartners.filter((p) => p.id !== id);
  saveAndSync();
}

function saveAndSync() {
  localStorage.setItem(
    "mina_transport_partners",
    JSON.stringify(transportPartners)
  );
  renderPartnerList();
  window.dispatchEvent(new Event("storage"));
}

function updateGlobalStats(orders) {
  const totalFreight = transportPartners.reduce((acc, p) => {
    const partnerOrders = orders.filter((o) => o.partnerId === p.id);
    return (
      acc +
      partnerOrders.reduce((sum, o) => sum + calculateFreightCost(o, p.type), 0)
    );
  }, 0);

  const el = document.getElementById("totalFreightValue");
  if (el) el.innerText = totalFreight.toLocaleString() + "đ";
}
