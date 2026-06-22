export default function KPICard({ lbl, val, sub, cls, valCls }) {
  return (
    <div className={`kpi${cls ? ` k-${cls}` : ''}`}>
      <div className="lbl">{lbl}</div>
      <div className={`val${valCls ? ` ${valCls}` : ''}`}>{val}</div>
      <div className="sub">{sub}</div>
    </div>
  )
}
