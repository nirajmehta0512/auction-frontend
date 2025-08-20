// frontend/src/app/settings/members/page.tsx
"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { useBrand } from '@/lib/brand-context'
import UsersAPI, { User, BrandMember } from '@/lib/users-api'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export default function BrandMembersPage() {
  const { brand } = useBrand()
  const [brandId, setBrandId] = useState<number | null>(null)
  const [members, setMembers] = useState<BrandMember[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string | ''>('')
  const [role, setRole] = useState<'admin' | 'accountant' | 'user'>('user')
  const [loading, setLoading] = useState(false)
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

  const authedFetch = (path: string, init?: RequestInit) => fetch(`${API_BASE_URL}${path}`, { ...(init || {}), headers: { ...(init?.headers || {}), Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } })

  useEffect(() => {
    const load = async () => {
      try {
        const res = await authedFetch(`/api/brands/by-code/${brand}`)
        const j = await res.json()
        setBrandId(j?.data?.id || null)
      } catch {}
    }
    load()
  }, [brand])

  useEffect(() => {
    const load = async () => {
      if (!brandId) return
      try {
        const [m, u] = await Promise.all([
          UsersAPI.getBrandMembers(brandId),
          UsersAPI.getUsers(),
        ])
        if (m.success) setMembers(m.data)
        if (u.success) setUsers(u.data)
      } catch {}
    }
    load()
  }, [brandId])

  const nonMembers = useMemo(() => {
    const memberIds = new Set(members.map(m => m.user.id))
    return users.filter(u => !memberIds.has(u.id))
  }, [members, users])

  const addMember = async () => {
    if (!brandId || !selectedUserId) return
    setLoading(true)
    try {
      const res = await UsersAPI.upsertBrandMember({ user_id: String(selectedUserId), brand_id: brandId, role })
      if (res.success) {
        setSelectedUserId('')
        const m = await UsersAPI.getBrandMembers(brandId)
        if (m.success) setMembers(m.data)
      }
    } finally {
      setLoading(false)
    }
  }

  const removeMember = async (id: number) => {
    if (!confirm('Remove this member?')) return
    const res = await UsersAPI.deleteBrandMember(id)
    if (res.success && brandId) {
      const m = await UsersAPI.getBrandMembers(brandId)
      if (m.success) setMembers(m.data)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white border rounded p-4">
        <h1 className="text-xl font-semibold">Brand Members</h1>
        <p className="text-sm text-gray-500">Manage admins and staff for brand {brand}</p>
      </div>

      <div className="bg-white border rounded p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select className="border rounded px-3 py-2" value={selectedUserId} onChange={(e)=>setSelectedUserId(e.target.value || '')}>
            <option value="">Select user</option>
            {nonMembers.map(u => (
              <option key={u.id} value={u.id}>{u.first_name} {u.last_name} - {u.email}</option>
            ))}
          </select>
          <select className="border rounded px-3 py-2" value={role} onChange={(e)=>setRole(e.target.value as any)}>
            <option value="admin">Admin</option>
            <option value="accountant">Accountant</option>
            <option value="user">User</option>
          </select>
          <button className="border rounded px-3 py-2" disabled={loading || !selectedUserId} onClick={addMember}>Add</button>
        </div>

        <div>
          <h2 className="font-semibold mb-2">Current members</h2>
          <ul className="divide-y">
            {members.map(m => (
              <li key={m.id} className="py-2 flex justify-between items-center">
                <div>
                  <div className="font-medium">{m.user.first_name} {m.user.last_name}</div>
                  <div className="text-xs text-gray-500">{m.user.email}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs px-2 py-1 rounded bg-gray-100">{m.role}</span>
                  <button className="text-red-600 text-sm" onClick={()=>removeMember(m.id)}>Remove</button>
                </div>
              </li>
            ))}
            {members.length === 0 && (
              <li className="py-4 text-sm text-gray-500">No members yet.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}


