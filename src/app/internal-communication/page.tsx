// frontend/src/app/internal-communication/page.tsx
"use client"

import React, { useState, useEffect, useRef } from 'react'
import { 
  CheckSquare, 
  Send, 
  Plus, 
  Search,
  Calendar,
  Paperclip,
  ArrowRight,
  Clock,
  AlertCircle,
  Settings,
  MessageCircle,
  X,
  MoreVertical,
  File,
  Users,
  Filter,
  Smile,
  CheckCircle2,
  Circle,
  Trash2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import type { 
  User as UserType, 
  Message, 
  MessageRequest, 
  TaskFormData, 
  TaskComment,
  PaginatedResponse
} from '@/types/api'

interface GroupChat {
  id: string;
  name: string;
  members: string[];
  lastMessage?: Message;
  unreadCount: number;
}

type MessageFilter = 'all' | 'unread' | 'important' | 'files' | 'tasks';

export default function InternalCommunicationPage() {
  // Main state
  const [messageFilter, setMessageFilter] = useState<MessageFilter>('all')
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [isGroupChat, setIsGroupChat] = useState(false)
  
  // Data state
  const [messages, setMessages] = useState<Message[]>([])
  const [users, setUsers] = useState<UserType[]>([])
  const [groupChats, setGroupChats] = useState<GroupChat[]>([])
  const [comments, setComments] = useState<Record<string, TaskComment[]>>({})
  
  // UI state
  const [loading, setLoading] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [newComment, setNewComment] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const [currentUser, setCurrentUser] = useState<UserType | null>(null)
  const [showUserSelector, setShowUserSelector] = useState(false)
  const [attachments, setAttachments] = useState<File[]>([])
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null)
  
  // Form states
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [taskForm, setTaskForm] = useState<TaskFormData>({
    task_title: '',
    task_description: '',
    task_assigned_to: '',
    task_due_date: '',
    priority: 'normal',
    task_estimated_hours: undefined
  })
  const [groupName, setGroupName] = useState('')
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageInputRef = useRef<HTMLTextAreaElement>(null)
  const commentInputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const user = localStorage.getItem('user')
    if (user) {
      setCurrentUser(JSON.parse(user))
    }
    
    loadInitialData()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadMessages()
      loadUnreadCount()
    }, 30000)
    
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (selectedUsers.length > 0) {
      loadMessages()
    }
  }, [selectedUsers, messageFilter])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('token')
    
    if (!token) {
      console.error('No token found - redirecting to login')
      window.location.href = '/auth/login'
      return null
    }

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      })

      if (response.status === 401) {
        console.log('Auth failed - redirecting to login')
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.location.href = '/auth/login'
        return null
      }

      return response
    } catch (error) {
      console.error('Request failed:', error)
      throw error
    }
  }

  const loadInitialData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadUsers(),
        loadUnreadCount()
      ])
    } catch (error) {
      console.error('Failed to load initial data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    try {
      const response = await makeAuthenticatedRequest('/api/internal-communication/users')
      
      if (response?.ok) {
        const data: { users: UserType[] } = await response.json()
        setUsers(data.users || [])
        console.log('✅ Loaded users:', data.users?.length || 0)
      }
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  const loadMessages = async () => {
    if (selectedUsers.length === 0) return
    
    try {
      let url = '/api/internal-communication/messages?'
      const params = new URLSearchParams()
      
      if (selectedUsers.length === 1) {
        params.append('user_id', selectedUsers[0])
      }
      
      if (messageFilter !== 'all') {
        params.append('filter', messageFilter)
      }
      
      url += params.toString()
      
      const response = await makeAuthenticatedRequest(url)
      
      if (response?.ok) {
        const data: PaginatedResponse<Message> = await response.json()
        setMessages(data.data || [])
        console.log('✅ Loaded messages:', data.data?.length || 0)
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  const loadUnreadCount = async () => {
    try {
      const response = await makeAuthenticatedRequest('/api/internal-communication/unread-count')
      
      if (response?.ok) {
        const data: { count: number } = await response.json()
        setUnreadCount(data.count || 0)
      }
    } catch (error) {
      console.error('Error loading unread count:', error)
    }
  }

  const loadComments = async (messageId: string) => {
    try {
      const response = await makeAuthenticatedRequest(`/api/internal-communication/messages/${messageId}/comments`)
      
      if (response?.ok) {
        const data: { comments: TaskComment[] } = await response.json()
        setComments(prev => ({
          ...prev,
          [messageId]: data.comments || []
        }))
      }
    } catch (error) {
      console.error('Error loading comments:', error)
    }
  }

  const handleFileUpload = (files: FileList) => {
    const fileArray = Array.from(files)
    setAttachments(prev => [...prev, ...fileArray])
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const sendMessage = async () => {
    if ((!newMessage.trim() && attachments.length === 0) || loading || selectedUsers.length === 0) return

    setLoading(true)
    try {
      const messageData: MessageRequest = {
        content: newMessage || 'File attachment',
        message_type: attachments.length > 0 ? 'file' : 'text',
        receiver_id: selectedUsers.length === 1 ? selectedUsers[0] : undefined,
        priority: 'normal',
        attachments: attachments.length > 0 ? attachments : undefined
      }

      const response = await makeAuthenticatedRequest('/api/internal-communication/messages', {
        method: 'POST',
        body: JSON.stringify(messageData)
      })

      if (response?.ok) {
        setNewMessage('')
        setAttachments([])
        await loadMessages()
        messageInputRef.current?.focus()
      }
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setLoading(false)
    }
  }

  const createTask = async () => {
    if (!taskForm.task_title.trim() || !taskForm.task_assigned_to || loading) return

    setLoading(true)
    try {
      const messageData: MessageRequest = {
        content: taskForm.task_description || 'New task assigned',
        message_type: 'task',
        task_title: taskForm.task_title,
        task_description: taskForm.task_description,
        task_due_date: taskForm.task_due_date,
        task_assigned_to: taskForm.task_assigned_to,
        task_estimated_hours: taskForm.task_estimated_hours,
        priority: taskForm.priority,
        receiver_id: taskForm.task_assigned_to
      }

      const response = await makeAuthenticatedRequest('/api/internal-communication/messages', {
        method: 'POST',
        body: JSON.stringify(messageData)
      })

      if (response?.ok) {
        setShowTaskForm(false)
        setTaskForm({
          task_title: '',
          task_description: '',
          task_assigned_to: '',
          task_due_date: '',
          priority: 'normal',
          task_estimated_hours: undefined
        })
        await loadMessages()
      }
    } catch (error) {
      console.error('Error creating task:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateTaskStatus = async (messageId: string, status: string) => {
    setLoading(true)
    try {
      const response = await makeAuthenticatedRequest(`/api/internal-communication/messages/${messageId}`, {
        method: 'PUT',
        body: JSON.stringify({ task_status: status })
      })

      if (response?.ok) {
        await loadMessages()
      }
    } catch (error) {
      console.error('Error updating task status:', error)
    } finally {
      setLoading(false)
    }
  }

  const addComment = async (messageId: string) => {
    if (!newComment.trim() || loading) return

    setLoading(true)
    try {
      const response = await makeAuthenticatedRequest(`/api/internal-communication/messages/${messageId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ comment: newComment })
      })

      if (response?.ok) {
        setNewComment('')
        await loadComments(messageId)
        setActiveCommentId(null)
      }
    } catch (error) {
      console.error('Error adding comment:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'now'
    if (minutes < 60) return `${minutes}m`
    if (hours < 24) return `${hours}h`
    if (days < 7) return `${days}d`
    return date.toLocaleDateString()
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500 text-white'
      case 'high': return 'bg-orange-500 text-white'
      case 'normal': return 'bg-blue-500 text-white'
      case 'low': return 'bg-gray-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500 text-white'
      case 'in_progress': return 'bg-blue-500 text-white'
      case 'cancelled': return 'bg-red-500 text-white'
      default: return 'bg-yellow-500 text-black'
    }
  }

  const getTaskStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4" />
      case 'in_progress': return <Clock className="w-4 h-4" />
      case 'cancelled': return <X className="w-4 h-4" />
      default: return <Circle className="w-4 h-4" />
    }
  }

  const getFilteredMessages = () => {
    let filtered = messages
    
    if (searchQuery) {
      filtered = filtered.filter(msg => 
        msg.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.task_title?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    
    if (messageFilter === 'unread') {
      filtered = filtered.filter(msg => !msg.read_at)
    } else if (messageFilter === 'important') {
      filtered = filtered.filter(msg => msg.priority === 'high' || msg.priority === 'urgent')
    } else if (messageFilter === 'files') {
      filtered = filtered.filter(msg => msg.message_type === 'file')
    } else if (messageFilter === 'tasks') {
      filtered = filtered.filter(msg => msg.message_type === 'task')
    }
    
    return filtered
  }

  const renderSidebar = () => (
    <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
      {/* Sidebar Header */}
      <div className="p-6 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Messages</h1>
            <p className="text-sm text-gray-500">Team Communication</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowUserSelector(true)}
              className="border-blue-200 text-blue-600 hover:bg-blue-50"
            >
              <Plus className="w-4 h-4 mr-1" />
              Chat
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowTaskForm(true)}
              className="border-green-200 text-green-600 hover:bg-green-50"
            >
              <CheckSquare className="w-4 h-4 mr-1" />
              Task
            </Button>
          </div>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-6 py-3 border-b border-gray-200 bg-white">
        <div className="flex flex-wrap gap-2">
          {(['all', 'unread', 'important', 'files', 'tasks'] as MessageFilter[]).map((filter) => (
            <button
              key={filter}
              onClick={() => setMessageFilter(filter)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                messageFilter === filter
                  ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
              {filter === 'unread' && unreadCount > 0 && (
                <span className="ml-1.5 bg-blue-600 text-white rounded-full px-1.5 py-0.5 text-xs">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Team Members List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center">
              <Users className="w-4 h-4 mr-2" />
              Team Members
            </h3>
            <span className="text-xs text-gray-500">{users.length} online</span>
          </div>
          
          <div className="space-y-2">
            {users.map((user) => {
              const isSelected = selectedUsers.includes(user.auth_user_id) && selectedUsers.length === 1
              const userInitials = `${user.first_name[0]}${user.last_name[0]}`
              
              return (
                <button
                  key={user.id}
                  onClick={() => {
                    setSelectedUsers([user.auth_user_id])
                    setSelectedConversation(null)
                    setIsGroupChat(false)
                  }}
                  className={`w-full text-left p-3 rounded-xl transition-all duration-200 ${
                    isSelected
                      ? 'bg-blue-50 border-2 border-blue-200 shadow-sm'
                      : 'hover:bg-gray-100 border-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                      isSelected ? 'bg-blue-600 text-white' : 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'
                    }`}>
                      {userInitials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {user.first_name} {user.last_name}
                      </div>
                      <div className="text-xs text-gray-500 truncate flex items-center">
                        <span className="capitalize">{user.role}</span>
                        <span className="ml-2 w-2 h-2 bg-green-500 rounded-full"></span>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )

  const renderMessage = (message: Message) => {
    const isCurrentUser = message.sender_id === currentUser?.auth_user_id
    const hasComments = comments[message.id] && comments[message.id].length > 0
    const isCommentActive = activeCommentId === message.id
    
    return (
      <div key={message.id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-6`}>
        <div className={`max-w-2xl ${isCurrentUser ? 'order-2' : 'order-1'}`}>
          <div className={`rounded-2xl px-4 py-3 shadow-sm ${
            isCurrentUser
              ? 'bg-blue-600 text-white'
              : 'bg-white border border-gray-200'
          }`}>
            {message.message_type === 'task' ? (
              <div className="space-y-3">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckSquare className="w-4 h-4" />
                  <span className="font-medium text-xs uppercase tracking-wide">TASK</span>
                  <Badge className={`text-xs ${getPriorityColor(message.priority)} border-0`}>
                    {message.priority}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">{message.task_title}</h4>
                  {message.task_description && (
                    <p className="text-sm opacity-90">{message.task_description}</p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge className={`text-xs ${getTaskStatusColor(message.task_status || 'pending')} border-0`}>
                      {getTaskStatusIcon(message.task_status || 'pending')}
                      <span className="ml-1 capitalize">{message.task_status?.replace('_', ' ') || 'pending'}</span>
                    </Badge>
                  </div>
                  
                  {message.task_assigned_to === currentUser?.auth_user_id && message.task_status !== 'completed' && (
                    <Button
                      size="sm"
                      variant={isCurrentUser ? "outline" : "default"}
                      onClick={() => updateTaskStatus(message.id, 'completed')}
                      className="text-xs h-7"
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Complete
                    </Button>
                  )}
                </div>

                {(message.task_due_date || message.task_estimated_hours) && (
                  <div className="flex items-center space-x-4 text-xs opacity-75 pt-2 border-t border-opacity-20 border-gray-300">
                    {message.task_due_date && (
                      <div className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        Due: {new Date(message.task_due_date).toLocaleDateString()}
                      </div>
                    )}
                    {message.task_estimated_hours && (
                      <div className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {message.task_estimated_hours}h estimated
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : message.message_type === 'file' ? (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <File className="w-4 h-4" />
                  <span className="font-medium text-xs uppercase tracking-wide">FILE</span>
                </div>
                <div className="text-sm">{message.content}</div>
              </div>
            ) : (
              <div className="text-sm leading-relaxed">{message.content}</div>
            )}
          </div>
          
          {/* Message footer */}
          <div className={`flex items-center justify-between mt-2 px-2 ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <span>{message.sender_name || 'Unknown'}</span>
              <span>•</span>
              <span>{formatTime(message.created_at)}</span>
            </div>
            
            {message.message_type === 'task' && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    if (isCommentActive) {
                      setActiveCommentId(null)
                    } else {
                      setActiveCommentId(message.id)
                      if (!comments[message.id]) {
                        loadComments(message.id)
                      }
                    }
                  }}
                  className="text-xs text-gray-500 hover:text-blue-600 flex items-center"
                >
                  <MessageCircle className="w-3 h-3 mr-1" />
                  {comments[message.id]?.length || 0} {comments[message.id]?.length === 1 ? 'comment' : 'comments'}
                </button>
              </div>
            )}
          </div>

          {/* Comments section */}
          {message.message_type === 'task' && (isCommentActive || hasComments) && (
            <div className="mt-4 pl-4 border-l-2 border-gray-200 space-y-3">
              {comments[message.id]?.map((comment) => (
                <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">
                      {comment.profiles?.first_name} {comment.profiles?.last_name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTime(comment.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{comment.comment}</p>
                </div>
              ))}
              
              {isCommentActive && (
                <div className="flex space-x-2">
                  <textarea
                    ref={commentInputRef}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm"
                    rows={2}
                  />
                  <div className="flex flex-col space-y-1">
                    <Button
                      onClick={() => addComment(message.id)}
                      disabled={!newComment.trim() || loading}
                      size="sm"
                      className="h-8"
                    >
                      <Send className="w-3 h-3" />
                    </Button>
                    <Button
                      onClick={() => setActiveCommentId(null)}
                      variant="outline"
                      size="sm"
                      className="h-8"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderMainContent = () => (
    <div className="flex-1 flex flex-col h-full bg-gray-50">
      {selectedUsers.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto">
              <MessageCircle className="w-8 h-8 text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a conversation</h3>
              <p className="text-gray-500 max-w-sm">
                Choose a team member from the sidebar to start messaging or create a new task.
              </p>
            </div>
            <div className="flex justify-center space-x-3">
              <Button onClick={() => setShowUserSelector(true)} className="bg-blue-600 hover:bg-blue-700">
                <Users className="w-4 h-4 mr-2" />
                Start Chat
              </Button>
              <Button onClick={() => setShowTaskForm(true)} variant="outline" className="border-green-200 text-green-600 hover:bg-green-50">
                <CheckSquare className="w-4 h-4 mr-2" />
                Create Task
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Chat Header */}
          <div className="border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {selectedUsers.length === 1 ? (
                  <>
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                      {users.find(u => u.auth_user_id === selectedUsers[0])?.first_name[0]}
                      {users.find(u => u.auth_user_id === selectedUsers[0])?.last_name[0]}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {users.find(u => u.auth_user_id === selectedUsers[0])?.first_name}{' '}
                        {users.find(u => u.auth_user_id === selectedUsers[0])?.last_name}
                      </h3>
                      <p className="text-sm text-gray-500 flex items-center">
                        <span className="capitalize">{users.find(u => u.auth_user_id === selectedUsers[0])?.role}</span>
                        <span className="ml-2 w-2 h-2 bg-green-500 rounded-full"></span>
                        <span className="ml-1">Online</span>
                      </p>
                    </div>
                  </>
                ) : (
                  <div>
                    <h3 className="font-semibold text-gray-900">Group Chat</h3>
                    <p className="text-sm text-gray-500">{selectedUsers.length} members</p>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTaskForm(true)}
                  className="border-green-200 text-green-600 hover:bg-green-50"
                >
                  <CheckSquare className="w-4 h-4 mr-2" />
                  Assign Task
                </Button>
                <Button variant="outline" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6">
            {getFilteredMessages().length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto">
                    <MessageCircle className="w-6 h-6 text-gray-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">No messages yet</h4>
                    <p className="text-sm text-gray-500">Start the conversation!</p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {getFilteredMessages().map(renderMessage)}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Message Input */}
          <div className="border-t border-gray-200 bg-white p-4">
            {/* Attachments Preview */}
            {attachments.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center space-x-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                    <File className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-blue-800 truncate max-w-32">{file.name}</span>
                    <button
                      onClick={() => removeAttachment(index)}
                      className="text-blue-400 hover:text-blue-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex items-end space-x-3">
              <div className="flex-1">
                <textarea
                  ref={messageInputRef}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows={1}
                  style={{ minHeight: '44px', maxHeight: '120px' }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage()
                    }
                  }}
                />
              </div>
              <div className="flex space-x-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={(e) => handleFileUpload(e.target.files || new FileList())}
                  className="hidden"
                />
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-11 w-11 p-0"
                >
                  <Paperclip className="w-4 h-4" />
                </Button>
                <Button 
                  onClick={sendMessage}
                  disabled={(!newMessage.trim() && attachments.length === 0) || loading}
                  className="h-11 w-11 p-0 bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )

  return (
    <div className="h-screen bg-white flex overflow-hidden">
      {/* Sidebar */}
      {renderSidebar()}

      {/* Main Content */}
      {renderMainContent()}

      {/* User Selector Modal */}
      {showUserSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Start New Conversation</h3>
                <p className="text-sm text-gray-500">Select team members to chat with</p>
              </div>
              <button
                onClick={() => setShowUserSelector(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                {users.map((user) => (
                  <label key={user.id} className="flex items-center space-x-3 p-3 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.auth_user_id)}
                      onChange={(e) => {
                        const isChecked = e.target.checked
                        setSelectedUsers(prev => 
                          isChecked
                            ? [...prev, user.auth_user_id]
                            : prev.filter(id => id !== user.auth_user_id)
                        )
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
                      {user.first_name[0]}{user.last_name[0]}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {user.first_name} {user.last_name}
                      </div>
                      <div className="text-xs text-gray-500 capitalize">{user.role}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowUserSelector(false)
                  setSelectedUsers([])
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setShowUserSelector(false)
                }}
                disabled={selectedUsers.length === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Start Chat
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Task Creation Modal */}
      {showTaskForm && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4 shadow-xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Create New Task</h3>
                <p className="text-sm text-gray-500">Assign a task to a team member</p>
              </div>
              <button
                onClick={() => setShowTaskForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Task Title *</label>
                <input
                  type="text"
                  value={taskForm.task_title}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, task_title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter task title"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={taskForm.task_description}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, task_description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Task description (optional)"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign To *</label>
                <select
                  value={taskForm.task_assigned_to}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, task_assigned_to: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select team member</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.auth_user_id}>
                      {user.first_name} {user.last_name} - {user.role}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, priority: e.target.value as TaskFormData['priority'] }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Hours</label>
                  <input
                    type="number"
                    value={taskForm.task_estimated_hours || ''}
                    onChange={(e) => setTaskForm(prev => ({ 
                      ...prev, 
                      task_estimated_hours: e.target.value ? parseInt(e.target.value) : undefined 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Hours"
                    min="1"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={taskForm.task_due_date}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, task_due_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowTaskForm(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={createTask}
                disabled={!taskForm.task_title.trim() || !taskForm.task_assigned_to || loading}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading ? 'Creating...' : 'Create Task'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 