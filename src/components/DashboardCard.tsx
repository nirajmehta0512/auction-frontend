import React from 'react'
import { MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DashboardCardProps {
  title: string
  children: React.ReactNode
  className?: string
  showMenu?: boolean
}

export default function DashboardCard({ title, children, className, showMenu = false }: DashboardCardProps) {
  return (
    <div className={cn("bg-white rounded-lg border border-gray-200 shadow-sm", className)}>
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {showMenu && (
          <button className="p-1 hover:bg-gray-100 rounded-md transition-colors">
            <MoreHorizontal className="h-5 w-5 text-gray-400" />
          </button>
        )}
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  )
}

interface StatItemProps {
  label: string
  value: string | number
  className?: string
}

export function StatItem({ label, value, className }: StatItemProps) {
  return (
    <div className={cn("flex items-center justify-between py-2", className)}>
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm font-semibold text-gray-900">{value}</span>
    </div>
  )
} 