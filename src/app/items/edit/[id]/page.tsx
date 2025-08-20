// frontend/src/app/items/edit/[id]/page.tsx
"use client"

import { useParams } from 'next/navigation'
import ItemForm from '@/components/items/ItemForm'

export default function EditItemPage() {
  const params = useParams()
  const itemId = params.id as string

  return (
    <ItemForm 
      mode="edit"
      itemId={itemId}
    />
  )
} 