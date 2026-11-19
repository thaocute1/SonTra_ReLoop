import React from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const SERIES_COLORS = ['#4a6b5d', '#8fae9c', '#c9a227', '#4f7cac', '#b4654a']
const SUPPORTED_TYPES = new Set(['bar', 'line', 'area', 'pie'])
const numberFormatter = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 })

function formatValue(value) {
  return typeof value === 'number' && Number.isFinite(value) ? numberFormatter.format(value) : value
}

function formatTick(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return value
  const abs = Math.abs(value)
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} tỷ`
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} tr`
  if (abs >= 1_000) return `${Math.round(value / 1_000)}k`
  return String(value)
}

/** Validate + chuẩn hóa chart do backend trả; trả null nếu không vẽ được. */
export function normalizeChart(input) {
  if (!input || typeof input !== 'object') return null

  const data = Array.isArray(input.data)
    ? input.data.filter((row) => row && typeof row === 'object' && !Array.isArray(row))
    : []
  if (!data.length) return null

  const rawType = String(input.type || '').toLowerCase()
  const type = SUPPORTED_TYPES.has(rawType) ? rawType : 'bar'
  const xField =
    typeof input.xField === 'string' && data[0][input.xField] !== undefined
      ? input.xField
      : Object.keys(data[0])[0]

  const declaredSeries = Array.isArray(input.series) ? input.series : []
  let series = declaredSeries
    .filter((item) => item && typeof item.field === 'string' && data[0][item.field] !== undefined)
    .map((item, index) => ({
      field: item.field,
      name: typeof item.name === 'string' && item.name.trim() ? item.name : item.field,
      color: SERIES_COLORS[index % SERIES_COLORS.length],
    }))

  if (!series.length) {
    const fallbackField = Object.keys(data[0]).find(
      (key) => key !== xField && Number.isFinite(Number(data[0][key])),
    )
    if (!fallbackField) return null
    series = [{ field: fallbackField, name: fallbackField, color: SERIES_COLORS[0] }]
  }

  return {
    type,
    title: typeof input.title === 'string' ? input.title.trim() : '',
    description: typeof input.description === 'string' ? input.description.trim() : '',
    xField,
    series,
    data,
  }
}

function AxisChart({ model }) {
  const commonAxes = (
    <>
      <CartesianGrid stroke="#e8eee9" strokeDasharray="4 4" vertical={false} />
      <XAxis dataKey={model.xField} tick={{ fill: '#6b7a72', fontSize: 11 }} axisLine={false} tickLine={false} />
      <YAxis tickFormatter={formatTick} tick={{ fill: '#6b7a72', fontSize: 10 }} axisLine={false} tickLine={false} width={52} />
      <Tooltip formatter={(value, name) => [formatValue(value), name]} contentStyle={{ borderRadius: 10, borderColor: '#dce3dd', fontSize: 12 }} />
      {model.series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
    </>
  )

  if (model.type === 'line') {
    return (
      <LineChart data={model.data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        {commonAxes}
        {model.series.map((item) => (
          <Line
            key={item.field}
            type="monotone"
            dataKey={item.field}
            name={item.name}
            stroke={item.color}
            strokeWidth={2}
            dot={model.data.length <= 24}
          />
        ))}
      </LineChart>
    )
  }

  if (model.type === 'area') {
    return (
      <AreaChart data={model.data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        {commonAxes}
        {model.series.map((item) => (
          <Area
            key={item.field}
            type="monotone"
            dataKey={item.field}
            name={item.name}
            stroke={item.color}
            fill={item.color}
            fillOpacity={0.18}
            strokeWidth={2}
          />
        ))}
      </AreaChart>
    )
  }

  return (
    <BarChart data={model.data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
      {commonAxes}
      {model.series.map((item) => (
        <Bar key={item.field} dataKey={item.field} name={item.name} fill={item.color} radius={[6, 6, 0, 0]} maxBarSize={44} />
      ))}
    </BarChart>
  )
}

function PieChartView({ model }) {
  return (
    <PieChart>
      <Pie
        data={model.data}
        dataKey={model.series[0].field}
        nameKey={model.xField}
        outerRadius="72%"
        stroke="none"
      >
        {model.data.map((entry, index) => (
          <Cell key={`slice-${index}`} fill={SERIES_COLORS[index % SERIES_COLORS.length]} />
        ))}
      </Pie>
      <Tooltip formatter={(value, name) => [formatValue(value), name]} contentStyle={{ borderRadius: 10, borderColor: '#dce3dd', fontSize: 12 }} />
      <Legend wrapperStyle={{ fontSize: 11 }} />
    </PieChart>
  )
}

/** Biểu đồ cho chat: bar | line | area | pie, dữ liệu do backend trả (không parse markdown). */
export default function DynamicChartRenderer({ chart }) {
  const model = React.useMemo(() => normalizeChart(chart), [chart])

  if (!model) {
    return <div className="reloop-chart-empty">Chưa có dữ liệu biểu đồ.</div>
  }

  return (
    <figure className="reloop-chart-card" role="img" aria-label={model.title || 'Biểu đồ số liệu'}>
      {model.title && <figcaption className="reloop-chart-title">{model.title}</figcaption>}
      {model.description && <p className="reloop-chart-desc">{model.description}</p>}
      <div className="reloop-chart-canvas">
        <ResponsiveContainer width="100%" height="100%">
          {model.type === 'pie' ? <PieChartView model={model} /> : <AxisChart model={model} />}
        </ResponsiveContainer>
      </div>
    </figure>
  )
}
