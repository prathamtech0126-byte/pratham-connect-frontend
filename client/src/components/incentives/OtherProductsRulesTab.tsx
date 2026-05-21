import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  fetchAvailableProducts,
  fetchOtherProductSavedRules,
  saveOtherProductRules,
  type AvailableProduct,
  type CategoryRule,
} from '@/api/incentives.api'

const CATEGORY_COLORS: Record<string, string> = {
  Finance: 'bg-blue-500',
  Student: 'bg-green-500',
  Spouse: 'bg-pink-500',
  Visitor: 'bg-orange-500',
  Common: 'bg-purple-500',
  Other: 'bg-gray-500',
}

const DEFAULT_CATEGORY_COLOR = 'bg-slate-500'

function buildAmountMap(
  products: AvailableProduct[],
  savedRules: CategoryRule[],
): Record<string, string> {
  const saved: Record<string, string> = {}
  for (const rule of savedRules) {
    saved[rule.id] = String(rule.incentiveAmount)
  }
  const map: Record<string, string> = {}
  for (const p of products) {
    map[p.productName] = saved[p.productName] ?? ''
  }
  return map
}

export function OtherProductsRulesTab() {
  const queryClient = useQueryClient()

  const { data: products = [], isLoading: productsLoading, isError: productsError } = useQuery({
    queryKey: ['available-products'],
    queryFn: fetchAvailableProducts,
  })

  const { data: savedRules = [], isLoading: rulesLoading } = useQuery({
    queryKey: ['other-product-saved-rules'],
    queryFn: fetchOtherProductSavedRules,
  })

  const [amounts, setAmounts] = useState<Record<string, string>>({})
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (products.length === 0) return
    setAmounts(buildAmountMap(products, savedRules))
    setDirty(false)
  }, [products, savedRules])

  const categories = useMemo(() => {
    const seen = new Set<string>()
    const order: string[] = []
    for (const p of products) {
      if (!seen.has(p.category)) {
        seen.add(p.category)
        order.push(p.category)
      }
    }
    return order
  }, [products])

  const grouped = useMemo(() => {
    const map: Record<string, AvailableProduct[]> = {}
    for (const p of products) {
      if (!map[p.category]) map[p.category] = []
      map[p.category].push(p)
    }
    return map
  }, [products])

  const update = (productName: string, value: string) => {
    setAmounts(prev => ({ ...prev, [productName]: value }))
    setDirty(true)
  }

  const discard = () => {
    setAmounts(buildAmountMap(products, savedRules))
    setDirty(false)
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      const otherProductRules: CategoryRule[] = products
        .filter(p => amounts[p.productName] !== '')
        .map(p => ({
          id: p.productName,
          label: p.name,
          incentiveAmount: Number(amounts[p.productName]) || 0,
        }))
      return saveOtherProductRules({ otherProductRules })
    },
    onSuccess: () => {
      toast.success('Other product rules saved')
      queryClient.invalidateQueries({ queryKey: ['other-product-saved-rules'] })
      setDirty(false)
    },
    onError: () => toast.error('Failed to save rules'),
  })

  if (productsLoading || rulesLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
        Loading products...
      </div>
    )
  }

  if (productsError) {
    return (
      <div className="flex items-center justify-center py-16 text-destructive text-sm">
        Failed to load products. Please refresh the page.
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {categories.map(category => (
          <div key={category} className="border border-border rounded-lg overflow-hidden">
            <div className={`${CATEGORY_COLORS[category] ?? DEFAULT_CATEGORY_COLOR} px-4 py-2`}>
              <h3 className="text-sm font-bold text-white uppercase tracking-wide">{category}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-blue-100">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800">#</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800">Product</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800">Incentive (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {(grouped[category] ?? []).map((product, i) => (
                    <tr key={product.id} className="border-b border-border/60 hover:bg-muted/10">
                      <td className="px-3 py-2 text-xs text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2 text-sm">{product.name}</td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min={0}
                          value={amounts[product.productName] ?? ''}
                          onChange={e => update(product.productName, e.target.value)}
                          placeholder="e.g. 500"
                          className="w-28"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {dirty && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={discard} disabled={saveMutation.isPending}>
            Discard Changes
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? 'Saving...' : 'Save Other Product Rules'}
          </Button>
        </div>
      )}
    </div>
  )
}
