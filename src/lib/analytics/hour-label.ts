/** An hour of the day as people say it: "9 PM", "12 AM". Shared by the server page and the charts. */
export function hourLabel(hour: number) {
  const h = hour % 12 || 12;
  return `${h} ${hour < 12 ? "AM" : "PM"}`;
}
