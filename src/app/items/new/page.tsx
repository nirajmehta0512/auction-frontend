// frontend/src/app/items/new/page.tsx
"use client"

import ItemForm from '@/components/items/ItemForm'

export default function NewItemPage() {
  return (
    <ItemForm 
      mode="create"
    />
  )
} 