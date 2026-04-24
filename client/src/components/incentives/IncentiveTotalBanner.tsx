interface IncentiveTotalBannerProps {
  totalIncentiveAmount: number
  totalReceivedAmount: number
  month: string
  saleType: 'all' | 'spouse' | 'visitor' | 'student'
}

const saleLabels: Record<'all' | 'spouse' | 'visitor' | 'student', string> = {
  all: 'All Sale Types',
  spouse: 'Spouse',
  visitor: 'Visitor',
  student: 'Student',
}

export function IncentiveTotalBanner({ totalIncentiveAmount, totalReceivedAmount, month, saleType }: IncentiveTotalBannerProps) {
  const monthLabel = (() => {
    const [year, monthNum] = month.split('-')
    const d = new Date(Number(year), Number(monthNum) - 1)
    return isNaN(d.getTime()) ? month : d.toLocaleString('en-IN', { month: 'long', year: 'numeric' })
  })()

  return (
    <div className="px-4 pt-4 pb-2">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl px-6 py-4 flex items-center justify-between text-white">
        <div className="flex gap-10">
          <div>
            <p className="text-xs uppercase font-semibold tracking-widest opacity-80">
              Total Incentive Amount
            </p>
            <p className="text-3xl font-bold mt-1">₹{totalIncentiveAmount.toLocaleString('en-IN')}</p>
            <p className="text-xs opacity-70 mt-1">
              {monthLabel} · {saleLabels[saleType]}
            </p>
          </div>
          <div className="border-l border-white/20 pl-10">
            <p className="text-xs uppercase font-semibold tracking-widest opacity-80">
              Total Received Amount
            </p>
            <p className="text-3xl font-bold mt-1">₹{totalReceivedAmount.toLocaleString('en-IN')}</p>
            <p className="text-xs opacity-70 mt-1">All enrollments</p>
          </div>
        </div>
        <span className="text-6xl font-bold opacity-10 select-none">₹</span>
      </div>
    </div>
  )
}
