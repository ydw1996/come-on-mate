'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { CompanionSelect } from './CompanionSelect'
import { useLunchPick } from '@/hooks/use-lunch-pick'
import type { LunchPlaceWithLastPick } from '@/types'

const schema = z.object({
  companions: z.array(z.string()),
})
type FormData = z.infer<typeof schema>

interface Props {
  place: LunchPlaceWithLastPick | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PickRecordDialog({ place, open, onOpenChange }: Props) {
  const { savePick, isSaving } = useLunchPick()
  const [companions, setCompanions] = useState<string[]>([])

  const { handleSubmit } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { companions: [] },
  })

  function onSubmit() {
    if (!place) return
    savePick(
      { placeId: place.id, companions },
      {
        onSuccess: () => {
          onOpenChange(false)
          setCompanions([])
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>점심 기록</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label className="text-sm text-muted-foreground">선택된 식당</Label>
            <p className="mt-1 font-semibold text-base">{place?.name}</p>
            {place?.category && (
              <p className="text-xs text-muted-foreground">{place.category}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>
              동행자{' '}
              {companions.length > 0 && (
                <span className="text-muted-foreground font-normal">
                  ({companions.length}명 선택)
                </span>
              )}
            </Label>
            <CompanionSelect value={companions} onChange={setCompanions} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? '저장 중...' : '기록하기'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
