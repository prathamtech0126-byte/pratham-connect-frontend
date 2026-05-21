import type { OtherProductItem, SaleTypeItem } from '@/api/incentives.api'

export type SaleTypeBucket = 'Visitor' | 'Spouse' | 'Student' | 'All Finance' | 'Other'

/** Narrow targets when a rule uses broad “All Finance” scope. */
export type AllFinanceSaleTypeCategory = 'spouse' | 'visitor' | 'student'

export function getSaleTypeBucketFromName(name: string): SaleTypeBucket {
  const n = name.toLowerCase()
  if (n.includes('visitor') || n.includes('schengen') || n.includes('visa')) return 'Visitor'
  if (n.includes('spouse') || n.includes('spousal')) return 'Spouse'
  if (n.includes('student')) return 'Student'
  if (n.includes('finance') || n.includes('employment') || n.includes('loan') || n.includes('credit') || n.includes('fund')) {
    return 'All Finance'
  }
  return 'Other'
}

/** Other-product rows that represent cross-cutting “All Finance” (not spouse-only finance add-ons). */
export function isBroadAllFinanceCatalogName(name: string): boolean {
  const n = name.toLowerCase()
  if (n.includes('all finance')) return true
  if (n.includes('finance') && n.includes('employ')) return true
  return false
}

/**
 * When true, the user must pick which core sale-type categories (spouse / visitor / student)
 * this All Finance rule applies to — incentives differ per corridor.
 */
export function requiresAllFinanceSaleTypeCategories(
  selectedIds: (string | number)[],
  saleTypes: SaleTypeItem[],
  otherProducts: OtherProductItem[],
): boolean {
  for (const raw of selectedIds) {
    const sid = String(raw)
    if (sid.startsWith('op_')) {
      const num = Number(sid.replace('op_', ''))
      const p = otherProducts.find((x) => x.id === num)
      if (p && isBroadAllFinanceCatalogName(p.name)) return true
      continue
    }
    const st = saleTypes.find((x) => String(x.id) === sid)
    if (st && getSaleTypeBucketFromName(st.name) === 'All Finance') return true
  }
  return false
}

export function formatAllFinanceCategoryLabel(c: AllFinanceSaleTypeCategory): string {
  if (c === 'spouse') return 'Spouse'
  if (c === 'visitor') return 'Visitor'
  return 'Student'
}
