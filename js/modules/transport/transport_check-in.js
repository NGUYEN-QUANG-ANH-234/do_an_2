/**
 * transport_check-in.js - Tháp điều khiển vận tải Mina Rubber
 * Giả lập hành trình đồng bộ và thông báo hoàn tất tự động
 */

let checkinMap;
let markers = {};
let routeLines = {};
let movingTrucks = {};
const SIMULATION_SPEED = 5;

document.addEventListener("DOMContentLoaded", () => {
  initCheckinMap();
  renderActiveShippingList();

  window.addEventListener("storage", (e) => {
    if (e.key === "mina_orders") {
      renderActiveShippingList();
    }
  });
});

function initCheckinMap() {
  const rawLoc = MINA_API.CONFIG.WAREHOUSE_COORDS;
  const defaultLoc = {
    lat: parseFloat(rawLoc.lat),
    lng: parseFloat(rawLoc.lng),
  };

  checkinMap = L.map("checkinMap", {
    zoomControl: false,
    attributionControl: false,
  }).setView([defaultLoc.lat, defaultLoc.lng], 10);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(
    checkinMap
  );
  L.control.zoom({ position: "bottomright" }).addTo(checkinMap);

  // Marker Kho hàng
  L.marker([defaultLoc.lat, defaultLoc.lng], {
    zIndexOffset: 1000,
    icon: L.divIcon({
      className: "warehouse-marker",
      html: `<div class="bg-slate-900 text-white px-2 py-1 rounded shadow-lg text-[8px] font-black border-2 border-white uppercase italic">KHO TỔNG</div>`,
      iconSize: [100, 30],
    }),
  }).addTo(checkinMap);

  setTimeout(() => {
    checkinMap.invalidateSize();
  }, 500);
}

function renderActiveShippingList() {
  const orders = JSON.parse(localStorage.getItem("mina_orders")) || [];
  const container = document.getElementById("activeShippingList");
  const activeCountEl = document.getElementById("activeCount");

  const shippingOrders = orders.filter(
    (o) => o.status === "SHIPPING" && o.partnerId
  );
  if (activeCountEl) activeCountEl.innerText = shippingOrders.length;

  if (shippingOrders.length === 0) {
    container.innerHTML = `<div class="p-20 text-center opacity-30 italic text-xs font-bold uppercase">Mọi đơn hàng đã giao xong</div>`;
    return;
  }

  container.innerHTML = shippingOrders
    .map(
      (o) => `
        <div onclick="focusOrder('${o.id}')" id="card_${o.id}" class="p-4 border border-slate-100 rounded-2xl hover:border-blue-500 hover:shadow-md cursor-pointer transition-all bg-white group mb-3 last:mb-0">
            <div class="flex justify-between items-start mb-2">
                <span class="text-[10px] font-black text-blue-600 italic">#${o.id}</span>
                <span class="text-[8px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-black italic uppercase">${o.partnerName}</span>
            </div>
            <p class="text-xs font-black text-slate-700 uppercase italic mb-1 group-hover:text-blue-600">${o.agencyName}</p>
            <div id="status_${o.id}" class="text-[9px] text-blue-500 font-bold animate-pulse uppercase italic">Đang di chuyển...</div>
        </div>`
    )
    .join("");

  shippingOrders.forEach((o) => drawOrderOnMap(o));
  setTimeout(fitAllMarkers, 1000);
}

/**
 * transport_check-in.js - Tối ưu hiển thị Icon và Tọa độ
 */

/**
 * drawOrderOnMap - Bản hoàn thiện tích hợp định vị dự phòng
 * Đảm bảo hiển thị Đích đến và Xe tải ngay cả khi thiếu dữ liệu GPS danh mục
 */
async function drawOrderOnMap(order) {
  const agencies = JSON.parse(localStorage.getItem("mina_agencies")) || [];
  const agency = agencies.find(
    (a) => String(a.agency_id) === String(order.agencyId)
  );

  // 1. Xác định điểm xuất phát (KHO TỔNG)
  const startLoc = {
    lat: parseFloat(MINA_API.CONFIG.WAREHOUSE_COORDS.lat),
    lng: parseFloat(MINA_API.CONFIG.WAREHOUSE_COORDS.lng),
  };

  // 2. Xác định điểm đến (ĐẠI LÝ) với cơ chế dự phòng
  let destLoc = null;

  if (agency && agency.lat && agency.lng) {
    // Ưu tiên tọa độ từ danh mục
    destLoc = {
      lat: parseFloat(agency.lat),
      lng: parseFloat(agency.lng),
    };
  } else {
    // DỰ PHÒNG: Tìm tọa độ từ địa chỉ nếu danh mục trống (Giống Order Shipping)
    console.warn(
      `Đơn #${order.id}: Đang lấy tọa độ dự phòng từ địa chỉ: ${order.deliveryAddress}`
    );
    destLoc = await MINA_API.getCoordsFromAddress(
      order.deliveryAddress || order.agencyName
    );
  }

  // Kiểm tra tính hợp lệ của điểm đến cuối cùng
  if (!destLoc || isNaN(destLoc.lat) || destLoc.lat === 0) {
    console.error(
      `LỖI: Không thể định vị đơn #${order.id}. Vui lòng kiểm tra địa chỉ.`
    );
    return;
  }

  // 3. VẼ ĐẠI LÝ (ĐÍCH ĐẾN)
  L.marker([destLoc.lat, destLoc.lng], {
    zIndexOffset: 500,
    icon: L.divIcon({
      className: "dest-marker",
      html: `<div class="flex flex-col items-center">
                <div class="bg-blue-600 text-white px-2 py-1 rounded shadow-lg text-[8px] font-black border-2 border-white uppercase whitespace-nowrap">
                    <i class="fas fa-store mr-1"></i>${order.agencyName}
                </div>
                <div class="w-1 h-1 bg-blue-600 rounded-full shadow-lg mt-0.5"></div>
             </div>`,
      iconSize: [120, 30],
      iconAnchor: [60, 30],
    }),
  }).addTo(checkinMap);

  // 4. LẤY LỘ TRÌNH VÀ VẼ XE TẢI
  const routeData = await MINA_API.getRealRoute(startLoc, destLoc);

  if (routeData && routeData.geometry) {
    // Vẽ đường lộ trình nét đứt (Route line)
    if (routeLines[order.id]) checkinMap.removeLayer(routeLines[order.id]);
    routeLines[order.id] = L.polyline(routeData.geometry, {
      color: "#3b82f6",
      weight: 3,
      opacity: 0.3,
      dashArray: "5, 10",
    }).addTo(checkinMap);

    // Vẽ Marker XE TẢI
    if (markers[order.id]) checkinMap.removeLayer(markers[order.id]);
    markers[order.id] = L.marker([startLoc.lat, startLoc.lng], {
      zIndexOffset: 1000,
      icon: L.divIcon({
        className: "truck-marker",
        html: `<div class="relative flex flex-col items-center">
                <div class="bg-indigo-600 text-white px-2 py-1 rounded-lg shadow-xl text-[9px] font-black border-2 border-white animate-pulse flex items-center">
                    <i class="fas fa-truck mr-1" style="font-size: 10px;"></i> ${order.id}
                </div>
                <div class="w-2.5 h-2.5 bg-indigo-600 rotate-45 -mt-1.5 shadow-lg border-r border-b border-white/50"></div>
               </div>`,
        iconSize: [100, 35],
        iconAnchor: [50, 35],
      }),
    }).addTo(checkinMap).bindPopup(`
        <div class="p-1 text-[10px] font-bold">
            <p class="text-blue-600 uppercase border-b mb-1 pb-1">${order.agencyName}</p>
            <p>Đơn vị: ${order.partnerName}</p>
            <p>Khoảng cách: ${routeData.distance} km</p>
        </div>
    `);

    // 5. KÍCH HOẠT MÔ PHỎNG DI CHUYỂN
    simulateTruckMovement(order, routeData.geometry);
  } else {
    console.warn(
      `Vận đơn #${order.id}: Không tìm thấy lộ trình thực tế từ OSRM.`
    );
  }
}

function simulateTruckMovement(order, coordinates) {
  let index = 0;
  const totalSteps = coordinates.length;
  const orderId = order.id;

  // Xóa trình mô phỏng cũ nếu đang tồn tại cho đơn hàng này
  if (movingTrucks[orderId]) clearInterval(movingTrucks[orderId]);

  // Khởi tạo interval với tốc độ tùy chỉnh
  movingTrucks[orderId] = setInterval(() => {
    if (index >= totalSteps) {
      clearInterval(movingTrucks[orderId]);
      // Xóa bỏ tham chiếu khi hoàn tất để đảm bảo giải phóng bộ nhớ
      delete movingTrucks[orderId];
      completeOrder(order);
      return;
    }

    const currentPos = coordinates[index];
    // Chú ý: OSRM trả về [lat, lng], đảm bảo thứ tự này khớp với Leaflet
    const latLng = [currentPos[0], currentPos[1]];

    if (markers[orderId]) {
      markers[orderId].setLatLng(latLng);
    }

    // Ghi tọa độ xuống localStorage để trang Order Shipping đồng bộ theo
    updateLivePosition(orderId, latLng);
    index++;
  }, SIMULATION_SPEED); // <-- SỬA TẠI ĐÂY: Dùng biến để chủ động tốc độ
}
/**
 * HÀM XỬ LÝ KHI XE ĐẾN ĐÍCH - Đã sửa để đồng bộ trang Duyệt Nhập Kho
 */
function completeOrder(order) {
  const orderId = order.id;

  // 1. CẬP NHẬT TRẠNG THÁI VÀO CSDL (Cực kỳ quan trọng để không bị restart)
  let orders = JSON.parse(localStorage.getItem("mina_orders")) || [];
  const orderIndex = orders.findIndex((o) => String(o.id) === String(orderId));

  if (orderIndex !== -1) {
    // Chuyển sang trạng thái chờ duyệt, tránh việc render lại sẽ kích hoạt SHIPPING
    orders[orderIndex].status = "ARRIVED";
    localStorage.setItem("mina_orders", JSON.stringify(orders));
  }

  // 2. Xóa tọa độ live GPS
  let liveData = JSON.parse(localStorage.getItem("mina_live_gps")) || {};
  delete liveData[orderId];
  localStorage.setItem("mina_live_gps", JSON.stringify(liveData));

  // 3. Cập nhật giao diện thông báo
  const statusEl = document.getElementById(`status_${orderId}`);
  if (statusEl) {
    statusEl.innerText = "ĐÃ CẬP BẾN - CHỜ DUYỆT NHẬP KHO!";
    statusEl.className =
      "text-[9px] text-indigo-600 font-black uppercase italic animate-bounce";
  }

  // 4. Thông báo Toast
  if (window.showToast) {
    window.showToast(`Vận đơn #${orderId} đã đến đích an toàn!`, "success");
  }

  // Kích hoạt sự kiện để các tab khác (như Dashboard/Portal) cập nhật theo
  window.dispatchEvent(new Event("storage"));

  // Đợi 3 giây để người dùng thấy trạng thái rồi mới vẽ lại danh sách
  setTimeout(() => {
    if (typeof renderActiveShippingList === "function") {
      renderActiveShippingList();
    }
  }, 3000);
}

function updateLivePosition(orderId, latLng) {
  // Chỉ cập nhật nếu đơn hàng vẫn đang trong tiến trình chạy
  if (!movingTrucks[orderId]) return;

  let liveData = JSON.parse(localStorage.getItem("mina_live_gps")) || {};
  liveData[orderId] = {
    lat: latLng[0],
    lng: latLng[1],
    timestamp: Date.now(),
  };
  localStorage.setItem("mina_live_gps", JSON.stringify(liveData));
}

function focusOrder(orderId) {
  if (markers[orderId]) {
    checkinMap.flyTo(markers[orderId].getLatLng(), 14, { duration: 1.5 });
    markers[orderId].openPopup();
    document
      .querySelectorAll('[id^="card_"]')
      .forEach((el) => el.classList.remove("border-blue-500", "ring-2"));
    document
      .getElementById(`card_${orderId}`)
      .classList.add("border-blue-500", "ring-2");
  }
}

function fitAllMarkers() {
  const allLatLngs = Object.values(markers).map((m) => m.getLatLng());
  if (allLatLngs.length > 0) {
    const bounds = L.latLngBounds(allLatLngs);
    checkinMap.fitBounds(bounds, { padding: [100, 100], maxZoom: 12 });
  }
}
