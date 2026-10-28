// Sinh dữ liệu lịch sử điện năng giả lập (Wh) cho từng phòng.
// Khi có backend, dữ liệu này được tổng hợp từ số đo INA219 lưu trong cơ sở dữ liệu.

const cache = new Map()

function seededRandom(seedStr) {
  let h = 1779033703 ^ seedStr.length
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
}

// Phân bố mức dùng điện theo giờ trong ngày (tối dùng nhiều nhất)
const HOUR_PROFILE = [0.3, 0.2, 0.2, 0.2, 0.2, 0.4, 1, 1.2, 0.8, 0.5, 0.6, 1.1, 1.4, 1, 0.6, 0.6, 0.8, 1.4, 2.2, 2.6, 2.4, 2, 1.4, 0.7]
const PROFILE_SUM = HOUR_PROFILE.reduce((a, b) => a + b, 0)

const dateKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function dailyWh(rand) {
  return {
    living: 30 + rand() * 45, // đèn 3W x 4–7h + quạt 6W x 3–9h
    kitchen: 12 + rand() * 25,
  }
}

/** Trả về { days: [{date, living, kitchen}], today: [{hour, living, kitchen}] } */
export function getEnergyHistory(homeId, numDays = 400) {
  const today = dateKey(new Date())
  const key = `${homeId}-${today}`
  if (cache.has(key)) return cache.get(key)

  const days = []
  for (let i = numDays; i >= 1; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const rand = seededRandom(`${homeId}-${dateKey(d)}`)
    const wh = dailyWh(rand)
    days.push({ date: dateKey(d), living: wh.living, kitchen: wh.kitchen })
  }

  // Hôm nay: theo giờ, tới giờ hiện tại
  const rand = seededRandom(`${homeId}-${today}`)
  const full = dailyWh(rand)
  const nowHour = new Date().getHours()
  const todayHours = HOUR_PROFILE.slice(0, nowHour + 1).map((w, hour) => ({
    hour,
    living: (full.living * w) / PROFILE_SUM,
    kitchen: (full.kitchen * w) / PROFILE_SUM,
  }))
  days.push({
    date: today,
    living: todayHours.reduce((s, h) => s + h.living, 0),
    kitchen: todayHours.reduce((s, h) => s + h.kitchen, 0),
  })

  const result = { days, today: todayHours }
  cache.set(key, result)
  return result
}

export const monthKey = (date) => date.slice(0, 7)

export function sumByMonth(days) {
  const map = new Map()
  for (const d of days) {
    const m = monthKey(d.date)
    const cur = map.get(m) ?? { month: m, living: 0, kitchen: 0 }
    cur.living += d.living
    cur.kitchen += d.kitchen
    map.set(m, cur)
  }
  return [...map.values()]
}
