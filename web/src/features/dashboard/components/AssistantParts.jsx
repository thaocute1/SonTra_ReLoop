import React from 'react'

import DynamicChartRenderer from './DynamicChartRenderer'

/**
 * Render `message.parts` của assistant: text + chart.
 * Part lạ bị bỏ qua để không làm vỡ bubble; nếu không có part nào thì dùng text fallback.
 */
export default function AssistantParts({ parts, fallback }) {
  const list = Array.isArray(parts) ? parts : []

  if (!list.length) {
    return fallback ? <p className="reloop-part-text">{fallback}</p> : null
  }

  return (
    <>
      {list.map((part, index) => {
        if (!part || typeof part !== 'object') return null
        if (part.type === 'text' && part.text) {
          return (
            <p className="reloop-part-text" key={`text-${index}`}>
              {part.text}
            </p>
          )
        }
        if (part.type === 'chart') {
          return <DynamicChartRenderer key={`chart-${index}`} chart={part.chart} />
        }
        return null
      })}
    </>
  )
}
