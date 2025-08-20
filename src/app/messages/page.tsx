"use client"

import React, { useState } from 'react'
import { Clock, Zap, Mail, CheckCircle, Eye } from 'lucide-react'

// Mock messages data (empty as shown in screenshot)
const mockMessages: any[] = []

export default function MessagesPage() {
  const [showFilters, setShowFilters] = useState(false)

  return (
    <div className="flex flex-col h-full">
      {/* Page Header */}
      <div className="bg-slate-700 px-6 py-4">
        <h1 className="text-2xl font-semibold text-white">Messages</h1>
      </div>

      {/* Page Content */}
      <div className="flex-1 overflow-y-auto bg-white p-6">
        {/* Pending VIP Messages Section */}
        <div className="mb-8">
          <div className="flex items-center space-x-2 mb-4">
            <Clock className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Pending VIP Messages</h2>
          </div>
          
          <div className="bg-green-50 border-l-4 border-green-400 p-4">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-400 mr-3" />
              <p className="text-sm text-green-700">All VIP messages cleared.</p>
            </div>
          </div>
        </div>

        {/* Unsendable Messages Section */}
        <div className="mb-8">
          <div className="flex items-center space-x-2 mb-4">
            <Zap className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Unsendable Messages</h2>
          </div>
          
          <div className="bg-green-50 border-l-4 border-green-400 p-4">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-400 mr-3" />
              <p className="text-sm text-green-700">All Unsendable Messages cleared.</p>
            </div>
          </div>
        </div>

        {/* All Messages Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Mail className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">All Messages</h2>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-md text-sm transition-colors"
            >
              🔍 Show filter
            </button>
          </div>

          {/* Messages Table */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {mockMessages.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      <div className="flex flex-col items-center space-y-2">
                        <Eye className="h-8 w-8 text-gray-300" />
                        <span>No items found.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  mockMessages.map((message) => (
                    <tr key={message.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {message.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {message.subject}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {message.to}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {message.created}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {message.status}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                ( Items: 0 - 0 from 0 )
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                * Times are shown in UTC timezone.
              </div>
              <select className="border border-gray-300 rounded text-sm px-2 py-1">
                <option>25</option>
                <option>50</option>
                <option>100</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 