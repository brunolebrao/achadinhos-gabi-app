"use client"

import { ProductCuration } from "../../../components/ProductCuration"
import { CheckSquare } from "lucide-react"

export default function CurationPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <CheckSquare className="h-8 w-8" />
            Curadoria de Produtos
          </h2>
        </div>
        
        <ProductCuration />
      </div>
    </div>
  )
}