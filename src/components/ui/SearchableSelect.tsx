// frontend/src/components/ui/SearchableSelect.tsx
"use client"

import React, { useMemo, useState, useRef, useEffect } from 'react'

export interface SearchableOption<T = string | number> {
  value: T
  label: string
  description?: string
}

interface SearchableSelectProps<T = string | number> {
  value?: T
  options: SearchableOption<T>[]
  placeholder?: string
  onChange?: (value: T) => void
  disabled?: boolean
  className?: string
  inputPlaceholder?: string
  isLoading?: boolean
}

// Purpose: Reusable dropdown with type-to-search and clickable options
export default function SearchableSelect<T = string | number>({
  value,
  options,
  placeholder = 'Select...',
  onChange,
  disabled,
  className,
  inputPlaceholder = 'Type to search...',
  isLoading = false
}: SearchableSelectProps<T>) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const componentRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    if (!query.trim()) return options
    const q = query.toLowerCase()
    return options.filter((o) => o.label.toLowerCase().includes(q) || (o.description?.toLowerCase().includes(q) ?? false))
  }, [options, query])

  const currentLabel = useMemo(() => {
    const found = options.find(o => String(o.value) === String(value))
    return found?.label
  }, [options, value])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (componentRef.current && !componentRef.current.contains(event.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  return (
    <div ref={componentRef} className={`relative ${className || ''}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={`w-full px-3 py-2 border rounded-md text-left overflow-hidden ${disabled ? 'opacity-50 cursor-not-allowed' : ''} border-gray-300 bg-white`}
      >
        <span className="truncate block min-w-0 text-gray-900">
          {currentLabel || placeholder}
          {!currentLabel && value && ` (Value: ${value})`}
        </span>
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg">
          <div className="p-2 border-b">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={inputPlaceholder}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div className="max-h-64 overflow-auto">
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-sm text-gray-500">No results</div>
            )}
            {filtered.map((opt) => (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => {
                  console.log('Option clicked:', opt.value, opt.label)
                  setOpen(false);
                  setQuery('');
                  onChange?.(opt.value)
                }}
                className={`w-full text-left px-3 py-2 hover:bg-gray-50 ${String(value) === String(opt.value) ? 'bg-gray-100' : ''}`}
              >
                <div className="text-sm text-gray-900">{opt.label}</div>
                {opt.description && (
                  <div className="text-xs text-gray-500">{opt.description}</div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


