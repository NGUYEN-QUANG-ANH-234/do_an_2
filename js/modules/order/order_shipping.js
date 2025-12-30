/**
 * order_shipping.js - Theo dõi hành trình tích hợp điểm đi/điểm đến và lộ trình thực tế
 * Tối ưu hiển thị Kho hàng và Đại lý nhận hàng
 */

let map;
let driverMarker;
let warehouseMarker;
let destinationMarker;
let routeLine;

document.addEventListener("DOMContentLoaded", () => {
  initMap();
  renderShippingList();

  /**
   * 1. LẮNG NGHE SỰ KIỆN STORAGE (Đồng bộ giữa các Tab)
   */
  window.addEventListener("storage", (e) => {
    // A. Đồng bộ vị trí xe tải khi trang Check-in cập nhật tọa độ
    if (e.key === "mina_live_gps" && e.newValue) {
      const displayOrderIdNode = document.getElementById("displayOrderId");
      if (displayOrderIdNode) {
        const currentOrderId = displayOrderIdNode.innerText
          .replace("#", "")
          .trim();
        const liveData = JSON.parse(e.newValue);

        // Chỉ thực hiện cập nhật nếu đơn hàng đang hiển thị khớp với dữ liệu GPS mới
        if (currentOrderId && liveData[currentOrderId]) {
          syncDriverPosition(currentOrderId);
        }
      }
    }

    // B. Đồng bộ trạng thái đơn hàng (Khi Admin duyệt hoặc xác nhận hoàn tất)
    if (e.key === "mina_orders") {
      renderShippingList();
      const displayOrderIdNode = document.getElementById("displayOrderId");
      if (displayOrderIdNode) {
        const orderId = displayOrderIdNode.innerText.replace("#", "").trim();
        // Nạp lại lộ trình và timeline để cập nhật trạng thái mới nhất (ví dụ: DELIVERED)
        if (orderId) trackOrder(orderId);
      }
    }
  });

  /**
   * 2. CƠ CHẾ QUÉT DỰ PHÒNG (Polling)
   * Đảm bảo xe vẫn di chuyển mượt mà nếu sự kiện storage bị trễ hoặc chạy trên cùng 1 tab.
   */
  setInterval(() => {
    const displayOrderIdNode = document.getElementById("displayOrderId");
    if (displayOrderIdNode) {
      const currentOrderId = displayOrderIdNode.innerText
        .replace("#", "")
        .trim();
      if (currentOrderId) {
        // Kiểm tra xem có dữ liệu GPS trong bộ nhớ không để cập nhật marker
        const liveData =
          JSON.parse(localStorage.getItem("mina_live_gps")) || {};
        if (liveData[currentOrderId]) {
          syncDriverPosition(currentOrderId);
        }
      }
    }
  }, 1000); // Quét mỗi giây một lần khớp với tốc độ mô phỏng
});

// Đảm bảo bạn có các biến này khai báo ở đầu file (ngoài hàm)
// let destinationMarker, routeLine, driverMarker;

async function trackOrder(orderId) {
  // 1. Lấy dữ liệu nguồn
  const user = JSON.parse(localStorage.getItem("mina_user"));
  const orders = JSON.parse(localStorage.getItem("mina_orders")) || [];
  const agencies = JSON.parse(localStorage.getItem("mina_agencies")) || [];
  const order = orders.find((o) => o.id === orderId);

  // KIỂM TRA QUYỀN SỞ HỮU VẬN ĐƠN:
  if (user.role === "AGENCY" && order && user.agencyId !== user.id) {
    showToast("Bạn không có quyền xem hành trình của vận đơn này!", "danger");
    return;
  }

  if (!order) {
    if (window.showToast)
      showToast("Không tìm thấy thông tin đơn hàng!", "danger");
    return;
  }

  document.getElementById("displayOrderId").innerText = `#${orderId}`;
  if (window.showToast)
    showToast(`Đang nạp hành trình đơn #${orderId}...`, "info");

  // 2. Tìm thông tin đại lý và tọa độ
  const agencyData = agencies.find(
    (a) => String(a.agency_id) === String(order.agencyId)
  );
  const startLoc = MINA_API.CONFIG.WAREHOUSE_COORDS;

  let destLoc = null;
  // SỬA: Ưu tiên dùng tọa độ thật từ Profile Đại lý bạn vừa tạo ở Admin
  if (agencyData && agencyData.lat && agencyData.lng) {
    destLoc = {
      lat: parseFloat(agencyData.lat),
      lng: parseFloat(agencyData.lng),
    };
  } else {
    // Dự phòng: Nếu Admin quên không lấy GPS lúc tạo, thì mới dùng Geocoding
    destLoc = await MINA_API.getCoordsFromAddress(
      order.deliveryAddress || agencyData?.address || order.agencyName
    );
  }
  // 3. Kiểm tra tọa độ đích hợp lệ
  if (destLoc && destLoc.lat !== 0) {
    // A. Hiển thị Marker ĐẠI LÝ (ĐÍCH ĐẾN)
    if (destinationMarker) map.removeLayer(destinationMarker);

    destinationMarker = L.marker([destLoc.lat, destLoc.lng], {
      icon: L.divIcon({
        className: "dest-label",
        html: `<div class="bg-blue-600 text-white px-3 py-1 rounded-full shadow-xl text-[10px] font-black border-2 border-white whitespace-nowrap">
                        <i class="fas fa-store mr-1"></i> ĐÍCH: ${order.agencyName}
                       </div>`,
        iconSize: [120, 24],
        iconAnchor: [60, 12],
      }),
    }).addTo(map);

    // Thêm Popup thông tin liên hệ cho Marker đại lý
    destinationMarker.bindPopup(`
            <div class="text-xs font-bold">
                <p class="text-blue-600 uppercase mb-1">${order.agencyName}</p>
                <p><i class="fas fa-user mr-1 text-slate-400"></i> ${
                  agencyData ? agencyData.contact_person : "N/A"
                }</p>
                <p><i class="fas fa-phone-alt mr-1 text-slate-400"></i> ${
                  agencyData ? agencyData.contact_phone : "N/A"
                }</p>
            </div>
        `);

    // B. Lấy lộ trình đường bộ thực tế (OSRM)
    const routeData = await MINA_API.getRealRoute(startLoc, destLoc);

    if (routeData) {
      // Xóa đường vẽ cũ
      if (routeLine) map.removeLayer(routeLine);

      // Vẽ đường đi mới (uốn lượn theo đường thực)
      routeLine = L.polyline(routeData.geometry, {
        color: "#2563eb",
        weight: 6,
        opacity: 0.7,
        lineJoin: "round",
      }).addTo(map);

      // C. Cập nhật vị trí TÀI XẾ (Ưu tiên dữ liệu Live từ mina_live_gps)
      const liveData = JSON.parse(localStorage.getItem("mina_live_gps")) || {};
      // Nếu có dữ liệu trong mina_live_gps (từ trang Check-in), dùng nó. Nếu không dùng vị trí mặc định
      const livePos =
        liveData[orderId] || MINA_API.getDriverLocation(orderId) || startLoc;

      if (driverMarker) {
        driverMarker
          .setLatLng([livePos.lat, livePos.lng])
          .setPopupContent(
            `
        <div class="text-[10px] font-black italic">
            XE TẢI ĐANG GIAO #${orderId}<br>
            <span class="text-blue-600">KHOẢNG CÁCH: ${routeData.distance} KM</span>
        </div>
    `
          )
          .openPopup();
      }

      // CHÈN THÊM DÒNG NÀY: Để kiểm tra xe đã đến đích chưa ngay khi bấm xem đơn
      updateArrivalUI(orderId, routeData.distance);

      // D. TỰ ĐỘNG CĂN CHỈNH KHUNG HÌNH (FitBounds)
      const bounds = L.latLngBounds(
        [startLoc.lat, startLoc.lng],
        [destLoc.lat, destLoc.lng]
      );
      map.fitBounds(bounds, { padding: [100, 100], maxZoom: 15 });

      // Cập nhật thông báo text phía trên bản đồ
      const locationText = document.getElementById("currentLocationText");
      if (locationText) {
        locationText.innerText = `${routeData.distance} km đến đích (Dự kiến ${routeData.duration} phút)`;
      }
    }
  } else {
    if (window.showToast) {
      showToast(
        "Đại lý này chưa có tọa độ GPS. Hãy cập nhật tại Danh mục đại lý!",
        "danger"
      );
    }
  }

  // 4. Cập nhật Timeline bên dưới
  if (typeof renderTimeline === "function") {
    renderTimeline(order);
  }
}

/**
 * Khởi tạo bản đồ Leaflet
 */
function initMap() {
  // Lấy tọa độ Kho tổng từ cấu hình
  const defaultLoc = MINA_API.CONFIG.WAREHOUSE_COORDS;

  map = L.map("map").setView([defaultLoc.lat, defaultLoc.lng], 13);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
  }).addTo(map);

  // 1. Hiển thị KHO HÀNG cố định với icon tùy chỉnh (DivIcon để hiện chữ)
  warehouseMarker = L.marker([defaultLoc.lat, defaultLoc.lng], {
    icon: L.divIcon({
      className: "custom-warehouse-icon",
      html: `<div class="bg-slate-900 text-white px-2 py-1 rounded shadow-lg text-[9px] font-black uppercase border border-slate-700 whitespace-nowrap">
                <i class="fas fa-warehouse mr-1"></i>KHO MINA
             </div>`,
      iconSize: [80, 20],
      iconAnchor: [40, 0],
    }),
  }).addTo(map);

  // 2. Khởi tạo Marker tài xế (Mặc định ở kho)
  driverMarker = L.marker([defaultLoc.lat, defaultLoc.lng]).addTo(map);
}

/**
 * 1. Hiển thị danh sách đơn hàng CÁ NHÂN HÓA theo vai trò
 */
function renderShippingList() {
  const user = JSON.parse(localStorage.getItem("mina_user"));
  const orders = JSON.parse(localStorage.getItem("mina_orders")) || [];
  const container = document.getElementById("shippingList");

  if (!user || !container) return;

  // Lọc: Đại lý chỉ thấy đơn của mình, Kho/Admin thấy tất cả
  // LỌC: Nếu là Đại lý, chỉ lấy đơn của họ đang ở trạng thái SHIPPING
  // SỬA: Lọc đơn hàng dựa trên ID đồng bộ
  const myShippingOrders =
    user.role === "AGENCY"
      ? orders.filter(
          (o) =>
            String(o.agencyId) === String(user.id) && o.status === "SHIPPING"
        )
      : orders.filter((o) => o.status === "SHIPPING");

  if (myShippingOrders.length === 0) {
    container.innerHTML = `
            <div class="bg-white p-6 rounded-3xl border border-dashed border-slate-200 text-center italic text-slate-400 text-sm">
                Hiện không có vận đơn nào đang di chuyển tới bạn.
            </div>`;
    return;
  }

  container.innerHTML = myShippingOrders
    .map(
      (o) => `
        <div onclick="trackOrder('${o.id}')" class="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:border-blue-500 cursor-pointer transition-all group relative overflow-hidden">
            <div class="flex justify-between items-center mb-2">
                <span class="text-xs font-black text-blue-600 italic tracking-widest">#${o.id}</span>
                <span class="animate-pulse w-2 h-2 bg-green-500 rounded-full"></span>
            </div>
            <p class="text-sm font-black text-slate-700 mb-1 uppercase italic leading-tight">${o.productName}</p>
            <p class="text-[10px] text-slate-400 uppercase font-bold tracking-tighter italic">Đích: ${o.agencyName}</p>
        </div>
    `
    )
    .join("");
}

/**
 * 2. Theo dõi chi tiết với LỘ TRÌNH THỰC TẾ & TỌA ĐỘ GPS ĐẠI LÝ
 * Đảm bảo hiển thị đúng vị trí Kho, Đại lý và Tài xế
 */
async function trackOrder(orderId) {
  // A. Lấy dữ liệu nguồn từ hệ thống
  const orders = JSON.parse(localStorage.getItem("mina_orders")) || [];
  const agencies = JSON.parse(localStorage.getItem("mina_agencies")) || [];
  const order = orders.find((o) => o.id === orderId);

  if (!order) return;

  // Cập nhật mã vận đơn lên giao diện
  document.getElementById("displayOrderId").innerText = `#${orderId}`;
  if (window.showToast)
    showToast(`Đang nạp hành trình vận đơn #${orderId}...`, "info");

  // B. XÁC ĐỊNH ĐIỂM ĐI (KHO TỔNG) & ĐIỂM ĐẾN (ĐẠI LÝ)
  const startLoc = MINA_API.CONFIG.WAREHOUSE_COORDS;

  // TÌM CHÍNH XÁC ĐẠI LÝ TRONG DANH MỤC ĐÃ THIẾT LẬP
  const agencyData = agencies.find((a) => a.agency_id === order.agencyId);

  let destLoc = null;
  // Ưu tiên dùng tọa độ Lat/Lng thật đã lưu trong profile Đại lý
  if (agencyData && agencyData.lat && agencyData.lng) {
    destLoc = {
      lat: parseFloat(agencyData.lat),
      lng: parseFloat(agencyData.lng),
    };
  } else {
    // Dự phòng: Tìm tọa độ từ địa chỉ nếu chưa được định vị GPS trước đó
    destLoc = await MINA_API.getCoordsFromAddress(
      order.deliveryAddress || order.agencyName
    );
  }

  if (destLoc) {
    // 1. Hiển thị Marker ĐỊA ĐIỂM ĐẠI LÝ (Đích đến)
    if (destinationMarker) map.removeLayer(destinationMarker);

    destinationMarker = L.marker([destLoc.lat, destLoc.lng], {
      icon: L.divIcon({
        className: "custom-dest-icon",
        html: `<div class="bg-blue-600 text-white px-3 py-1 rounded-full shadow-xl text-[10px] font-black uppercase border-2 border-white whitespace-nowrap">
                <i class="fas fa-store mr-1"></i> ĐẠI LÝ: ${order.agencyName}
               </div>`,
        iconSize: [140, 24],
        iconAnchor: [70, 12],
      }),
    }).addTo(map);

    // Thêm Popup thông tin liên hệ đại lý khi click vào marker đích
    // CẬP NHẬT POPUP: Hiển thị thông tin liên hệ thật từ Admin đã tạo
    if (destinationMarker && agencyData) {
      destinationMarker.bindPopup(`
        <div class="text-xs font-bold text-slate-700">
            <p class="text-blue-600 uppercase mb-1">${
              agencyData.agency_name
            }</p>
            <p><i class="fas fa-map-marker-alt mr-2 text-slate-300"></i>${
              agencyData.address || "N/A"
            }</p>
            <p><i class="fas fa-phone-alt mr-2 text-slate-300"></i>${
              agencyData.contact_phone || "Chưa có SĐT"
            }</p>
            <p><i class="fas fa-user mr-2 text-slate-300"></i>${
              agencyData.contact_person || "N/A"
            }</p>
        </div>
    `);
    }

    // 2. LẤY LỘ TRÌNH THỰC TẾ (OSRM API)
    const routeData = await MINA_API.getRealRoute(startLoc, destLoc);

    if (routeData) {
      // Làm sạch đường cũ
      if (routeLine) map.removeLayer(routeLine);

      // Vẽ đường đi uốn lượn thực tế theo đường bộ
      routeLine = L.polyline(routeData.geometry, {
        color: "#2563eb",
        weight: 6,
        opacity: 0.6,
        dashArray: "10, 15",
        lineJoin: "round",
      }).addTo(map);

      // 3. CẬP NHẬT VỊ TRÍ TÀI XẾ (DRIVER)
      const livePos = MINA_API.getDriverLocation(orderId) || startLoc;

      // CẬP NHẬT MARKER TÀI XẾ
      if (driverMarker) {
        driverMarker
          .setLatLng([livePos.lat, livePos.lng])
          .setPopupContent(
            `
                <div class="text-xs font-bold p-1">
                    <p class="text-blue-600 uppercase italic mb-1">Vận đơn #${orderId}</p>
                    <p><i class="fas fa-road mr-1 text-slate-400"></i>Còn ${routeData.distance}km</p>
                    <p><i class="fas fa-clock mr-1 text-slate-400"></i>Dự kiến: ${routeData.duration}p</p>
                </div>
            `
          )
          .openPopup();
      }

      // 4. TỰ ĐỘNG CĂN CHỈNH BẢN ĐỒ ĐỂ THẤY TOÀN BỘ HÀNH TRÌNH
      // Tạo vùng bao quanh điểm đi và điểm đến
      const bounds = L.latLngBounds(
        [startLoc.lat, startLoc.lng],
        [destLoc.lat, destLoc.lng]
      );
      map.fitBounds(bounds, { padding: [100, 100], maxZoom: 15 });

      // Cập nhật văn bản hiển thị khoảng cách
      document.getElementById(
        "currentLocationText"
      ).innerText = `${routeData.distance} km đến đích (Dự kiến ${routeData.duration} phút)`;
    }
  } else {
    if (window.showToast)
      showToast(
        "Lỗi định vị: Đại lý chưa có tọa độ GPS trên hệ thống!",
        "danger"
      );
  }

  // Cập nhật Timeline đơn hàng
  if (typeof renderTimeline === "function") renderTimeline(order);
}

// --- 3. HÀM HỖ TRỢ (DÀNH CHO MỞ RỘNG) ---

function createLabelIcon(text, colorClass) {
  return L.divIcon({
    className: "custom-label",
    html: `<div class="${colorClass} text-white px-3 py-1 rounded-full shadow-xl text-[9px] font-black uppercase border-2 border-white whitespace-nowrap">${text}</div>`,
    iconSize: [140, 24],
    iconAnchor: [70, 12],
  });
}

function renderDestinationMarker(loc, name, agency) {
  if (destinationMarker) map.removeLayer(destinationMarker);
  destinationMarker = L.marker([loc.lat, loc.lng], {
    icon: createLabelIcon(`ĐẠI LÝ: ${name}`, "bg-blue-600"),
  }).addTo(map);

  destinationMarker.bindPopup(`
        <div class="text-xs font-bold text-slate-700">
            <p class="text-blue-600 uppercase mb-1">${name}</p>
            <p><i class="fas fa-phone-alt mr-2 text-slate-300"></i>${
              agency?.contact_phone || "N/A"
            }</p>
            <p><i class="fas fa-user mr-2 text-slate-300"></i>${
              agency?.contact_person || "N/A"
            }</p>
        </div>
    `);
}

function renderRouteLine(geometry) {
  if (routeLine) map.removeLayer(routeLine);
  routeLine = L.polyline(geometry, {
    color: "#2563eb",
    weight: 6,
    opacity: 0.6,
    dashArray: "10, 15",
    lineJoin: "round",
  }).addTo(map);
}

/**
 * Cập nhật giao diện vị trí tài xế, thông tin lộ trình và kiểm tra trạng thái về đích
 * @param {Object} pos - Tọa độ hiện tại từ GPS {lat, lng}
 * @param {string} id - Mã vận đơn (OrderId)
 * @param {Object} route - Thông tin tính toán {distance, duration}
 */
function updateDriverUI(pos, id, route) {
  // 1. Kiểm tra dữ liệu đầu vào để tránh lỗi crash script
  if (!pos || !id || !route) return;

  const orders = JSON.parse(localStorage.getItem("mina_orders")) || [];
  const order = orders.find((o) => String(o.id) === String(id));

  // 2. Cập nhật Marker xe tải trên bản đồ
  if (driverMarker) {
    // Di chuyển xe đến tọa độ mới mượt mà
    driverMarker.setLatLng([pos.lat, pos.lng]);

    // Cập nhật nội dung Popup với thông tin Partner và khoảng cách thực tế
    driverMarker.setPopupContent(`
            <div class="text-[10px] font-bold p-1 leading-relaxed">
                <div class="text-blue-600 uppercase italic border-b border-slate-100 pb-1 mb-1 flex justify-between">
                    <span>${order?.partnerName || "Đang giao hàng"}</span>
                    <span class="text-slate-400">#${id}</span>
                </div>
                <div class="flex items-center gap-2 mb-0.5">
                    <i class="fas fa-truck text-blue-500 animate-pulse"></i>
                    <span class="text-slate-700">Trạng thái: <span class="text-green-600">Đang di chuyển</span></span>
                </div>
                <div class="flex items-center gap-2">
                    <i class="fas fa-map-marker-alt text-red-500"></i>
                    <span class="text-slate-700">Cách đích: <span class="font-black text-blue-600">${
                      route.distance
                    } km</span></span>
                </div>
            </div>
        `);

    // Luôn giữ Popup mở để người dùng theo dõi liên tục
    if (!driverMarker.isPopupOpen()) {
      driverMarker.openPopup();
    }

    // 3. XỬ LÝ NÚT XÁC NHẬN (Cực kỳ quan trọng cho KPI Tài chính)
    // Nếu khoảng cách <= 0.5km, hàm updateArrivalUI sẽ hiển thị nút "Xác nhận nhận hàng"
    if (typeof updateArrivalUI === "function") {
      updateArrivalUI(id, route.distance);
    }

    // 4. CẬP NHẬT TRẠNG THÁI TEXT TRÊN GIAO DIỆN
    const locationText = document.getElementById("currentLocationText");
    if (locationText) {
      locationText.innerHTML = `
                <span class="text-blue-600 font-black">${route.distance} km</span> đến đích 
                <span class="text-slate-400 mx-2">|</span> 
                Dự kiến: <span class="text-slate-700 font-bold">${route.duration} phút</span>
            `;
    }
  }
}

/**
 * Xử lý xác nhận và đồng bộ về Lịch sử tài chính
 */
function processFinalConfirmation(orderId) {
  if (!confirm(`Bạn xác nhận đã nhận đủ hàng cho đơn #${orderId}?`)) return;

  let orders = JSON.parse(localStorage.getItem("mina_orders")) || [];
  const idx = orders.findIndex((o) => o.id === orderId);

  if (idx !== -1) {
    orders[idx].status = "DELIVERED";
    orders[idx].deliveredAt = new Date().toLocaleString("vi-VN");
    localStorage.setItem("mina_orders", JSON.stringify(orders));

    // Xóa GPS live để dọn dẹp bộ nhớ
    let liveGPS = JSON.parse(localStorage.getItem("mina_live_gps")) || {};
    delete liveGPS[orderId];
    localStorage.setItem("mina_live_gps", JSON.stringify(liveGPS));

    alert(
      `Đã xác nhận thành công đơn #${orderId}. Dữ liệu đã chuyển vào Lịch sử.`
    );
    window.location.reload();
  }
}

/**
 * 4. Render Timeline trạng thái
 */
function renderTimeline(order) {
  const timeline = document.getElementById("shippingTimeline");
  const steps = [
    { label: "Đơn hàng xác lập", time: order.createdAt, done: true },
    {
      label: "Bốc hàng & Xuất kho",
      time: order.shippedAt || "Hôm nay",
      done: !!order.shippedAt,
    },
    { label: "Đang vận chuyển", time: "Hành trình thực tế", done: true },
    {
      label: "Giao hàng thành công",
      time: "Dự kiến trong ngày",
      done: order.status === "DELIVERED",
    },
  ];

  timeline.innerHTML = steps
    .map(
      (s) => `
        <div class="relative ${s.done ? "opacity-100" : "opacity-40"}">
            <div class="absolute -left-[49px] w-4 h-4 ${
              s.done
                ? "bg-blue-600 border-blue-200"
                : "bg-slate-200 border-white"
            } rounded-full border-4 shadow-sm transition-all duration-500"></div>
            <p class="text-xs font-black uppercase italic ${
              s.done ? "text-slate-800" : "text-slate-400"
            }">${s.label}</p>
            <p class="text-[10px] text-slate-400 font-bold mt-0.5">${s.time}</p>
        </div>
    `
    )
    .join("");
}

/**
 * Đồng bộ vị trí xe tải từ bộ nhớ dùng chung
 */
/**
 * Đồng bộ vị trí xe tải từ bộ nhớ dùng chung và cập nhật giao diện thời gian thực
 */
function syncDriverPosition(orderId) {
  const user = JSON.parse(localStorage.getItem("mina_user"));
  const orders = JSON.parse(localStorage.getItem("mina_orders")) || [];
  const order = orders.find((o) => o.id === orderId);

  // CHẶN: Nếu là Agency và không phải đơn của mình, không cập nhật GPS
  if (
    user.role === "AGENCY" &&
    order &&
    String(order.agencyId) !== String(user.id)
  )
    return;

  const liveData = JSON.parse(localStorage.getItem("mina_live_gps")) || {};
  const pos = liveData[orderId];

  // Chỉ thực hiện nếu có đủ Marker xe và Marker đích để tính toán
  if (pos && driverMarker && destinationMarker) {
    const newLatLng = [pos.lat, pos.lng];

    // 1. Cập nhật vị trí Marker xe tải
    driverMarker.setLatLng(newLatLng);

    // 2. Tính toán khoảng cách thực tế dựa trên vị trí hiện tại của xe và đích
    const destLatLng = destinationMarker.getLatLng();
    const distanceInMeters = map.distance(newLatLng, destLatLng);
    const distanceInKm = (distanceInMeters / 1000).toFixed(2);

    // 3. Tính toán thời gian dự kiến (Duration)
    // Giả sử xe tải chạy trung bình 40km/h trong đô thị (~1.5 phút/km)
    const estimatedDuration = Math.round(distanceInKm * 5);

    // 4. Cập nhật giao diện (Popup, Nút xác nhận, Thông tin text)
    updateDriverUI(pos, orderId, {
      distance: distanceInKm,
      duration: estimatedDuration > 0 ? estimatedDuration : 0,
    });

    // 5. Tự động căn chỉnh bản đồ nếu xe đi ra ngoài khung hình (Tùy chọn)
    // map.panTo(newLatLng);
  }
}
