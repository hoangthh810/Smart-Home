import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export default function SensorChart({ data, lines, refLine, height = 240 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#64748b' }} minTickGap={40} />
        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} domain={['auto', 'auto']} />
        <Tooltip formatter={(v, name) => [`${v} ${lines.find((l) => l.name === name)?.unit ?? ''}`, name]} />
        {lines.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {refLine && (
          <ReferenceLine y={refLine.value} stroke="#dc2626" strokeDasharray="5 4" label={{ value: refLine.label, fontSize: 11, fill: '#dc2626', position: 'insideTopRight' }} />
        )}
        {lines.map((l) => (
          <Line key={l.key} type="monotone" dataKey={l.key} name={l.name} stroke={l.color} strokeWidth={2} dot={false} isAnimationActive={false} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
