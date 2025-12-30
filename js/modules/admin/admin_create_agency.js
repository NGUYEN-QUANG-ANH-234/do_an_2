/**
 * admin_create_agency.js - Trung tâm khởi tạo thực thể Đại lý
 * Kết nối dữ liệu: Master Data -> Account Security -> Contract Management
 */

document.addEventListener("DOMContentLoaded", () => {
  // 1. Tự động tạo mã ID gợi ý khi load trang
  generateSuggestedID();

  // 2. Lắng nghe sự kiện nộp form
  const createForm = document.getElementById("createAgencyForm");
  if (createForm) {
    createForm.addEventListener("submit", handleCreateAgency);
  }
});

/**
 * 1. XỬ LÝ LƯU DỮ LIỆU ĐA TẦNG
 */
async function handleCreateAgency(e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData.entries());

  // Kiểm tra dữ liệu đầu vào cơ bản
  if (!data.agency_id || !data.username || !data.password) {
    triggerNotification(
      "Vui lòng nhập đầy đủ Mã ID, Username và Mật khẩu!",
      "danger"
    );
    return;
  }

  // A. KIỂM TRA TRÙNG LẶP (Ràng buộc duy nhất)
  let agencies = JSON.parse(localStorage.getItem("mina_agencies")) || [];

  const isIdDuplicate = agencies.some(
    (a) =>
      String(a.agency_id).toLowerCase() === String(data.agency_id).toLowerCase()
  );
  const isUserDuplicate = agencies.some(
    (a) =>
      String(a.username).toLowerCase() === String(data.username).toLowerCase()
  );

  if (isIdDuplicate) {
    triggerNotification("Lỗi: Mã đại lý (ID) này đã tồn tại!", "danger");
    return;
  }
  if (isUserDuplicate) {
    triggerNotification(
      "Lỗi: Tên đăng nhập (Username) này đã được sử dụng!",
      "danger"
    );
    return;
  }

  // B. Lưu vào danh sách Đại lý chính (mina_agencies)
  const newAgency = {
    ...data,
    role: "AGENCY", // Phân quyền cho module Login
    createdAt: new Date().toLocaleString("vi-VN"),
    status: "PENDING_CONTRACT",
  };

  agencies.unshift(newAgency);
  localStorage.setItem("mina_agencies", JSON.stringify(agencies));

  // C. TỰ ĐỘNG KHỞI TẠO HỢP ĐỒNG (Để đồng bộ Portal Đại lý)
  let contracts = JSON.parse(localStorage.getItem("mina_contracts")) || [];
  contracts.push({
    agency_id: data.agency_id,
    status: "Pending", // Trạng thái mặc định để hiện nút kích hoạt
    start_date: new Date().toISOString().split("T")[0],
    end_date: "2030-12-31",
    updatedAt: new Date().toISOString(),
  });
  localStorage.setItem("mina_contracts", JSON.stringify(contracts));

  // D. GHI NHẬT KÝ HỆ THỐNG (Audit Log)
  let logs = JSON.parse(localStorage.getItem("mina_contract_logs")) || [];
  logs.push({
    log_id: Date.now(),
    agency_id: data.agency_id,
    changed_at: new Date().toLocaleString("vi-VN"),
    old_status: "None",
    new_status: "Pending",
    change_description: `Admin khởi tạo hồ sơ đại lý & tài khoản: ${data.username}`,
  });
  localStorage.setItem("mina_contract_logs", JSON.stringify(logs));

  // E. THÀNH CÔNG: Chuyển hướng
  triggerNotification(
    `Đã tạo thành công đại lý: ${data.agency_name}`,
    "success"
  );

  setTimeout(() => {
    window.location.href = "../agency/agency_list.html";
  }, 1500);
}

/**
 * 2. TÍCH HỢP ĐỊNH VỊ GPS
 */
async function getGPS() {
  const addressInput = document.getElementById("addressInput");
  const latEl = document.getElementById("lat");
  const lngEl = document.getElementById("lng");
  const address = addressInput.value.trim();

  if (!address) {
    triggerNotification("Vui lòng nhập địa chỉ trước khi định vị!", "warning");
    return;
  }

  addressInput.classList.add("animate-pulse", "border-blue-500");

  try {
    // API 1: Nominatim (OpenStreetMap)
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      address
    )}&limit=1`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "MinaRubberApp/1.0",
      },
    });

    if (!response.ok) throw new Error("API chính lỗi");

    const data = await response.json();

    if (data && data.length > 0) {
      latEl.value = parseFloat(data[0].lat).toFixed(6);
      lngEl.value = parseFloat(data[0].lon).toFixed(6);
      addressInput.classList.replace("border-blue-500", "border-green-500");
      triggerNotification("Định vị thành công!", "success");
    } else {
      throw new Error("Không tìm thấy kết quả");
    }
  } catch (error) {
    console.warn("API chính lỗi, thử API dự phòng...");
    // API 2: Esri (Dự phòng)
    try {
      const esriUrl = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&singleLine=${encodeURIComponent(
        address
      )}&maxLocations=1`;
      const esriRes = await fetch(esriUrl);
      const esriData = await esriRes.json();

      if (esriData.candidates && esriData.candidates.length > 0) {
        const loc = esriData.candidates[0].location;
        latEl.value = loc.y.toFixed(6);
        lngEl.value = loc.x.toFixed(6);
        addressInput.classList.replace("border-blue-500", "border-green-500");
        triggerNotification("Định vị thành công (Dự phòng)!", "success");
      } else {
        triggerNotification(
          "Không tìm thấy địa chỉ. Vui lòng nhập tay tọa độ!",
          "danger"
        );
      }
    } catch (e) {
      triggerNotification("Lỗi kết nối dịch vụ bản đồ!", "danger");
    }
  } finally {
    addressInput.classList.remove("animate-pulse");
  }
}

/**
 * 3. TIỆN ÍCH HỆ THỐNG
 */
function generateSuggestedID() {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const suggestedID = `DL-${randomNum}`;
  const idInput = document.querySelector('input[name="agency_id"]');
  if (idInput && !idInput.value) {
    idInput.placeholder = `Ví dụ: ${suggestedID}`;
  }
}

/**
 * SỬA LỖI ĐỆ QUY: Dùng hàm riêng để gọi showToast từ main.js
 */
function triggerNotification(message, type = "success") {
  // Nếu main.js đã nạp hàm showToast vào global window
  if (typeof window.showToast === "function") {
    window.showToast(message, type);
  } else {
    // Fallback dùng alert nếu chưa nạp kịp main.js
    alert(`${type.toUpperCase()}: ${message}`);
  }
}

// Xuất hàm ra global để HTML gọi được
window.getGPS = getGPS;
window.handleCreateAgency = handleCreateAgency;
