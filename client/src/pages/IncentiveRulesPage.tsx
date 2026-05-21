import { useState, useEffect, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { DateRange } from 'react-day-picker'
import {
  ArrowRight, ArrowLeft, CalendarDays, Tag, Plus,
  Settings2, LayoutList, Pencil, Archive, Copy, FolderOpen, Search, X,
} from 'lucide-react'
import { PageWrapper } from '@/layout/PageWrapper'
import {
  fetchSaleTypes,
  fetchOtherProducts,
  fetchRuleConfigurations,
  fetchRuleConfigurationById,
  createRuleConfiguration,
  updateRuleConfiguration,
  deleteRuleConfiguration,
  RuleConfiguration,
  CreateRuleConfigPayload,
  RuleConfigRuleType,
} from '@/api/incentives.api'

import { StepperHeader } from '@/components/incentives/StepperHeader'
import { PeriodSelector } from '@/components/incentives/PeriodSelector'
import { SaleTypeSelector } from '@/components/incentives/SaleTypeSelector'
import { RuleTypeSelector } from '@/components/incentives/RuleTypeSelector'
import { RuleSummaryBar } from '@/components/incentives/RuleSummaryBar'
import {
  SalaryRangeSection,
  SalaryRangeDraft,
  makeEmptyRangeRow,
  validateRanges,
} from '@/components/incentives/SalaryRangeSection'
import {
  CategorySection,
  CategoryDraft,
  validateCategories,
} from '@/components/incentives/CategorySection'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AllFinanceTargetCategories } from '@/components/incentives/AllFinanceTargetCategories'
import {
  requiresAllFinanceSaleTypeCategories,
  formatAllFinanceCategoryLabel,
  type AllFinanceSaleTypeCategory,
} from '@/lib/incentive-sale-type-category'
import { cn } from '@/lib/utils'

type PageView = 'list' | 'create_period' | 'period_detail' | 'rule_detail' | 'rule_wizard'

type PeriodContext = { startDate: string; endDate: string }

const PERIOD_LABEL_STORAGE_PREFIX = 'incentive-rule-period-label:'

function periodLabelKey(startDate: string, endDate: string) {
  return `${PERIOD_LABEL_STORAGE_PREFIX}${startDate}|${endDate}`
}

function readPeriodLabel(startDate: string, endDate: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(periodLabelKey(startDate, endDate))
  } catch {
    return null
  }
}

function writePeriodLabel(startDate: string, endDate: string, label: string) {
  try {
    localStorage.setItem(periodLabelKey(startDate, endDate), label.trim())
  } catch {
    /* ignore */
  }
}

function groupConfigsByPeriod(configs: RuleConfiguration[]) {
  const active = configs.filter((c) => c.isActive)
  const m = new Map<string, RuleConfiguration[]>()
  for (const c of active) {
    const k = `${c.startDate}|${c.endDate}`
    const list = m.get(k) ?? []
    list.push(c)
    m.set(k, list)
  }
  return Array.from(m.entries())
    .map(([key, rules]) => {
      const [startDate, endDate] = key.split('|')
      const sorted = [...rules].sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
        if (tb !== ta) return tb - ta
        return String(a.name).localeCompare(String(b.name))
      })
      return { key, startDate, endDate, rules: sorted }
    })
    .sort((a, b) => (a.startDate < b.startDate ? 1 : a.startDate > b.startDate ? -1 : 0))
}

function ruleTypeLabel(rt: RuleConfigRuleType): string {
  if (rt === 'slab') return 'Slab Wise'
  if (rt === 'budget') return 'Budget Wise'
  return 'Budget + Slab'
}

function configToCreatePayload(
  c: RuleConfiguration,
  overrides?: { startDate?: string; endDate?: string; name?: string },
): CreateRuleConfigPayload {
  const startDate = overrides?.startDate ?? c.startDate
  const endDate = overrides?.endDate ?? c.endDate
  const name = overrides?.name ?? c.name

  if (c.ruleType === 'budget') {
    return {
      name,
      description: c.description,
      startDate,
      endDate,
      saleTypeIds: c.saleTypeIds ?? [],
      ruleType: 'budget',
      allFinanceSaleTypeCategories: c.allFinanceSaleTypeCategories,
      rules: (c.rules ?? []).map((r) => ({
        label: String(r.label ?? ''),
        incentiveAmount: r.incentiveAmount,
      })),
    }
  }

  return {
    name,
    description: c.description,
    startDate,
    endDate,
    saleTypeIds: c.saleTypeIds ?? [],
    ruleType: c.ruleType === 'budget_threshold_slab' ? 'budget_threshold_slab' : 'slab',
    minBudgetThreshold: c.minBudgetThreshold,
    allFinanceSaleTypeCategories: c.allFinanceSaleTypeCategories,
    rules: (c.rules ?? []).map((r) => ({
      minCount: r.minCount,
      maxCount: r.maxCount,
      label: r.label,
      incentiveAmount: r.incentiveAmount,
    })),
  }
}

const RULE_WIZARD_STEPS = [
  { n: 1, label: 'Rule' },
  { n: 2, label: 'Sale type/Product type' },
  { n: 3, label: 'Rule type' },
  { n: 4, label: 'Configure' },
]

export default function IncentiveRulesPage() {
  const queryClient = useQueryClient()

  const [view, setView] = useState<PageView>('list')
  const [periodCtx, setPeriodCtx] = useState<PeriodContext | null>(null)
  const [selectedRuleId, setSelectedRuleId] = useState<string | number | null>(null)
  const [deletingId, setDeletingId] = useState<string | number | null>(null)
  const [archivingPeriodKey, setArchivingPeriodKey] = useState<string | null>(null)
  const [ruleSearch, setRuleSearch] = useState('')

  const [periodLabelDraft, setPeriodLabelDraft] = useState('')
  const [periodLabelError, setPeriodLabelError] = useState<string | null>(null)
  const [createPeriodRange, setCreatePeriodRange] = useState<DateRange | undefined>()

  const [renameOpen, setRenameOpen] = useState(false)
  const [renameDraft, setRenameDraft] = useState('')

  const [dupPeriodOpen, setDupPeriodOpen] = useState(false)
  const [dupPeriodRange, setDupPeriodRange] = useState<DateRange | undefined>()
  const [dupPeriodSource, setDupPeriodSource] = useState<{ startDate: string; endDate: string; rules: RuleConfiguration[] } | null>(null)
  const [dupPeriodBusy, setDupPeriodBusy] = useState(false)
  /** Label for the new period row (localStorage); prefilled when opening duplicate dialog. */
  const [dupPeriodLabelDraft, setDupPeriodLabelDraft] = useState('')

  const [copyToPeriodOpen, setCopyToPeriodOpen] = useState(false)
  const [copyToPeriodConfig, setCopyToPeriodConfig] = useState<RuleConfiguration | null>(null)
  const [copyToPeriodTargetKey, setCopyToPeriodTargetKey] = useState<string>('')
  const [copyToPeriodBusy, setCopyToPeriodBusy] = useState(false)

  const [afterRuleSave, setAfterRuleSave] = useState<'list' | 'period'>('list')

  const [wizardStep, setWizardStep] = useState(1)
  const [editingConfigId, setEditingConfigId] = useState<string | number | null>(null)
  const [configName, setConfigName] = useState('')
  const [configDescription, setConfigDescription] = useState('')
  const [configNameError, setConfigNameError] = useState<string | null>(null)
  const [wizardPeriod, setWizardPeriod] = useState<DateRange | undefined>()
  const [saleTypes, setSaleTypes] = useState<(string | number)[]>([])
  const [allFinanceCategories, setAllFinanceCategories] = useState<AllFinanceSaleTypeCategory[]>([])
  const [ruleType, setRuleType] = useState<RuleConfigRuleType | null>(null)
  const [minBudgetThreshold, setMinBudgetThreshold] = useState('')
  const [slabDraft, setSlabDraft] = useState<SalaryRangeDraft[]>([makeEmptyRangeRow()])
  const [budgetDraft, setBudgetDraft] = useState<CategoryDraft[]>([
    { id: crypto.randomUUID(), label: '', incentiveAmount: '', percentage: '' },
  ])

  const { data: configs = [], isLoading: configsLoading, isError: configsError } = useQuery({
    queryKey: ['rule-configurations'],
    queryFn: fetchRuleConfigurations,
  })

  const periodGroups = useMemo(() => groupConfigsByPeriod(configs), [configs])

  const { data: selectedConfig, isLoading: detailLoading } = useQuery({
    queryKey: ['rule-configurations', selectedRuleId],
    queryFn: () => fetchRuleConfigurationById(selectedRuleId!),
    enabled: view === 'rule_detail' && selectedRuleId != null,
  })

  const { data: saleTypesData = [] } = useQuery({
    queryKey: ['sale-types'],
    queryFn: fetchSaleTypes,
  })

  const { data: otherProductsData = [] } = useQuery({
    queryKey: ['other-products'],
    queryFn: fetchOtherProducts,
  })

  const needsAllFinanceCategoryStep = useMemo(
    () => requiresAllFinanceSaleTypeCategories(saleTypes, saleTypesData, otherProductsData),
    [saleTypes, saleTypesData, otherProductsData],
  )

  useEffect(() => {
    if (!needsAllFinanceCategoryStep) {
      setAllFinanceCategories([])
    }
  }, [needsAllFinanceCategoryStep])

  const getSaleTypeNames = (saleTypeIds: (string | number)[] = [], fallback: string[] = []) => {
    const ids = new Set(saleTypeIds.map((id) => String(id)))
    const resolved = saleTypesData
      .filter((item) => ids.has(String(item.id)))
      .map((item) => item.name)

    return resolved.length > 0 ? resolved : fallback
  }

  const getBudgetBaseAmount = (label?: string) => {
    if (!label) return null
    const cleaned = label.trim().toLowerCase().replace(/,/g, '')
    const match = cleaned.match(/^(\d+(?:\.\d+)?)(k)?$/)
    if (!match) return null

    const value = Number(match[1])
    if (!Number.isFinite(value) || value <= 0) return null
    return match[2] ? value * 1000 : value
  }

  const getRulePercentage = (
    config: RuleConfiguration,
    rule: RuleConfiguration['rules'][number],
  ) => {
    if (config.ruleType !== 'budget') return null
    const budgetBase = getBudgetBaseAmount(rule.label)
    if (!budgetBase || !rule.incentiveAmount) return null
    return (rule.incentiveAmount / budgetBase) * 100
  }

  const getApiMessage = (err: unknown, fallback: string): string => {
    if (err && typeof err === 'object' && 'response' in err) {
      const msg = (err as any).response?.data?.message
      if (typeof msg === 'string' && msg.trim()) return msg.trim()
    }
    return fallback
  }

  const resolveErrorMessage = (message: string) => {
    const nameMap = new Map<string, string>()
    saleTypesData.forEach((st) => nameMap.set(String(st.id), st.name))
    otherProductsData.forEach((p) => nameMap.set(String(p.id), p.name))

    const resolveIds = (idsStr: string) =>
      idsStr.split(',').map((s) => s.trim()).filter(Boolean).map((id) => nameMap.get(id) ?? id)

    const conflictMatch = message.match(
      /sale type id\(s\)\s*\[([^\]]+)\]\s*are already assigned to rule\s*"([^"]+)"\s*in the overlapping date range/i,
    )
    if (conflictMatch) {
      const names = resolveIds(conflictMatch[1])
      const ruleName = conflictMatch[2]
      return (
        <div className="space-y-2 text-sm">
          <p>
            <span className="font-bold">"{ruleName}"</span> already covers this date range.
          </p>
          <p className="opacity-85 text-xs">
            {names.length} product{names.length !== 1 ? 's' : ''} conflict{names.length === 1 ? 's' : ''}:
          </p>
          <div className="flex flex-wrap gap-1">
            {names.map((name, i) => (
              <span key={i} className="text-xs bg-white/20 border border-white/30 px-1.5 py-0.5 rounded">
                {name}
              </span>
            ))}
          </div>
        </div>
      )
    }

    return message.replace(/\[([0-9,\s]+)\]/, (_match, idsStr: string) =>
      `[${resolveIds(idsStr).join(', ')}]`,
    )
  }

  const resetWizardFields = useCallback(() => {
    setWizardStep(1)
    setEditingConfigId(null)
    setConfigName('')
    setConfigDescription('')
    setConfigNameError(null)
    setWizardPeriod(undefined)
    setSaleTypes([])
    setAllFinanceCategories([])
    setRuleType(null)
    setMinBudgetThreshold('')
    setSlabDraft([makeEmptyRangeRow()])
    setBudgetDraft([{ id: crypto.randomUUID(), label: '', incentiveAmount: '', percentage: '' }])
  }, [])

  const goToList = useCallback(() => {
    setView('list')
    setPeriodCtx(null)
    setSelectedRuleId(null)
    setEditingConfigId(null)
    setCreatePeriodRange(undefined)
    setPeriodLabelDraft('')
    setPeriodLabelError(null)
    setAfterRuleSave('list')
    setDupPeriodOpen(false)
    setDupPeriodSource(null)
    setDupPeriodRange(undefined)
    setDupPeriodLabelDraft('')
    setCopyToPeriodOpen(false)
    setCopyToPeriodConfig(null)
    setCopyToPeriodTargetKey('')
    setRuleSearch('')
    resetWizardFields()
  }, [resetWizardFields])

  const openPeriodDetail = useCallback((ctx: PeriodContext) => {
    setPeriodCtx(ctx)
    setView('period_detail')
    setSelectedRuleId(null)
  }, [])

  const createMutation = useMutation({
    mutationFn: createRuleConfiguration,
    onSuccess: (result) => {
      toast({ title: 'Success', description: result.message })
      queryClient.invalidateQueries({ queryKey: ['rule-configurations'] })
      if (afterRuleSave === 'period' && periodCtx) {
        setView('period_detail')
        resetWizardFields()
      } else {
        goToList()
      }
    },
    onError: (err) =>
      toast({
        title: 'Error',
        description: resolveErrorMessage(getApiMessage(err, 'Failed to create rule configuration')),
        variant: 'destructive',
      }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: Parameters<typeof updateRuleConfiguration>[1] }) =>
      updateRuleConfiguration(id, payload),
    onSuccess: (result) => {
      toast({ title: 'Success', description: result.message })
      queryClient.invalidateQueries({ queryKey: ['rule-configurations'] })
      if (afterRuleSave === 'period' && periodCtx) {
        setView('period_detail')
        resetWizardFields()
      } else {
        goToList()
      }
    },
    onError: (err) =>
      toast({
        title: 'Error',
        description: resolveErrorMessage(getApiMessage(err, 'Failed to update rule configuration')),
        variant: 'destructive',
      }),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteRuleConfiguration,
    onSuccess: (result) => {
      toast({ title: 'Success', description: result.message })
      queryClient.invalidateQueries({ queryKey: ['rule-configurations'] })
    },
    onError: (err) =>
      toast({
        title: 'Error',
        description: resolveErrorMessage(getApiMessage(err, 'Failed to delete rule configuration')),
        variant: 'destructive',
      }),
  })

  useEffect(() => {
    if (view !== 'list') {
      window.history.pushState({ incentiveView: view }, '')
    }
  }, [view])

  useEffect(() => {
    const handler = () => goToList()
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [goToList])

  const rulesInCurrentPeriod = useMemo(() => {
    if (!periodCtx) return []
    return configs.filter(
      (c) => c.isActive && c.startDate === periodCtx.startDate && c.endDate === periodCtx.endDate,
    )
  }, [configs, periodCtx])

  const filteredRules = useMemo(() => {
    const q = ruleSearch.trim().toLowerCase()
    if (!q) return rulesInCurrentPeriod
    return rulesInCurrentPeriod.filter((c) => {
      if (c.name?.toLowerCase().includes(q)) return true
      if (ruleTypeLabel(c.ruleType).toLowerCase().includes(q)) return true
      const saleTypeStr = getSaleTypeNames(c.saleTypeIds, c.saleTypeNames).join(' ').toLowerCase()
      if (saleTypeStr.includes(q)) return true
      const otherStr = (c.otherProducts ?? []).map((p) => p.name).join(' ').toLowerCase()
      if (otherStr.includes(q)) return true
      return false
    })
  }, [rulesInCurrentPeriod, ruleSearch])

  const periodDisplayLabel = useCallback((startDate: string, endDate: string) => {
    return readPeriodLabel(startDate, endDate) ?? `${format(new Date(startDate), 'dd MMM yyyy')} – ${format(new Date(endDate), 'dd MMM yyyy')}`
  }, [])

  const openCopyRuleToPeriodDialog = useCallback(
    (config: RuleConfiguration) => {
      const others = periodGroups.filter(
        (g) => !(g.startDate === config.startDate && g.endDate === config.endDate),
      )
      if (others.length === 0) {
        toast({
          title: 'No other periods',
          description: 'Create another period first. Then you can copy this rule into it.',
          variant: 'destructive',
        })
        return
      }
      setCopyToPeriodConfig(config)
      setCopyToPeriodTargetKey('')
      setCopyToPeriodOpen(true)
    },
    [periodGroups],
  )

  const runCopyRuleToPeriod = useCallback(async () => {
    if (!copyToPeriodConfig || !copyToPeriodTargetKey) return
    const target = periodGroups.find((g) => g.key === copyToPeriodTargetKey)
    if (!target) return
    setCopyToPeriodBusy(true)
    try {
      const payload = configToCreatePayload(copyToPeriodConfig, {
        startDate: target.startDate,
        endDate: target.endDate,
        name: copyToPeriodConfig.name,
      })
      await createRuleConfiguration(payload)
      await queryClient.invalidateQueries({ queryKey: ['rule-configurations'] })
      toast({
        title: 'Rule copied',
        description: `The rule was added to ${periodDisplayLabel(target.startDate, target.endDate)}.`,
      })
      setCopyToPeriodOpen(false)
      setCopyToPeriodConfig(null)
      setCopyToPeriodTargetKey('')
    } catch (err) {
      toast({
        title: 'Error',
        description: getApiMessage(err, 'Failed to copy rule to that period.'),
        variant: 'destructive',
      })
    } finally {
      setCopyToPeriodBusy(false)
    }
  }, [
    copyToPeriodConfig,
    copyToPeriodTargetKey,
    periodGroups,
    periodDisplayLabel,
    getApiMessage,
    queryClient,
  ])

  const openRuleWizardCreate = () => {
    if (!periodCtx) return
    setAfterRuleSave('period')
    setView('rule_wizard')
    resetWizardFields()
    setWizardStep(1)
    setWizardPeriod({
      from: new Date(periodCtx.startDate),
      to: new Date(periodCtx.endDate),
    })
  }

  const openRuleWizardForConfig = (config: RuleConfiguration, mode: 'edit' | 'duplicate') => {
    if (!periodCtx) {
      setPeriodCtx({ startDate: config.startDate, endDate: config.endDate })
    }

    setAfterRuleSave('period')
    setView('rule_wizard')
    setWizardStep(1)
    setEditingConfigId(mode === 'edit' ? config.id : null)
    setConfigName(mode === 'duplicate' ? `${config.name} Copy` : config.name)
    setConfigDescription(config.description ?? '')
    setConfigNameError(null)
    setWizardPeriod({
      from: new Date(config.startDate),
      to: new Date(config.endDate),
    })
    setSaleTypes(config.saleTypeIds ?? [])
    setAllFinanceCategories(config.allFinanceSaleTypeCategories ?? [])
    setRuleType(config.ruleType)

    if (config.ruleType === 'budget') {
      const budgetRows = (config.rules ?? []).map((rule) => {
        const budgetBase = getBudgetBaseAmount(String(rule.label ?? ''))
        const incentive = rule.incentiveAmount ?? 0
        const percentage = budgetBase && incentive
          ? ((incentive / budgetBase) * 100).toFixed(2)
          : ''

        return {
          id: crypto.randomUUID(),
          label: String(rule.label ?? ''),
          incentiveAmount: String(rule.incentiveAmount ?? ''),
          percentage,
        }
      })
      setBudgetDraft(budgetRows.length > 0
        ? budgetRows
        : [{ id: crypto.randomUUID(), label: '', incentiveAmount: '', percentage: '' }])
      setSlabDraft([makeEmptyRangeRow()])
      setMinBudgetThreshold('')
      return
    }

    const slabRows = (config.rules ?? []).map((rule) => {
      const normalizedMax = rule.maxCount == null || rule.maxCount === -1 ? '' : String(rule.maxCount)
      return {
        id: crypto.randomUUID(),
        minCount: String(rule.minCount ?? ''),
        maxCount: normalizedMax,
        incentiveAmount: String(rule.incentiveAmount ?? ''),
        openEnded: rule.maxCount == null || rule.maxCount === -1,
      }
    })
    setSlabDraft(slabRows.length > 0 ? slabRows : [makeEmptyRangeRow()])
    setBudgetDraft([{ id: crypto.randomUUID(), label: '', incentiveAmount: '', percentage: '' }])
    setMinBudgetThreshold(
      config.ruleType === 'budget_threshold_slab' && config.minBudgetThreshold != null
        ? String(config.minBudgetThreshold)
        : '',
    )
  }

  const handleSubmitRule = () => {
    if (!wizardPeriod?.from || !wizardPeriod?.to || !ruleType) return

    if (needsAllFinanceCategoryStep && allFinanceCategories.length === 0) {
      toast({
        title: 'Error',
        description: 'Select at least one sale-type category (Visitor, Spouse, or Student) for this All Finance rule.',
        variant: 'destructive',
      })
      return
    }

    if (ruleType === 'slab' || ruleType === 'budget_threshold_slab') {
      const err = validateRanges(slabDraft)
      if (err) {
        toast({ title: 'Error', description: err, variant: 'destructive' })
        return
      }
      if (ruleType === 'budget_threshold_slab') {
        const t = Number(minBudgetThreshold)
        if (!Number.isFinite(t) || t <= 0) {
          toast({ title: 'Error', description: 'Enter a valid minimum budget threshold.', variant: 'destructive' })
          return
        }
      }
    } else {
      const err = validateCategories(budgetDraft)
      if (err) {
        toast({ title: 'Error', description: err, variant: 'destructive' })
        return
      }
    }

    const rules =
      ruleType === 'budget'
        ? budgetDraft
            .filter((r) => r.label.trim() !== '')
            .map((r) => ({
              label: r.label.trim(),
              incentiveAmount: Number(r.incentiveAmount),
            }))
        : slabDraft
            .filter((r) => r.minCount !== '')
            .map((r) => ({
              minCount: Number(r.minCount),
              maxCount: r.openEnded ? null : Number(r.maxCount),
              incentiveAmount: Number(r.incentiveAmount),
            }))

    const payload: CreateRuleConfigPayload = {
      name: configName.trim(),
      description: configDescription.trim() || undefined,
      startDate: format(wizardPeriod.from, 'yyyy-MM-dd'),
      endDate: format(wizardPeriod.to, 'yyyy-MM-dd'),
      saleTypeIds: saleTypes,
      ruleType,
      rules,
    }

    if (ruleType === 'budget_threshold_slab') {
      payload.minBudgetThreshold = Number(minBudgetThreshold)
    }

    if (needsAllFinanceCategoryStep && allFinanceCategories.length > 0) {
      payload.allFinanceSaleTypeCategories = allFinanceCategories
    }

    if (editingConfigId != null) {
      updateMutation.mutate({ id: editingConfigId, payload })
      return
    }

    createMutation.mutate(payload)
  }

  const openRuleDetail = (id: string | number) => {
    setSelectedRuleId(id)
    setView('rule_detail')
  }

  const startCreatePeriod = () => {
    setPeriodLabelDraft('')
    setPeriodLabelError(null)
    setCreatePeriodRange(undefined)
    setView('create_period')
  }

  const finishCreatePeriodShell = (applied?: DateRange) => {
    if (!periodLabelDraft.trim()) {
      setPeriodLabelError('Period name is required')
      return
    }
    const range = applied ?? createPeriodRange
    if (!range?.from || !range?.to) {
      toast({ title: 'Error', description: 'Select a date range for this period.', variant: 'destructive' })
      return
    }
    const startDate = format(range.from, 'yyyy-MM-dd')
    const endDate = format(range.to, 'yyyy-MM-dd')
    writePeriodLabel(startDate, endDate, periodLabelDraft.trim())
    setPeriodCtx({ startDate, endDate })
    setPeriodLabelError(null)
    setView('period_detail')
  }

  const runArchivePeriod = async (g: { startDate: string; endDate: string; rules: RuleConfiguration[] }) => {
    try {
      for (const r of g.rules) {
        await deleteRuleConfiguration(r.id)
      }
      queryClient.invalidateQueries({ queryKey: ['rule-configurations'] })
      toast({ title: 'Archived', description: 'All rules in this period were archived.' })
      setArchivingPeriodKey(null)
      goToList()
    } catch (err) {
      toast({
        title: 'Error',
        description: getApiMessage(err, 'Failed to archive one or more rules.'),
        variant: 'destructive',
      })
      setArchivingPeriodKey(null)
    }
  }

  const runDuplicatePeriod = async () => {
    if (!dupPeriodSource || !dupPeriodRange?.from || !dupPeriodRange?.to) return
    const startDate = format(dupPeriodRange.from, 'yyyy-MM-dd')
    const endDate = format(dupPeriodRange.to, 'yyyy-MM-dd')
    setDupPeriodBusy(true)
    try {
      for (const c of dupPeriodSource.rules) {
        const payload = configToCreatePayload(c, {
          startDate,
          endDate,
          name: c.name,
        })
        await createRuleConfiguration(payload)
      }
      const trimmedName = dupPeriodLabelDraft.trim()
      const labelFromSource = readPeriodLabel(dupPeriodSource.startDate, dupPeriodSource.endDate)?.trim()
      if (trimmedName) {
        writePeriodLabel(startDate, endDate, trimmedName)
      } else if (labelFromSource) {
        writePeriodLabel(startDate, endDate, `${labelFromSource} (copy)`)
      }
      queryClient.invalidateQueries({ queryKey: ['rule-configurations'] })
      toast({ title: 'Duplicated', description: 'Rules were copied to the new date range.' })
      setDupPeriodOpen(false)
      setDupPeriodSource(null)
      setDupPeriodRange(undefined)
      setDupPeriodLabelDraft('')
      setPeriodCtx({ startDate, endDate })
      setView('period_detail')
    } catch (err) {
      toast({
        title: 'Error',
        description: getApiMessage(err, 'Failed to duplicate period'),
        variant: 'destructive',
      })
    } finally {
      setDupPeriodBusy(false)
    }
  }

  const isSlabLike = (rt: RuleConfigRuleType | null) => rt === 'slab' || rt === 'budget_threshold_slab'

  const saveDisabled =
    createMutation.isPending ||
    updateMutation.isPending ||
    !ruleType ||
    !wizardPeriod?.from ||
    !wizardPeriod?.to ||
    (ruleType === 'slab' || ruleType === 'budget_threshold_slab'
      ? slabDraft.length === 0 ||
        !slabDraft.every(
          (r) =>
            r.minCount !== '' &&
            r.incentiveAmount !== '' &&
            (r.openEnded || r.maxCount !== ''),
        ) ||
        validateRanges(slabDraft) !== null
      : !budgetDraft.some((r) => r.label.trim() !== '' && r.incentiveAmount !== '')) ||
    (needsAllFinanceCategoryStep && allFinanceCategories.length === 0)

  // ── LIST (periods) ─────────────────────────────────────────────────────────
  if (view === 'list') {
    return (
      <PageWrapper
        title="Incentive Rules"
        actions={
          <Button onClick={startCreatePeriod}>
            <Plus className="h-4 w-4 mr-1.5" /> Create Period
          </Button>
        }
      >
        <div className="p-4 pt-5">
          {configsLoading && (
            <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
              Loading periods…
            </div>
          )}

          {configsError && (
            <div className="flex items-center justify-center py-16 text-destructive text-sm">
              Failed to load incentive data. Please refresh.
            </div>
          )}

          {!configsLoading && !configsError && periodGroups.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-5">
              <div className="rounded-full bg-muted p-5">
                <Settings2 className="h-10 w-10 text-muted-foreground" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-lg font-semibold text-foreground">
                  No active incentive periods
                </h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Create a period with a name and date range, then add one or more rules inside it.
                </p>
              </div>
              <Button size="lg" onClick={startCreatePeriod}>
                <Plus className="h-4 w-4 mr-1.5" /> Create Period
              </Button>
            </div>
          )}

          {!configsLoading && !configsError && periodGroups.length > 0 && (
            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
              <div className="px-5 py-3.5 border-b border-border bg-primary flex items-center gap-2.5">
                <LayoutList className="h-4 w-4 text-primary-foreground shrink-0" />
                <h2 className="text-sm font-semibold text-primary-foreground">Incentive Periods</h2>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b border-border/60">
                      <TableHead className="w-10 font-semibold">#</TableHead>
                      <TableHead className="min-w-[180px] font-semibold">Period</TableHead>
                      <TableHead className="min-w-[200px] font-semibold">Date range</TableHead>
                      <TableHead className="w-24 font-semibold">Rules</TableHead>
                      <TableHead className="w-36" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {periodGroups.map((g, i) => (
                      <TableRow
                        key={g.key}
                        className="hover:bg-muted/30 border-b border-border/40 cursor-pointer [&_td]:align-middle"
                        onClick={() => openPeriodDetail({ startDate: g.startDate, endDate: g.endDate })}
                      >
                        <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-semibold text-foreground">
                          {periodDisplayLabel(g.startDate, g.endDate)}
                        </TableCell>
                        <TableCell className="text-foreground whitespace-nowrap text-sm">
                          {format(new Date(g.startDate), 'dd MMM yyyy')}
                          {' – '}
                          {format(new Date(g.endDate), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell className="text-foreground whitespace-nowrap text-sm">
                          {g.rules.length} rule{g.rules.length !== 1 ? 's' : ''}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-0.5">
                            <button
                              type="button"
                              className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                              title="Open"
                              onClick={(e) => {
                                e.stopPropagation()
                                openPeriodDetail({ startDate: g.startDate, endDate: g.endDate })
                              }}
                            >
                              <FolderOpen className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                              title="Rename period"
                              onClick={(e) => {
                                e.stopPropagation()
                                setRenameDraft(readPeriodLabel(g.startDate, g.endDate) ?? '')
                                setPeriodCtx({ startDate: g.startDate, endDate: g.endDate })
                                setRenameOpen(true)
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                              title="Duplicate period"
                              onClick={(e) => {
                                e.stopPropagation()
                                setDupPeriodSource({ startDate: g.startDate, endDate: g.endDate, rules: g.rules })
                                setDupPeriodRange(undefined)
                                const srcLbl = readPeriodLabel(g.startDate, g.endDate)?.trim()
                                setDupPeriodLabelDraft(
                                  srcLbl
                                    ? `${srcLbl} (copy)`
                                    : `${format(new Date(g.startDate), 'dd MMM yyyy')} – ${format(new Date(g.endDate), 'dd MMM yyyy')} (copy)`,
                                )
                                setDupPeriodOpen(true)
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                              title="Archive period"
                              onClick={(e) => {
                                e.stopPropagation()
                                setArchivingPeriodKey(g.key)
                              }}
                            >
                              <Archive className="h-4 w-4" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        <AlertDialog open={archivingPeriodKey !== null} onOpenChange={(open) => { if (!open) setArchivingPeriodKey(null) }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Archive entire period?</AlertDialogTitle>
              <AlertDialogDescription>
                This archives every rule that uses this date range. You can undo only by creating rules again.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  const g = periodGroups.find((x) => x.key === archivingPeriodKey)
                  if (g) void runArchivePeriod(g)
                }}
              >
                Archive all
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog
          open={dupPeriodOpen}
          onOpenChange={(open) => {
            setDupPeriodOpen(open)
            if (!open) {
              setDupPeriodSource(null)
              setDupPeriodRange(undefined)
              setDupPeriodLabelDraft('')
            }
          }}
        >
          <DialogContent
            className={cn(
              'max-h-[min(90dvh,56rem)] overflow-y-auto overflow-x-hidden overscroll-contain',
              'w-[calc(100vw-1rem)] max-w-md sm:max-w-2xl gap-3 p-4 sm:p-6',
              'top-4 translate-y-0 sm:top-[50%] sm:translate-y-[-50%]',
            )}
          >
            <DialogHeader>
              <DialogTitle>Duplicate period</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Choose the date range for the copied rules. Each rule in the period will be recreated with the same sale types and slabs or budgets.
            </p>
            <div className="space-y-1.5">
              <label htmlFor="dup-period-label" className="text-xs font-medium text-muted-foreground">
                Name for the new period
              </label>
              <Input
                id="dup-period-label"
                value={dupPeriodLabelDraft}
                onChange={(e) => setDupPeriodLabelDraft(e.target.value)}
                placeholder="e.g. JAN–APR 2026 (copy)"
                className="bg-background"
              />
              <p className="text-[11px] text-muted-foreground">
                Shown in the Incentive Periods list (same as Rename). If you clear this, the source period’s name plus “ (copy)” is used when that name exists.
              </p>
            </div>
            <div className="min-w-0 -mx-1 sm:mx-0">
              <PeriodSelector value={dupPeriodRange} onChange={setDupPeriodRange} />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDupPeriodOpen(false)
                  setDupPeriodSource(null)
                  setDupPeriodRange(undefined)
                  setDupPeriodLabelDraft('')
                }}
              >
                Cancel
              </Button>
              <Button type="button" disabled={dupPeriodBusy || !dupPeriodRange?.from || !dupPeriodRange?.to} onClick={() => void runDuplicatePeriod()}>
                {dupPeriodBusy ? 'Duplicating…' : 'Duplicate'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Period name</DialogTitle>
            </DialogHeader>
            <Input
              value={renameDraft}
              onChange={(e) => setRenameDraft(e.target.value)}
              placeholder="e.g. Q1 2026 – Core corridors"
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setRenameOpen(false)}>Cancel</Button>
              <Button
                onClick={() => {
                  if (periodCtx && renameDraft.trim()) {
                    writePeriodLabel(periodCtx.startDate, periodCtx.endDate, renameDraft.trim())
                    setRenameOpen(false)
                  }
                }}
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageWrapper>
    )
  }

  // ── CREATE PERIOD (name + dates only) ─────────────────────────────────────
  if (view === 'create_period') {
    return (
      <PageWrapper
        title="New Period"
        breadcrumbs={[{ label: 'Incentive Rules', onClick: goToList }]}
        actions={
          <Button variant="outline" size="sm" onClick={goToList}>
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
          </Button>
        }
      >
        <div className="w-full p-4 pt-5 md:p-6 md:pt-6 space-y-4">
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 border-b border-border bg-muted/20">
              <h2 className="text-sm font-semibold leading-tight">Period name</h2>
              <p className="text-xs text-muted-foreground">Shown in the periods list; rules inside keep their own names.</p>
            </div>
            <div className="p-4">
              <Input
                value={periodLabelDraft}
                onChange={(e) => {
                  setPeriodLabelDraft(e.target.value)
                  if (periodLabelError) setPeriodLabelError(null)
                }}
                placeholder="e.g. JAN–APR 2026"
                className={periodLabelError ? 'border-destructive' : ''}
              />
              {periodLabelError && (
                <p className="mt-1.5 text-xs text-destructive">{periodLabelError}</p>
              )}
            </div>
          </div>

          <div className="flex justify-center">
            <div
              className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium transition-colors ${
                createPeriodRange?.from && createPeriodRange?.to
                  ? 'border-green-200 bg-green-50 text-green-700 dark:bg-green-950/30 dark:border-green-800 dark:text-green-400'
                  : 'border-border bg-muted/30 text-muted-foreground'
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              {createPeriodRange?.from && createPeriodRange?.to
                ? `${format(createPeriodRange.from, 'MMM d')} – ${format(createPeriodRange.to, 'MMM d, yyyy')}`
                : 'No range selected'}
            </div>
          </div>

          <PeriodSelector
            value={createPeriodRange}
            onChange={setCreatePeriodRange}
            onNext={(applied) => finishCreatePeriodShell(applied)}
          />
        </div>
      </PageWrapper>
    )
  }

  // ── PERIOD DETAIL (rule list + add rule) ───────────────────────────────────
  if (view === 'period_detail' && periodCtx) {
    const title = periodDisplayLabel(periodCtx.startDate, periodCtx.endDate)
    return (
      <PageWrapper
        title={title}
        breadcrumbs={[
          { label: 'Incentive Rules', onClick: goToList },
          { label: title },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => { setRenameDraft(readPeriodLabel(periodCtx.startDate, periodCtx.endDate) ?? ''); setRenameOpen(true) }}>
              <Pencil className="h-4 w-4 mr-1" /> Rename
            </Button>
            <Button size="sm" onClick={openRuleWizardCreate}>
              <Plus className="h-4 w-4 mr-1" /> Add Rule
            </Button>
            <Button variant="outline" size="sm" onClick={goToList}>
              Back to list
            </Button>
          </div>
        }
      >
        <div className="p-4 pt-5 space-y-3">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Date range: </span>
            {format(new Date(periodCtx.startDate), 'dd MMM yyyy')}
            {' – '}
            {format(new Date(periodCtx.endDate), 'dd MMM yyyy')}
          </p>

          {rulesInCurrentPeriod.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 py-14 text-center space-y-3">
              <p className="text-sm text-muted-foreground">No rules in this period yet.</p>
              <Button onClick={openRuleWizardCreate}>
                <Plus className="h-4 w-4 mr-1" /> Add first rule
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
              <div className="px-5 py-3 border-b border-border bg-primary flex items-center gap-2">
                <LayoutList className="h-4 w-4 text-primary-foreground shrink-0" />
                <h2 className="text-sm font-semibold text-primary-foreground">Rules in this period</h2>
              </div>
              <div className="px-4 py-3 border-b border-border bg-background/50">
                <div className="relative max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    value={ruleSearch}
                    onChange={(e) => setRuleSearch(e.target.value)}
                    placeholder="Search rules…"
                    className="w-full pl-9 pr-8 py-1.5 text-sm rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  {ruleSearch && (
                    <button
                      type="button"
                      onClick={() => setRuleSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b border-border/60">
                      <TableHead className="w-10 font-semibold">#</TableHead>
                      <TableHead className="min-w-[160px] font-semibold">Rule name</TableHead>
                      <TableHead className="min-w-[100px] font-semibold">Type</TableHead>
                      <TableHead className="font-semibold">Sale type/Product type</TableHead>
                      <TableHead className="w-24 font-semibold">Rows</TableHead>
                      <TableHead className="w-36" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRules.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                          No rules match &ldquo;{ruleSearch}&rdquo;
                        </TableCell>
                      </TableRow>
                    )}
                    {filteredRules.map((config, i) => (
                      <TableRow
                        key={config.id}
                        className="hover:bg-muted/30 border-b border-border/40 cursor-pointer [&_td]:align-middle"
                        onClick={() => openRuleDetail(config.id)}
                      >
                        <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-semibold text-foreground">{config.name || '—'}</TableCell>
                        <TableCell className="text-sm text-foreground whitespace-nowrap">
                          {ruleTypeLabel(config.ruleType)}
                        </TableCell>
                        <TableCell className="text-foreground max-w-md">
                          <div className="line-clamp-2 text-sm">
                            {[
                              ...getSaleTypeNames(config.saleTypeIds, config.saleTypeNames),
                              ...(config.otherProducts ?? []).map((p) => p.name),
                            ].join(', ') || '—'}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-foreground whitespace-nowrap">
                          {config.rules?.length ?? 0}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-0.5">
                            <button
                              type="button"
                              className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                              title="Edit"
                              onClick={(e) => {
                                e.stopPropagation()
                                openRuleWizardForConfig(config, 'edit')
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                              title="Copy to another period"
                              onClick={(e) => {
                                e.stopPropagation()
                                openCopyRuleToPeriodDialog(config)
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                              title="Archive"
                              onClick={(e) => {
                                e.stopPropagation()
                                setDeletingId(config.id)
                              }}
                            >
                              <Archive className="h-4 w-4" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        <AlertDialog open={deletingId !== null} onOpenChange={(open) => { if (!open) setDeletingId(null) }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Archive rule?</AlertDialogTitle>
              <AlertDialogDescription>
                This rule will be archived and will no longer apply.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (deletingId !== null) {
                    deleteMutation.mutate(deletingId, {
                      onSuccess: () => {
                        setDeletingId(null)
                        queryClient.invalidateQueries({ queryKey: ['rule-configurations'] })
                      },
                    })
                  }
                }}
              >
                Archive
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Period name</DialogTitle>
            </DialogHeader>
            <Input value={renameDraft} onChange={(e) => setRenameDraft(e.target.value)} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setRenameOpen(false)}>Cancel</Button>
              <Button
                onClick={() => {
                  if (periodCtx && renameDraft.trim()) {
                    writePeriodLabel(periodCtx.startDate, periodCtx.endDate, renameDraft.trim())
                    setRenameOpen(false)
                  }
                }}
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={copyToPeriodOpen}
          onOpenChange={(o) => {
            if (!o) {
              setCopyToPeriodOpen(false)
              setCopyToPeriodConfig(null)
              setCopyToPeriodTargetKey('')
            }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Copy rule to another period</DialogTitle>
              <DialogDescription>
                {copyToPeriodConfig
                  ? (
                      <>
                        Creates a new rule with the same sale types and configuration in the target period’s dates.
                        {' '}
                        <span className="font-medium text-foreground">{copyToPeriodConfig.name}</span>
                      </>
                    )
                  : null}
              </DialogDescription>
            </DialogHeader>
            {copyToPeriodConfig ? (
              <div className="space-y-2 py-1">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Target period</p>
                <Select
                  value={copyToPeriodTargetKey || '__pick__'}
                  onValueChange={(v) => {
                    if (v !== '__pick__') setCopyToPeriodTargetKey(v)
                  }}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select a period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__pick__" disabled>Select a period…</SelectItem>
                    {periodGroups
                      .filter(
                        (g) =>
                          !(
                            g.startDate === copyToPeriodConfig.startDate
                            && g.endDate === copyToPeriodConfig.endDate
                          ),
                      )
                      .map((g) => (
                        <SelectItem key={g.key} value={g.key}>
                          {periodDisplayLabel(g.startDate, g.endDate)}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => {
                  setCopyToPeriodOpen(false)
                  setCopyToPeriodConfig(null)
                  setCopyToPeriodTargetKey('')
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => void runCopyRuleToPeriod()}
                disabled={
                  !copyToPeriodTargetKey
                  || copyToPeriodTargetKey === '__pick__'
                  || copyToPeriodBusy
                }
              >
                {copyToPeriodBusy ? 'Copying…' : 'Copy rule'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageWrapper>
    )
  }

  // ── RULE DETAIL ────────────────────────────────────────────────────────────
  if (view === 'rule_detail' && periodCtx && selectedRuleId != null) {
    const backToPeriod = () => {
      setView('period_detail')
      setSelectedRuleId(null)
    }

    return (
      <PageWrapper
        title={selectedConfig?.name || 'Rule'}
        breadcrumbs={[
          { label: 'Incentive Rules', onClick: goToList },
          {
            label: periodDisplayLabel(periodCtx.startDate, periodCtx.endDate),
            onClick: () => {
              setView('period_detail')
              setSelectedRuleId(null)
            },
          },
          { label: selectedConfig?.name || 'Rule' },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => selectedConfig && openRuleWizardForConfig(selectedConfig, 'edit')}
              disabled={!selectedConfig}
            >
              Edit
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => selectedConfig && openCopyRuleToPeriodDialog(selectedConfig)}
              disabled={!selectedConfig}
            >
              Copy to period
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => { if (selectedConfig) setDeletingId(selectedConfig.id) }}
              disabled={!selectedConfig || deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Archiving…' : 'Archive'}
            </Button>
            <Button variant="outline" size="sm" onClick={backToPeriod}>
              Back to period
            </Button>
          </div>
        }
      >
        <div className="p-4 pt-5 space-y-4">
          {detailLoading && (
            <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
              Loading rule…
            </div>
          )}

          {!detailLoading && selectedConfig && (
            <>
              <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
                <div className="px-5 py-3 border-b border-primary/30 bg-primary">
                  <h2 className="text-sm font-semibold text-primary-foreground">Rule summary</h2>
                </div>
                <div className="p-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">Name</p>
                    <p className="text-sm font-semibold text-foreground">{selectedConfig.name || '—'}</p>
                  </div>
                  {selectedConfig.description ? (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 xl:col-span-2">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">Description</p>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{selectedConfig.description}</p>
                    </div>
                  ) : null}
                  <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 xl:col-span-2">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-2">Sale type/Product type</p>
                    <div className="flex flex-wrap gap-1.5">
                      {getSaleTypeNames(selectedConfig.saleTypeIds, selectedConfig.saleTypeNames).map((name) => (
                        <span key={name} className="text-xs bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-md font-medium">
                          {name}
                        </span>
                      ))}
                      {(selectedConfig.otherProducts ?? []).map((p) => (
                        <span key={p.id} className="text-xs bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-md font-medium">
                          {p.name}
                        </span>
                      ))}
                      {getSaleTypeNames(selectedConfig.saleTypeIds, selectedConfig.saleTypeNames).length === 0 &&
                        (selectedConfig.otherProducts ?? []).length === 0 && (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </div>
                  </div>
                  <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">Period</p>
                    <p className="text-sm font-medium text-foreground">
                      {format(new Date(selectedConfig.startDate), 'dd MMM yyyy')}
                      {' – '}
                      {format(new Date(selectedConfig.endDate), 'dd MMM yyyy')}
                    </p>
                  </div>
                  <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">Rule type</p>
                    <p className="text-sm font-medium text-foreground">{ruleTypeLabel(selectedConfig.ruleType)}</p>
                  </div>
                  {selectedConfig.ruleType === 'budget_threshold_slab' && selectedConfig.minBudgetThreshold != null ? (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">Min. budget threshold</p>
                      <p className="text-sm font-semibold text-foreground">
                        {selectedConfig.minBudgetThreshold.toLocaleString()} INR
                      </p>
                    </div>
                  ) : null}
                  {selectedConfig.allFinanceSaleTypeCategories &&
                    selectedConfig.allFinanceSaleTypeCategories.length > 0 ? (
                    <div className="rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50/60 dark:bg-violet-950/30 px-3 py-2.5 xl:col-span-2">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-2">
                        All Finance applies to
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedConfig.allFinanceSaleTypeCategories.map((c) => (
                          <span
                            key={c}
                            className="text-xs font-semibold bg-violet-100 text-violet-800 border border-violet-200 dark:bg-violet-900/50 dark:text-violet-200 dark:border-violet-800 px-2.5 py-0.5 rounded-md"
                          >
                            {formatAllFinanceCategoryLabel(c)}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">Incentive rows</p>
                    <p className="text-sm font-semibold text-foreground">{selectedConfig.rules?.length ?? 0}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
                <div className="px-5 py-3 border-b border-primary/30 bg-primary">
                  <h2 className="text-sm font-semibold text-primary-foreground">Incentive rows</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-primary/15 border-b border-primary/20">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-primary">#</th>
                        {isSlabLike(selectedConfig.ruleType) ? (
                          <>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-primary">Min slab</th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-primary">Max slab</th>
                          </>
                        ) : (
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-primary">Budget label</th>
                        )}
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-primary">Incentive (INR)</th>
                        {selectedConfig.ruleType === 'budget' && (
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-primary">Percentage</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedConfig.rules?.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground text-sm">
                            No rows defined.
                          </td>
                        </tr>
                      )}
                      {selectedConfig.rules?.map((rule, i) => (
                        <tr key={rule.id} className="border-b border-border/60 hover:bg-muted/20">
                          <td className="px-4 py-3 text-xs text-muted-foreground">{i + 1}</td>
                          {isSlabLike(selectedConfig.ruleType) ? (
                            <>
                              <td className="px-4 py-3 font-medium text-foreground">{rule.minCount ?? '—'}</td>
                              <td className="px-4 py-3 font-medium text-foreground">
                                {rule.maxCount === null || rule.maxCount === -1
                                  ? '& above'
                                  : (rule.maxCount ?? '—')}
                              </td>
                            </>
                          ) : (
                            <td className="px-4 py-3 font-medium text-foreground">{rule.label ?? '—'}</td>
                          )}
                          <td className="px-4 py-3 font-semibold text-foreground">
                            {rule.incentiveAmount?.toLocaleString()}
                          </td>
                          {selectedConfig.ruleType === 'budget' && (
                            <td className="px-4 py-3 text-foreground">
                              {(() => {
                                const percentage = getRulePercentage(selectedConfig, rule)
                                return percentage !== null ? `${percentage.toFixed(2)}%` : '—'
                              })()}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        <AlertDialog open={deletingId !== null} onOpenChange={(open) => { if (!open) setDeletingId(null) }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Archive rule?</AlertDialogTitle>
              <AlertDialogDescription>
                This rule will be archived and will no longer apply.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (deletingId !== null) {
                    deleteMutation.mutate(deletingId, {
                      onSuccess: () => {
                        setDeletingId(null)
                        backToPeriod()
                        queryClient.invalidateQueries({ queryKey: ['rule-configurations'] })
                      },
                    })
                  }
                }}
              >
                Archive
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog
          open={copyToPeriodOpen}
          onOpenChange={(o) => {
            if (!o) {
              setCopyToPeriodOpen(false)
              setCopyToPeriodConfig(null)
              setCopyToPeriodTargetKey('')
            }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Copy rule to another period</DialogTitle>
              <DialogDescription>
                {copyToPeriodConfig
                  ? (
                      <>
                        Creates a new rule with the same sale types and configuration in the target period’s dates.
                        {' '}
                        <span className="font-medium text-foreground">{copyToPeriodConfig.name}</span>
                      </>
                    )
                  : null}
              </DialogDescription>
            </DialogHeader>
            {copyToPeriodConfig ? (
              <div className="space-y-2 py-1">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Target period</p>
                <Select
                  value={copyToPeriodTargetKey || '__pick__'}
                  onValueChange={(v) => {
                    if (v !== '__pick__') setCopyToPeriodTargetKey(v)
                  }}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select a period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__pick__" disabled>Select a period…</SelectItem>
                    {periodGroups
                      .filter(
                        (g) =>
                          !(
                            g.startDate === copyToPeriodConfig.startDate
                            && g.endDate === copyToPeriodConfig.endDate
                          ),
                      )
                      .map((g) => (
                        <SelectItem key={g.key} value={g.key}>
                          {periodDisplayLabel(g.startDate, g.endDate)}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => {
                  setCopyToPeriodOpen(false)
                  setCopyToPeriodConfig(null)
                  setCopyToPeriodTargetKey('')
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => void runCopyRuleToPeriod()}
                disabled={
                  !copyToPeriodTargetKey
                  || copyToPeriodTargetKey === '__pick__'
                  || copyToPeriodBusy
                }
              >
                {copyToPeriodBusy ? 'Copying…' : 'Copy rule'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageWrapper>
    )
  }

  // ── RULE WIZARD (inside period) ────────────────────────────────────────────
  if (view === 'rule_wizard' && wizardPeriod?.from && wizardPeriod?.to) {
    return (
      <PageWrapper
        title={editingConfigId != null ? 'Edit rule' : 'New rule'}
        breadcrumbs={periodCtx ? [
          { label: 'Incentive Rules', onClick: goToList },
          {
            label: periodDisplayLabel(periodCtx.startDate, periodCtx.endDate),
            onClick: () => {
              resetWizardFields()
              setView('period_detail')
            },
          },
          { label: editingConfigId != null ? 'Edit rule' : 'New rule' },
        ] : [
          { label: 'Incentive Rules', onClick: goToList },
          { label: editingConfigId != null ? 'Edit rule' : 'New rule' },
        ]}
        actions={
          <Button variant="outline" size="sm" onClick={() => { resetWizardFields(); setView(periodCtx ? 'period_detail' : 'list') }}>
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Cancel
          </Button>
        }
      >
        <div className="w-full p-4 pt-5 md:p-6 md:pt-6 lg:px-8">
          <StepperHeader currentStep={wizardStep} onStepClick={setWizardStep} steps={RULE_WIZARD_STEPS} />

          {wizardStep === 1 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
                <div className="px-5 py-3.5 border-b border-border bg-muted/20">
                  <h2 className="text-sm font-semibold leading-tight">Rule name and description</h2>
                  <p className="text-xs text-muted-foreground">This rule sits inside the selected period.</p>
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Rule name</label>
                    <Input
                      className="mt-1"
                      value={configName}
                      onChange={(e) => {
                        setConfigName(e.target.value)
                        if (configNameError) setConfigNameError(null)
                      }}
                      placeholder="e.g. UK Student – Slab"
                    />
                    {configNameError && <p className="mt-1 text-xs text-destructive">{configNameError}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Description (optional)</label>
                    <textarea
                      className="mt-1 w-full min-h-[88px] px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
                      value={configDescription}
                      onChange={(e) => setConfigDescription(e.target.value)}
                      placeholder="Notes for admins or future reviewers…"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-center">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium border-green-200 bg-green-50 text-green-700 dark:bg-green-950/30 dark:border-green-800 dark:text-green-400">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {format(wizardPeriod.from, 'MMM d')} – {format(wizardPeriod.to, 'MMM d, yyyy')}
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  size="lg"
                  className="gap-2"
                  onClick={() => {
                    if (!configName.trim()) {
                      setConfigNameError('Rule name is required')
                      return
                    }
                    setConfigNameError(null)
                    setWizardStep(2)
                  }}
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {wizardStep === 2 && (
            <div className="space-y-5">
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium border-green-200 bg-green-50 text-green-700 dark:bg-green-950/30 dark:border-green-800 dark:text-green-400">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {format(wizardPeriod.from, 'MMM d')} – {format(wizardPeriod.to, 'MMM d, yyyy')}
                </div>
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium ${
                    saleTypes.length > 0
                      ? 'border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-400'
                      : 'border-border bg-muted/30 text-muted-foreground'
                  }`}
                >
                  <Tag className="h-3.5 w-3.5" />
                  {saleTypes.length > 0
                    ? `${saleTypes.length} selected`
                    : 'None selected'}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
                <div className="px-5 py-3.5 border-b border-border bg-muted/20 flex items-center gap-2.5">
                  <Tag className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <h2 className="text-sm font-semibold leading-tight">Sale type/Product type</h2>
                    <p className="text-xs text-muted-foreground">Products this rule applies to</p>
                  </div>
                </div>
                <div className="p-4">
                  <SaleTypeSelector data={saleTypesData} selected={saleTypes} onChange={setSaleTypes} />
                </div>
              </div>

              {needsAllFinanceCategoryStep && (
                <AllFinanceTargetCategories value={allFinanceCategories} onChange={setAllFinanceCategories} />
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setWizardStep(1)}>Back</Button>
                <Button
                  size="lg"
                  disabled={
                    saleTypes.length === 0 ||
                    (needsAllFinanceCategoryStep && allFinanceCategories.length === 0)
                  }
                  className="gap-2"
                  onClick={() => setWizardStep(3)}
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {wizardStep === 3 && (
            <RuleTypeSelector
              value={ruleType}
              onChange={setRuleType}
              onNext={() => setWizardStep(4)}
              onBack={() => setWizardStep(2)}
            />
          )}

          {wizardStep === 4 && ruleType && (
            <div className="space-y-6">
              <RuleSummaryBar
                period={wizardPeriod}
                saleTypes={saleTypes}
                saleTypesData={saleTypesData}
                ruleType={ruleType}
                name={configName}
                allFinanceSaleTypeCategories={
                  needsAllFinanceCategoryStep && allFinanceCategories.length > 0
                    ? allFinanceCategories
                    : undefined
                }
              />

              {ruleType === 'budget_threshold_slab' && (
                <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                  <label className="text-sm font-semibold text-foreground">Minimum budget threshold (INR)</label>
                  <p className="text-xs text-muted-foreground">Counsellor totals must meet this before slab incentives apply.</p>
                  <Input
                    type="number"
                    min={0}
                    className="max-w-xs"
                    value={minBudgetThreshold}
                    onChange={(e) => setMinBudgetThreshold(e.target.value)}
                    placeholder="e.g. 50000"
                  />
                </div>
              )}

              {isSlabLike(ruleType) && (
                <SalaryRangeSection title="Slab rules" draft={slabDraft} onChange={setSlabDraft} />
              )}

              {ruleType === 'budget' && (
                <CategorySection title="Budget rules" draft={budgetDraft} onChange={setBudgetDraft} />
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setWizardStep(3)}>Back</Button>
                <Button
                  onClick={handleSubmitRule}
                  disabled={
                    saveDisabled ||
                    (ruleType === 'budget_threshold_slab' &&
                      (!minBudgetThreshold || !Number.isFinite(Number(minBudgetThreshold)) || Number(minBudgetThreshold) <= 0))
                  }
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Saving…'
                    : editingConfigId != null ? 'Update rule' : 'Save rule'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </PageWrapper>
    )
  }

  if (view === 'period_detail' && !periodCtx) {
    goToList()
    return null
  }

  if (view === 'rule_detail' && (!periodCtx || selectedRuleId == null)) {
    goToList()
    return null
  }

  if (view === 'rule_wizard') {
    goToList()
    return null
  }

  return null
}
