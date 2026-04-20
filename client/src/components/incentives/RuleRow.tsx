import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

export interface RuleField {
  key: string
  label: string
  placeholder?: string
}

interface RuleRowProps {
  index: number
  fields: RuleField[]
  values: Record<string, string>
  onChange: (key: string, value: string) => void
  onDelete: () => void
}

export function RuleRow({ index, fields, values, onChange, onDelete }: RuleRowProps) {
  return (
    <tr className="border-b border-border/60">
      <td className="px-4 py-2 text-xs text-muted-foreground">{index + 1}</td>
      {fields.map((field) => (
        <td key={field.key} className="px-4 py-2">
          <Input
            type="number"
            min={0}
            value={values[field.key] ?? ''}
            onChange={(e) => onChange(field.key, e.target.value)}
            placeholder={field.placeholder ?? field.label}
            className="w-28"
          />
        </td>
      ))}
      <td className="px-4 py-2 text-center">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </td>
    </tr>
  )
}
