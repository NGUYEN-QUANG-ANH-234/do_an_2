/**
 * js/modules/product/product_list.js
 * QUẢN LÝ SẢN PHẨM & PHÂN QUYỀN HỆ THỐNG - MINA RUBBER
 * Phiên bản: Full Access Control (Admin/Manager vs Others)
 */

// --- 1. KHỞI TẠO & KIỂM TRA QUYỀN HẠN ---
const currentUser = JSON.parse(localStorage.getItem("mina_user"));
// Phân quyền: Chỉ ADMIN và MANAGER mới có quyền thêm, sửa, xóa
const hasFullAccess =
  currentUser &&
  (currentUser.role === "ADMIN" || currentUser.role === "MANAGER");

// --- 2. TIỆN ÍCH MODAL ---
window.toggleModal = function (modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    if (modal.classList.contains("hidden")) {
      modal.classList.remove("hidden");
      modal.classList.add("flex");
    } else {
      modal.classList.remove("flex");
      modal.classList.add("hidden");
    }
  }
};

// --- 3. DỮ LIỆU GỐC ---
const categories = [
  { category_id: 1, category_name: "Lốp xe máy" },
  { category_id: 2, category_name: "Lốp xe ô tô con" },
  { category_id: 3, category_name: "Lốp xe tải nhẹ" },
];

let products = JSON.parse(localStorage.getItem("mina_products")) || [];

// --- 4. KHỞI CHẠY KHI TẢI TRANG ---
document.addEventListener("DOMContentLoaded", () => {
  console.log("Mina Rubber: Product Module Ready");

  // Kiểm tra quyền để ẩn nút "Thêm sản phẩm mới" trên giao diện
  // 1. Ẩn nút "Thêm sản phẩm"
  const addProductBtn = document.querySelector('[onclick*="productModal"]');
  if (addProductBtn && !hasFullAccess) {
    addProductBtn.style.display = "none";
  }

  // 2. ẨN NÚT "NHẬT KÝ HỆ THỐNG" Ở ĐẦU TRANG (MỚI)
  const systemLogBtn = document.getElementById("btnSystemLog");
  if (systemLogBtn && !hasFullAccess) {
    systemLogBtn.style.display = "none"; // Chỉ Admin/Manager mới thấy
  }

  renderFilters();
  renderProducts();

  const productForm = document.getElementById("productForm");
  if (productForm) {
    productForm.onsubmit = handleProductSubmit;
  }
});

/**
 * 5. GHI NHẬT KÝ HOẠT ĐỘNG (Chỉ dành cho Admin/Manager)
 */
function recordActivity(
  productId,
  action,
  details,
  oldPrice = null,
  newPrice = null
) {
  let history = JSON.parse(localStorage.getItem("mina_price_history")) || [];

  const logEntry = {
    log_id: Date.now(),
    product_id: Number(productId),
    action: action,
    details: details,
    old_price: oldPrice ? Number(oldPrice) : null,
    new_price: newPrice ? Number(newPrice) : null,
    changed_by: currentUser
      ? currentUser.name || currentUser.username
      : "Hệ thống",
    timestamp: new Date().toISOString(),
  };

  history.unshift(logEntry);
  localStorage.setItem("mina_price_history", JSON.stringify(history));
}

/**
 * 6. HIỂN THỊ DANH SÁCH SẢN PHẨM (TÍCH HỢP PHÂN QUYỀN)
 */
function renderProducts(data = products) {
  const body = document.getElementById("productBody");
  if (!body) return;

  if (data.length === 0) {
    body.innerHTML =
      '<tr><td colspan="7" class="px-6 py-10 text-center text-slate-400 italic">Danh sách trống. Vui lòng thêm sản phẩm mới.</td></tr>';
    return;
  }

  body.innerHTML = data
    .map((p) => {
      const catName =
        categories.find((c) => c.category_id == p.category_id)?.category_name ||
        "Chưa phân loại";
      const dateFormatted = p.effective_date
        ? new Date(p.effective_date).toLocaleDateString("vi-VN")
        : "---";

      // Logic ẩn/hiện nút Sửa & Xóa dựa trên hasFullAccess
      return `
            <tr class="hover:bg-blue-50/30 transition-all group">
                <td class="px-6 py-4">
                    <div class="font-bold text-slate-800">${
                      p.product_name
                    }</div>
                    <div class="text-xs text-blue-600 font-mono font-semibold">${
                      p.product_code
                    }</div>
                </td>
                <td class="px-6 py-4 text-sm text-slate-600">${catName}</td>
                <td class="px-6 py-4 text-sm text-slate-600">
                    <span class="block">${p.size || "---"}</span>
                    <span class="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">${
                      p.tire_type || ""
                    }</span>
                </td>
                <td class="px-6 py-4 font-bold text-orange-600">
                    ${new Intl.NumberFormat("vi-VN").format(p.current_price)}đ
                </td>
                <td class="px-6 py-4 text-center text-xs text-slate-500 font-medium">${dateFormatted}</td>
                <td class="px-6 py-4 text-center">
                    <span class="px-3 py-1 bg-green-100 text-green-700 text-[10px] rounded-full font-bold uppercase">
                        ${p.status || "Còn bán"}
                    </span>
                </td>
                <td class="px-6 py-4 text-right">
                    <div class="flex justify-end space-x-1 ${
                      hasFullAccess
                        ? "opacity-0 group-hover:opacity-100"
                        : "opacity-100"
                    } transition-opacity">
                        <a href="product_price_history.html?id=${p.product_id}" 
                           class="p-2 hover:bg-orange-100 text-orange-500 rounded-lg transition-colors" title="Xem biến động giá">
                            <i class="fas fa-chart-line"></i>
                        </a>

                        ${
                          hasFullAccess
                            ? `
                        
                        <button type="button" onclick="editProduct(${p.product_id})" 
                                class="p-2 hover:bg-blue-100 text-blue-500 rounded-lg transition-colors" title="Sửa sản phẩm">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button type="button" onclick="deleteProduct(${p.product_id})" 
                                class="p-2 hover:bg-red-100 text-red-500 rounded-lg transition-colors" title="Xóa sản phẩm">
                            <i class="fas fa-trash"></i>
                        </button>
                        `
                            : ""
                        }
                    </div>
                </td>
            </tr>`;
    })
    .join("");
}

/**
 * 7. XỬ LÝ FORM (THÊM & SỬA)
 */
function handleProductSubmit(e) {
  e.preventDefault();

  // Bảo mật tầng logic: Chặn nếu không đủ quyền
  if (!hasFullAccess) {
    showToast("Bạn không có quyền thực hiện hành động này!", "danger");
    return;
  }

  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData.entries());
  const editId = document.getElementById("edit_product_id").value;

  if (editId) {
    // --- CHỈNH SỬA SẢN PHẨM ---
    const index = products.findIndex(
      (p) => Number(p.product_id) === Number(editId)
    );
    if (index !== -1) {
      let oldP = products[index];
      let changes = [];

      if (oldP.product_name !== data.product_name)
        changes.push(`Tên: ${oldP.product_name} ➔ ${data.product_name}`);

      if (Number(oldP.current_price) !== Number(data.current_price)) {
        recordActivity(
          editId,
          "PRICE_CHANGE",
          `Cập nhật giá bán lẻ mới`,
          oldP.current_price,
          data.current_price
        );
      } else if (changes.length > 0) {
        recordActivity(
          editId,
          "UPDATE",
          `Cập nhật thông tin: ${changes.join(", ")}`
        );
      }

      products[index] = {
        ...oldP,
        product_code: data.product_code,
        product_name: data.product_name,
        category_id: Number(data.category_id),
        current_price: Number(data.current_price),
        effective_date: data.effective_date,
        tire_type: data.tire_type,
        size: data.size,
      };
    }
  } else {
    // --- THÊM SẢN PHẨM MỚI ---
    const newId = Date.now();
    const newProduct = {
      product_id: newId,
      product_code: data.product_code,
      product_name: data.product_name,
      category_id: Number(data.category_id),
      current_price: Number(data.current_price),
      effective_date: data.effective_date,
      tire_type: data.tire_type,
      size: data.size,
      status: "Còn bán",
    };
    products.unshift(newProduct);
    recordActivity(
      newId,
      "CREATE",
      "Khởi tạo sản phẩm mới",
      null,
      data.current_price
    );
  }

  saveData();
  toggleModal("productModal");
  e.target.reset();
  document.getElementById("edit_product_id").value = "";
  document.getElementById("modalTitle").innerText = "Thêm sản phẩm mới";
}

window.editProduct = function (id) {
  // Chặn thực thi nếu người dùng cố tình gọi qua console
  if (!hasFullAccess) return;

  const p = products.find((prod) => Number(prod.product_id) === Number(id));
  if (!p) return;

  const form = document.getElementById("productForm");
  document.getElementById("edit_product_id").value = p.product_id;
  document.getElementById("modalTitle").innerText = "Chỉnh sửa sản phẩm";

  form.product_code.value = p.product_code;
  form.product_name.value = p.product_name;
  form.category_id.value = p.category_id;
  form.current_price.value = p.current_price;
  form.effective_date.value = p.effective_date || "";
  form.tire_type.value = p.tire_type || "";
  form.size.value = p.size || "";

  toggleModal("productModal");
};

window.deleteProduct = function (id) {
  if (!hasFullAccess) return;

  const p = products.find((prod) => Number(prod.product_id) === Number(id));
  if (!p) return;

  if (confirm(`Bạn có chắc muốn xóa vĩnh viễn sản phẩm [${p.product_name}]?`)) {
    recordActivity(id, "DELETE", `Sản phẩm bị xóa.`);
    products = products.filter(
      (prod) => Number(prod.product_id) !== Number(id)
    );
    saveData();
  }
};

/**
 * 8. LƯU DỮ LIỆU & ĐỒNG BỘ
 */
function saveData() {
  localStorage.setItem("mina_products", JSON.stringify(products));

  // ĐỒNG BỘ SANG KHO (Inventory)
  let inventory = JSON.parse(localStorage.getItem("mina_inventory")) || [];
  let hasChange = false;

  inventory = inventory.map((item) => {
    const product = products.find(
      (p) => Number(p.product_id) === Number(item.productId)
    );
    if (product && item.productName !== product.product_name) {
      item.productName = product.product_name;
      hasChange = true;
    }
    return item;
  });

  if (hasChange) {
    localStorage.setItem("mina_inventory", JSON.stringify(inventory));
  }

  renderProducts();
}

/**
 * 9. LỌC & TÌM KIẾM
 */
function renderFilters() {
  const filterCat = document.getElementById("filterCategory");
  const selectCat = document.getElementById("categorySelect");
  if (!filterCat || !selectCat) return;

  const options = categories
    .map((c) => `<option value="${c.category_id}">${c.category_name}</option>`)
    .join("");
  filterCat.innerHTML = '<option value="">Tất cả nhóm</option>' + options;
  selectCat.innerHTML = options;
}

window.filterProducts = function () {
  const search =
    document.getElementById("searchInput")?.value.toLowerCase() || "";
  const cat = document.getElementById("filterCategory")?.value || "";

  const filtered = products.filter(
    (p) =>
      (p.product_name.toLowerCase().includes(search) ||
        p.product_code.toLowerCase().includes(search)) &&
      (cat === "" || p.category_id == cat)
  );

  renderProducts(filtered);
};
