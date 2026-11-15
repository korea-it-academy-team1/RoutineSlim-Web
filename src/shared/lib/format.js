export const formatWon = (n) => Number(n || 0).toLocaleString("ko-KR") + "원";
export const getTodayDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const dateText = (value) => String(value || "").slice(0, 10);
