import React from 'react'

export default function AppLogo({ subtitle = 'Vendor Portal' }) {
  return <div className="dashboard-brand"><img className="dashboard-brand__mark" src="/assets/figma/landing-hero.png" alt="Sơn Trà REloop" /><div><strong>Sơn Trà REloop</strong><span>{subtitle}</span></div></div>
}
