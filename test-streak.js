const uniqueDates = ["2026-05-10", "2026-05-09", "2026-05-08", "2026-05-06"];
const todayStr = "2026-05-10";
const yesterdayDate = new Date("2026-05-09T12:00:00Z");
const yesterdayStr = "2026-05-09";

let currentStreak = 0;

if (uniqueDates.includes(todayStr) || uniqueDates.includes(yesterdayStr)) {
  let checkDate = uniqueDates.includes(todayStr) ? new Date("2026-05-10T12:00:00Z") : yesterdayDate;
  while (true) {
    const dateStr = checkDate.toISOString().split("T")[0];
    if (uniqueDates.includes(dateStr)) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }
}
console.log("Streak:", currentStreak);
