/**
 * Định dạng tiền tệ VND chuẩn Việt Nam: ví dụ 8200000 -> "8.200.000 đ"
 */
export function formatVND(amount) {
  if (amount === null || amount === undefined || amount === "") return "0 đ";
  
  // Xử lý nếu chuỗi đã có chữ đ hoặc dấu chấm
  if (typeof amount === "string") {
    const cleaned = amount.replace(/[^\d]/g, "");
    if (!cleaned) return "0 đ";
    const num = parseInt(cleaned, 10);
    return new Intl.NumberFormat("vi-VN").format(num) + " đ";
  }

  const num = typeof amount === "number" ? amount : Number(amount);
  if (isNaN(num)) return "0 đ";
  return new Intl.NumberFormat("vi-VN").format(num) + " đ";
}

/**
 * Định dạng ngày dd/MM/yyyy chuẩn Việt Nam
 */
export function formatDateVN(dateInput) {
  if (!dateInput) return "";
  
  // Nếu đã có dạng dd/mm/yyyy
  if (typeof dateInput === "string" && dateInput.includes("/") && dateInput.split("/")[0].length <= 2) {
    return dateInput;
  }

  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return String(dateInput);
  }
}

