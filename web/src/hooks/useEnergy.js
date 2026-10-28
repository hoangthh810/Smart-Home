import { useMemo } from 'react'
import { useDb } from '../store/db'
import { getEnergyHistory, monthKey } from '../utils/energy'
import { calcEvnCost } from '../utils/evn'

export function useEnergy(homeId) {
  const evn = useDb((s) => s.evn)

  return useMemo(() => {
    const history = getEnergyHistory(homeId)
    const todayRow = history.days.at(-1)
    const currentMonth = monthKey(todayRow.date)
    const monthDays = history.days.filter((d) => monthKey(d.date) === currentMonth)
    const monthWh = monthDays.reduce((s, d) => s + d.living + d.kitchen, 0)
    return {
      history,
      todayWh: todayRow.living + todayRow.kitchen,
      monthDays,
      monthWh,
      monthCost: calcEvnCost(monthWh / 1000, evn.tiers, evn.vat),
      evn,
    }
  }, [homeId, evn])
}
