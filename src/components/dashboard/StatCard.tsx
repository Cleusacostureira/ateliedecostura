interface StatCardProps {
  icon: string;
  label: string;
  value: string;
  trend: string;
  trendUp: boolean;
  color: string;
}

export default function StatCard({ icon, label, value, trend, trendUp, color }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg p-3 lg:p-6 border border-gray-200">
      <div className="flex items-start justify-between mb-2 lg:mb-3">
        <div className={`w-8 h-8 lg:w-12 lg:h-12 ${color} rounded-lg flex items-center justify-center`}>
          <i className={`${icon} text-base lg:text-2xl text-white w-4 h-4 lg:w-6 lg:h-6 flex items-center justify-center`}></i>
        </div>
        <span className={`text-[10px] lg:text-xs font-medium px-1.5 lg:px-2 py-0.5 lg:py-1 rounded-full ${
          trendUp ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {trend}
        </span>
      </div>
      <p className="text-[10px] lg:text-sm text-gray-600 mb-1">{label}</p>
      <p className="text-base lg:text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
