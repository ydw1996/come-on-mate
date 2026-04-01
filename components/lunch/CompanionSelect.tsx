'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import type { Profile } from '@/types'

interface Props {
  value: string[]
  onChange: (ids: string[]) => void
}

export function CompanionSelect({ value, onChange }: Props) {
  const [teammates, setTeammates] = useState<Pick<Profile, 'id' | 'name' | 'team'>[]>([])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('profiles')
        .select('id, name, team')
        .neq('id', user.id)
        .order('name')
        .then(({ data }) => {
          if (data) setTeammates(data)
        })
    })
  }, [])

  function toggle(id: string) {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id))
    } else {
      onChange([...value, id])
    }
  }

  if (teammates.length === 0) {
    return <p className="text-sm text-muted-foreground">팀원 정보를 불러오는 중...</p>
  }

  return (
    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
      {teammates.map((t) => (
        <div key={t.id} className="flex items-center gap-2">
          <Checkbox
            id={`companion-${t.id}`}
            checked={value.includes(t.id)}
            onCheckedChange={() => toggle(t.id)}
          />
          <Label htmlFor={`companion-${t.id}`} className="cursor-pointer font-normal">
            {t.name}
            {t.team && (
              <span className="ml-1.5 text-xs text-muted-foreground">({t.team})</span>
            )}
          </Label>
        </div>
      ))}
    </div>
  )
}
