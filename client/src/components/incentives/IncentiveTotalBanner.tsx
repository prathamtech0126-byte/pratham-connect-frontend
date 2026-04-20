interface IncentiveTotalBannerProps {
  totalApprovedAmount: number
  month: string
  visaType: 'all' | 'spouse' | 'visitor' | 'student'
}

const visaLabels: Record<string, string> = {
  all: 'All Visa Types',
  spouse: 'Spouse Visa',
  visitor: 'Visitor Visa',
  student: 'Student Visa',
}

export function IncentiveTotalBanner({ totalApprovedAmount, month, visaType }: IncentiveTotalBannerProps) {
  const [year, monthNum] = month.split('-')
  const monthLabel = new Date(Number(year), Number(monthNum) - 1).toLocaleString('en-IN', {
    month: 'long',
    year: 'numeric',
  })
  const formattedAmount = `₹${totalApprovedAmount.toLocaleString('en-IN')}`

  return (
    <div className="px-4 pt-4 pb-2">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl px-6 py-4 flex items-center justify-between text-white">
        <div>
          <p className="text-xs uppercase font-semibold tracking-widest opacity-80">
            Total Incentive Amount
          </p>
          <p className="text-3xl font-bold mt-1">{formattedAmount}</p>
          <p className="text-xs opacity-70 mt-1">
            {monthLabel} · {visaLabels[visaType]}
          </p>
        </div>
        <span className="text-6xl font-bold opacity-10 select-none">₹</span>
      </div>
    </div>
  )
}
