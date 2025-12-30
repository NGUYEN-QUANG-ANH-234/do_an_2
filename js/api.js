/**
 * js/api.js
 * Hệ thống API xử lý vị trí thực tế cho Mina Rubber
 * Sử dụng OpenStreetMap (Nominatim) và OSRM (Routing)
 */

const MINA_API = {
  // 1. Cấu hình hằng số
  CONFIG: {
    WAREHOUSE_COORDS: { lat: 21.0285, lng: 105.8542 }, // Tọa độ Kho tổng mặc định
    OSRM_BASE_URL: "https://router.project-osrm.org/route/v1/driving/",
    NOMINATIM_BASE_URL: "https://nominatim.openstreetmap.org/",
  },

  /**
   * 2. LẤY VỊ TRÍ GPS HIỆN TẠI (Dành cho thiết bị di động/trình duyệt)
   * @returns {Promise} Tọa độ {lat, lng}
   */
  async getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject("Trình duyệt của bạn không hỗ trợ định vị GPS.");
        return;
      }

      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      };

      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject("Lỗi GPS: " + err.message),
        options
      );
    });
  },

  /**
   * 3. BIẾN ĐỊA CHỈ THÀNH TỌA ĐỘ (Geocoding)
   * Dùng khi Đại lý nhập địa chỉ cửa hàng hoặc địa chỉ giao hàng
   */
  async getCoordsFromAddress(address) {
    if (!address) return null;
    try {
      const response = await fetch(
        `${
          this.CONFIG.NOMINATIM_BASE_URL
        }search?format=json&q=${encodeURIComponent(address)}`
      );
      const data = await response.json();
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          displayName: data[0].display_name,
        };
      }
      return null;
    } catch (error) {
      console.error("Lỗi Geocoding:", error);
      return null;
    }
  },

  /**
   * 4. TÍNH LỘ TRÌNH ĐƯỜNG BỘ THỰC TẾ (Routing)
   * Trả về khoảng cách (km), thời gian (phút) và danh sách tọa độ uốn lượn để vẽ bản đồ
   */
  async getRealRoute(start, end) {
    try {
      // Định dạng OSRM: lng,lat;lng,lat
      const url = `${this.CONFIG.OSRM_BASE_URL}${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.code !== "Ok")
        throw new Error("Không tìm thấy đường bộ phù hợp.");

      const route = data.routes[0];
      return {
        distance: (route.distance / 1000).toFixed(2), // km
        duration: Math.round(route.duration / 60), // phút
        geometry: route.geometry.coordinates.map((c) => [c[1], c[0]]), // Chuyển về [lat, lng] cho Leaflet
      };
    } catch (error) {
      console.error("Lỗi lấy lộ trình:", error);
      return null;
    }
  },

  /**
   * 5. QUẢN LÝ DỮ LIỆU VỊ TRÍ TRÊN HỆ THỐNG
   * Giả lập việc cập nhật vị trí tài xế vào "Database" (LocalStorage)
   */
  updateDriverLocation(orderId, coords) {
    const liveTracking =
      JSON.parse(localStorage.getItem("mina_live_tracking")) || {};
    liveTracking[orderId] = {
      ...coords,
      lastUpdate: new Date().toISOString(),
    };
    localStorage.setItem("mina_live_tracking", JSON.stringify(liveTracking));
  },

  getDriverLocation(orderId) {
    const liveTracking =
      JSON.parse(localStorage.getItem("mina_live_tracking")) || {};
    return liveTracking[orderId] || null;
  },

  /**
   * 6. TÍNH KHOẢNG CÁCH CHIM BAY (Để so sánh hoặc dùng nhanh)
   */
  calculateCrowFliesDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(2);
  },
};

function processFinalConfirmation(orderId) {
  // 1. Cập nhật mina_orders
  let orders = JSON.parse(localStorage.getItem("mina_orders")) || [];
  const idx = orders.findIndex((o) => o.id === orderId);

  if (idx !== -1) {
    orders[idx].status = "DELIVERED";
    orders[idx].deliveredAt = new Date().toLocaleString("vi-VN");
    localStorage.setItem("mina_orders", JSON.stringify(orders));

    // 2. Xóa GPS live để dừng chạy xe
    let liveGPS = JSON.parse(localStorage.getItem("mina_live_gps")) || {};
    delete liveGPS[orderId];
    localStorage.setItem("mina_live_gps", JSON.stringify(liveGPS));

    // 3. Thông báo và chuyển hướng hoặc nạp lại
    alert(
      `Vận đơn #${orderId} đã hoàn thành và được lưu vào Lịch sử tài chính.`
    );
    window.location.reload();
  }
}

// Đóng gói để dùng trong môi trường trình duyệt
window.MINA_API = MINA_API;
