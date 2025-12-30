/**
 * js/modules/agency/agency_list.js
 * Quản lý danh mục Đại lý, Thông tin liên lạc & Tọa độ thực tế
 */

// --- 1. TIỆN ÍCH ---
window.toggleModal = function (modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.toggle("hidden");
    modal.classList.toggle("flex");
  }
};

// --- 2. DỮ LIỆU ---
let agencies = JSON.parse(localStorage.getItem("mina_agencies")) || [];

const currentUser = JSON.parse(localStorage.getItem("mina_user")) || {
  role: "ADMIN",
};

// --- 3. KHỞI TẠO ---
document.addEventListener("DOMContentLoaded", () => {
  renderAgencies(agencies);

  document
    .getElementById("addAgencyForm")
    ?.addEventListener("submit", handleAddAgencySubmit);
  document
    .getElementById("editAgencyForm")
    ?.addEventListener("submit", handleEditAgencySubmit);
  document
    .getElementById("contractForm")
    ?.addEventListener("submit", handleContractSubmit);

  document.getElementById("searchInput")?.addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase().trim();
    const filtered = agencies.filter(
      (a) =>
        a.agency_name.toLowerCase().includes(term) ||
        a.agency_id.toLowerCase().includes(term) ||
        a.contact_person?.toLowerCase().includes(term)
    );
    renderAgencies(filtered);
  });
});

/**
 * 4. XỬ LÝ ĐỊA LÝ (GEOCODING)
 */
async function verifyAddress(type) {
  const addressInput = document.getElementById(`${type}_agency_address`);
  const latInput = document.getElementById(`${type}_lat`);
  const lngInput = document.getElementById(`${type}_lng`);

  if (!addressInput.value) {
    showToast("Vui lòng nhập địa chỉ để định vị!", "warning");
    return;
  }

  showToast("Đang xác thực tọa độ...", "info");
  const coords = await MINA_API.getCoordsFromAddress(addressInput.value);

  if (coords) {
    latInput.value = coords.lat.toFixed(6);
    lngInput.value = coords.lng.toFixed(6);
    addressInput.classList.add("border-green-500");
    showToast(`Đã định vị thành công!`, "success");
  } else {
    showToast("Không tìm thấy địa chỉ này trên bản đồ!", "danger");
    addressInput.classList.add("border-red-500");
  }
}
window.verifyAddress = verifyAddress;

/**
 * 5. HIỂN THỊ DANH SÁCH
 */
function renderAgencies(dataList) {
  const user = JSON.parse(localStorage.getItem("mina_user"));
  if (user.role === "AGENCY") {
    dataList = dataList.filter((a) => a.agency_id === user.id);
  }

  const body = document.getElementById("agencyBody");
  if (!body) return;

  const contracts = JSON.parse(localStorage.getItem("mina_contracts")) || [];
  const isAdmin = currentUser.role === "ADMIN";

  body.innerHTML = dataList
    .map((a) => {
      const contract = contracts.find((c) => c.agency_id === a.agency_id);
      let statusHtml = `<span class="px-3 py-1 bg-slate-100 text-slate-400 border-slate-200 text-[9px] rounded-full font-black uppercase italic border">Chưa ký kết</span>`;

      if (contract) {
        statusHtml =
          contract.status === "Active"
            ? `<span class="px-3 py-1 bg-green-100 text-green-600 border-green-200 text-[9px] rounded-full font-black uppercase italic border">Đang hiệu lực</span>`
            : `<span class="px-3 py-1 bg-orange-100 text-orange-600 border-orange-200 text-[9px] rounded-full font-black uppercase italic border">Chờ kích hoạt</span>`;
      }

      return `
        <tr class="hover:bg-slate-50/50 transition-all border-b border-slate-50 text-xs">
            <td class="px-8 py-5 font-mono font-bold text-slate-500">${
              a.agency_id
            }</td>
            <td class="px-8 py-5">
                <div class="font-black text-slate-700 italic uppercase">${
                  a.agency_name
                }</div>
                <div class="text-[9px] text-blue-500 font-black uppercase mt-1">
                    <i class="fas fa-map-marker-alt mr-1"></i>${a.region_name} 
                    ${
                      a.lat
                        ? `<span class="text-slate-300 ml-2 font-normal lowercase italic">[gps: ${parseFloat(
                            a.lat
                          ).toFixed(3)}, ${parseFloat(a.lng).toFixed(
                            3
                          )}]</span>`
                        : ""
                    }
                </div>
            </td>
            <td class="px-8 py-5">
                <div class="font-bold text-slate-700">${
                  a.contact_person || "N/A"
                }</div>
                <div class="text-[9px] text-slate-400 font-black uppercase mt-1">
                    <i class="fas fa-phone-alt mr-1 text-slate-300"></i>${
                      a.contact_phone || "N/A"
                    }
                </div>
            </td>
            <td class="px-8 py-5 text-center text-slate-500 italic font-bold">${
              a.payment_term
            }</td>
            <td class="px-8 py-5 text-center">${statusHtml}</td>
            <td class="px-8 py-5 text-right">
                <div class="flex justify-end gap-1">
                    <button onclick="window.openEditAgencyModal('${
                      a.agency_id
                    }')" class="w-8 h-8 bg-slate-100 text-slate-400 rounded-lg hover:bg-slate-900 hover:text-white transition-all">
                        <i class="fas fa-edit text-[10px]"></i>
                    </button>
                    ${
                      isAdmin
                        ? `
                    <button onclick="window.openContractModal('${a.agency_id}')" class="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all">
                        <i class="fas fa-file-signature text-[10px]"></i>
                    </button>
                    <button onclick="window.deleteAgency('${a.agency_id}')" class="w-8 h-8 bg-red-50 text-red-500 rounded-lg hover:bg-red-600 hover:text-white transition-all">
                        <i class="fas fa-trash text-[10px]"></i>
                    </button>`
                        : ""
                    }
                </div>
            </td>
        </tr>`;
    })
    .join("");
}

// --- 6. XỬ LÝ NGHIỆP VỤ ---

async function handleAddAgencySubmit(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData.entries());

  // Fix: Đảm bảo tọa độ được gán vào data trước khi lưu
  if (!data.lat || !data.lng) {
    const coords = await MINA_API.getCoordsFromAddress(data.address);
    if (coords) {
      data.lat = parseFloat(coords.lat); // Đảm bảo là kiểu số
      data.lng = parseFloat(coords.lng); // Đảm bảo là kiểu số
    }
  }

  agencies.unshift(data);
  localStorage.setItem("mina_agencies", JSON.stringify(agencies));
  showToast("Đã lưu đại lý đối tác!", "success");
  e.target.reset();
  toggleModal("addAgencyModal");
  renderAgencies(agencies);
}

window.openEditAgencyModal = function (id) {
  const a = agencies.find((agency) => agency.agency_id === id);
  if (!a) return;

  document.getElementById("edit_original_id").value = id;
  document.getElementById("edit_agency_id").value = a.agency_id;
  document.getElementById("edit_agency_name").value = a.agency_name;
  document.getElementById("edit_contact_person").value = a.contact_person || "";
  document.getElementById("edit_contact_phone").value = a.contact_phone || "";
  document.getElementById("edit_agency_address").value = a.address || "";
  document.getElementById("edit_lat").value = a.lat || "";
  document.getElementById("edit_lng").value = a.lng || "";
  document.getElementById("edit_region_name").value = a.region_name;
  document.getElementById("edit_payment_term").value = a.payment_term;

  toggleModal("editAgencyModal");
};

async function handleEditAgencySubmit(e) {
  e.preventDefault();
  const oldId = document.getElementById("edit_original_id").value;
  const newId = document.getElementById("edit_agency_id").value;
  const idx = agencies.findIndex((a) => a.agency_id === oldId);

  if (idx !== -1) {
    agencies[idx] = {
      ...agencies[idx],
      agency_id: newId,
      agency_name: document.getElementById("edit_agency_name").value,
      contact_person: document.getElementById("edit_contact_person").value,
      contact_phone: document.getElementById("edit_contact_phone").value,
      address: document.getElementById("edit_agency_address").value,
      lat: parseFloat(document.getElementById("edit_lat").value),
      lng: parseFloat(document.getElementById("edit_lng").value),
      region_name: document.getElementById("edit_region_name").value,
      payment_term: document.getElementById("edit_payment_term").value,
    };

    // Fix: Đồng bộ hóa dữ liệu nếu ID thay đổi
    syncAgencyData(oldId, newId);

    localStorage.setItem("mina_agencies", JSON.stringify(agencies));
    showToast("Cập nhật thành công!", "success");
    toggleModal("editAgencyModal");
    renderAgencies(agencies);
  }
}

window.deleteAgency = function (id) {
  if (
    confirm(`Xác nhận xóa vĩnh viễn đại lý [${id}] và mọi dữ liệu liên quan?`)
  ) {
    agencies = agencies.filter((a) => a.agency_id !== id);
    localStorage.setItem("mina_agencies", JSON.stringify(agencies));
    syncAgencyData(id, null);
    renderAgencies(agencies);
    showToast("Đã xóa sạch dữ liệu đại lý.", "danger");
  }
};

/**
 * Hàm đồng bộ dữ liệu (Hợp đồng & Nhật ký)
 */
function syncAgencyData(oldId, newId) {
  let contracts = JSON.parse(localStorage.getItem("mina_contracts")) || [];
  let logs = JSON.parse(localStorage.getItem("mina_contract_logs")) || [];

  if (!newId) {
    // Xóa sạch
    localStorage.setItem(
      "mina_contracts",
      JSON.stringify(contracts.filter((c) => c.agency_id !== oldId))
    );
    localStorage.setItem(
      "mina_contract_logs",
      JSON.stringify(logs.filter((l) => l.agency_id !== oldId))
    );
  } else if (oldId !== newId) {
    // Đổi ID
    contracts.forEach((c) => {
      if (c.agency_id === oldId) c.agency_id = newId;
    });
    logs.forEach((l) => {
      if (l.agency_id === oldId) l.agency_id = newId;
    });
    localStorage.setItem("mina_contracts", JSON.stringify(contracts));
    localStorage.setItem("mina_contract_logs", JSON.stringify(logs));
  }
}

// --- NGHIỆP VỤ HỢP ĐỒNG ---
window.openContractModal = function (id) {
  document.getElementById("contract_agency_id").value = id;
  toggleModal("contractModal");
};

function handleContractSubmit(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData.entries());

  let contracts = JSON.parse(localStorage.getItem("mina_contracts")) || [];
  let logs = JSON.parse(localStorage.getItem("mina_contract_logs")) || [];

  const newContract = {
    agency_id: data.agency_id,
    status: data.status,
    start_date: data.start_date,
    end_date: data.end_date,
    updatedAt: new Date().toISOString(),
  };

  logs.push({
    log_id: Date.now(),
    agency_id: data.agency_id,
    change_description: `Admin ký hợp đồng điện tử: ${data.start_date} đến ${data.end_date}`,
    old_status: "Chưa ký",
    new_status: data.status,
    changed_at: new Date().toLocaleString("vi-VN"),
  });

  contracts = contracts.filter((c) => c.agency_id !== data.agency_id);
  contracts.push(newContract);
  localStorage.setItem("mina_contracts", JSON.stringify(contracts));
  localStorage.setItem("mina_contract_logs", JSON.stringify(logs));

  showToast("Hợp đồng đã được xác lập!", "success");
  toggleModal("contractModal");
  renderAgencies(agencies);
}
