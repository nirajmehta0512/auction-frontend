// frontend/src/app/settings/brands/members/page.tsx
"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { useBrand } from '@/lib/brand-context'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

type BrandMember = {
  id: number
  user_id: number
  role: 'admin' | 'accountant' | 'user'
  profiles?: { id: number; email: string; first_name?: string; last_name?: string }
}

type ProfileLite = { id: number; email: string; first_name?: string; last_name?: string; role: string; is_active: boolean }

export default function BrandMembersPage() {
  const { brand } = useBrand()
  const [members, setMembers] = useState<BrandMember[]>([])
  const [users, setUsers] = useState<ProfileLite[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

  const authedFetch = (path: string, init?: RequestInit) => fetch(`${API_BASE_URL}${path}`, {
    ...(init || {}),
    headers: { ...(init?.headers || {}), Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  })

  const load = async () => {
    setLoading(true)
    try {
      const [mRes, uRes] = await Promise.all([
        authedFetch(`/api/brand-memberships?brand_code=${encodeURIComponent(brand)}`),
        authedFetch(`/api/users`)
      ])
      const mJson = await mRes.json()
      const uJson = await uRes.json()
      setMembers((mJson.data || []) as BrandMember[])
      setUsers((uJson.data || []) as ProfileLite[])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [brand])

  const nonMembers = useMemo(() => {
    const memberIds = new Set(members.map(m => m.user_id))
    return users.filter(u => u.is_active && !memberIds.has(u.id))
  }, [users, members])

  const addMember = async (userId: number, role: 'admin' | 'accountant' | 'user') => {
    setSaving(true)
    try {
      const res = await authedFetch('/api/brand-memberships', { method: 'POST', body: JSON.stringify({ brand_code: brand, user_id: userId, role }) })
      if (res.ok) load()
      else {
        const j = await res.json(); alert(j.error || 'Failed')
      }
    } finally { setSaving(false) }
  }

  const removeMember = async (userId: number) => {
    setSaving(true)
    try {
      const res = await authedFetch('/api/brand-memberships', { method: 'DELETE', body: JSON.stringify({ brand_code: brand, user_id: userId }) })
      if (res.ok) load()
      else {
        const j = await res.json(); alert(j.error || 'Failed')
      }
    } finally { setSaving(false) }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white border rounded p-4">
        <h1 className="text-xl font-semibold">Brand Members ({brand})</h1>
        <p className="text-sm text-gray-500">Manage which users have access to this brand.</p>
      </div>

      <div className="bg-white border rounded p-4 space-y-4">
        <h2 className="font-semibold">Members</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="py-2">User</th>
              <th className="py-2">Email</th>
              <th className="py-2">Role</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {members.map(m => (
              <tr key={m.id} className="border-t">
                <td className="py-2 pr-4">{m.profiles?.first_name} {m.profiles?.last_name}</td>
                <td className="py-2 pr-4">{m.profiles?.email}</td>
                <td className="py-2 pr-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{m.role}</span>
                </td>
                <td className="py-2 text-right">
                  <button className="text-red-600" disabled={saving} onClick={() => removeMember(m.user_id)}>Remove</button>
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr><td colSpan={4} className="py-6 text-center text-gray-500">No members yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-white border rounded p-4 space-y-3">
        <h2 className="font-semibold">Add Member</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select className="border rounded px-3 py-2" disabled={saving} id="user-select">
            {nonMembers.map(u => (
              <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.email})</option>
            ))}
          </select>
          <select className="border rounded px-3 py-2" disabled={saving} id="role-select">
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
          <button
            className="border rounded px-3 py-2"
            disabled={saving || nonMembers.length === 0}
            onClick={() => {
              const userSel = document.getElementById('user-select') as HTMLSelectElement
              const roleSel = document.getElementById('role-select') as HTMLSelectElement
              if (!userSel?.value) return
              addMember(parseInt(userSel.value, 10), roleSel.value as 'admin' | 'accountant' | 'user')
            }}
          >Add</button>
        </div>
      </div>
    </div>
  )
}



