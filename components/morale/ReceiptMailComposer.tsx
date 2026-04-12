'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Upload, Loader2, X, Plus, Minus, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { MoraleEmployee } from '@/lib/google-sheets';

const USE_TYPES = [
  { value: 'cafe', label: '카페 / 아침' },
  { value: 'lunch', label: '점심식사 추가금' },
  { value: 'dinner', label: '저녁식사' },
  { value: 'culture', label: '문화데이' },
];

function getUseTypeLabel(val: string) {
  return USE_TYPES.find((t) => t.value === val)?.label ?? '';
}

interface Participant {
  name: string;
  position: string;
  amount: number;
  menuItem?: string;
}

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${days[d.getDay()]}요일`;
}

function buildEmailBody({
  useType,
  place,
  date,
  totalAmount,
  participants,
}: {
  useType: string;
  place: string;
  date: string;
  totalAmount: number;
  participants: Participant[];
}) {
  const typeLabel = getUseTypeLabel(useType);
  const formattedDate = formatDate(date);
  const participantLines = participants
    .map((p, i) => `(${i + 1}) ${p.name} ${p.position}: ${p.amount.toLocaleString()}원`)
    .join('\n');

  return `안녕하세요 박성배 수석님
양다윗 선임입니다.
${typeLabel} 이용으로 사기진작비 사용하여 메일 드립니다.
날짜 : ${formattedDate}

1. 사용처: ${place}
2. 총 결제액: ${totalAmount.toLocaleString()}원${participants.length > 1 ? ` (총 ${participants.length}명)` : ''}
3. 사기진작비 차감 신청:

${participantLines}`;
}

function NameCombobox({
  value,
  onChange,
  employees,
}: {
  value: string;
  onChange: (name: string) => void;
  employees: MoraleEmployee[];
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastCommitted = useRef(value);

  // 외부에서 value가 바뀔 때(영수증 분석 후 자동 세팅)만 search 동기화
  useEffect(() => {
    if (value !== lastCommitted.current) {
      setSearch(value);
      lastCommitted.current = value;
    }
  }, [value]);

  const filtered = employees
    .map((e) => e.이름)
    .filter((n) => n && n.includes(search));

  function commit(name: string) {
    lastCommitted.current = name;
    setSearch(name);
    setOpen(false);
    onChange(name);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.nativeEvent.isComposing) return; // 한글 IME 조합 중엔 무시
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      commit(open && filtered[activeIdx] ? filtered[activeIdx] : search);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          placeholder="이름"
          value={search}
          onFocus={() => { setActiveIdx(0); }}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
            setActiveIdx(0);
          }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={handleKeyDown}
        />
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
      </div>
      {open && filtered.length > 0 && (
        <div className="fixed z-[9999] mt-1 w-40 rounded-md border bg-popover shadow-lg"
          style={{
            top: inputRef.current
              ? inputRef.current.getBoundingClientRect().bottom + window.scrollY + 4
              : 0,
            left: inputRef.current
              ? inputRef.current.getBoundingClientRect().left + window.scrollX
              : 0,
          }}
        >
          {filtered.map((name, idx) => (
            <button
              key={name}
              type="button"
              className={`w-full px-3 py-1.5 text-left text-sm hover:bg-accent ${idx === activeIdx ? 'bg-accent' : ''}`}
              onMouseDown={() => commit(name)}
              onMouseEnter={() => setActiveIdx(idx)}
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ReceiptMailComposer({ employees = [] }: { employees?: MoraleEmployee[] }) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const [useType, setUseType] = useState('cafe');
  const [place, setPlace] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [participants, setParticipants] = useState<Participant[]>([
    { name: '양다윗', position: '선임', amount: 0 },
  ]);

  const subject = (() => {
    if (!date) return '[사기진작비] 사용의 건 (영수증 첨부)';
    const d = new Date(date);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const suffix =
      useType === 'lunch'
        ? ' - 점심식사 추가금'
        : useType === 'dinner'
          ? ' - 저녁식사'
          : useType === 'culture'
            ? ' - 문화데이'
            : '';
    return `[사기진작비] ${dateStr} 사용의 건 (영수증 첨부${suffix})`;
  })();

  const emailBody = buildEmailBody({ useType, place, date, totalAmount, participants });

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFile(file);
    setReceiptPreview(URL.createObjectURL(file));
    await analyze(file);
  }

  async function analyze(receipt: File) {
    setAnalyzing(true);
    try {
      const form = new FormData();
      form.append('receipt', receipt);
      const res = await fetch('/api/morale/receipt', { method: 'POST', body: form });
      const data = await res.json();
      if (data.receiptUrl) setReceiptUrl(data.receiptUrl)
      if (data.place) setPlace(data.place)
      if (data.date) setDate(data.date)
      if (data.totalAmount) setTotalAmount(data.totalAmount)
      if (data.items && data.items.length > 0) {
        const expanded: Participant[] = []
        for (const it of data.items as { item: string; quantity: number; unitPrice: number }[]) {
          for (let q = 0; q < (it.quantity ?? 1); q++) {
            expanded.push({
              name: expanded.length === 0 ? '양다윗' : '',
              position: expanded.length === 0 ? '선임' : '',
              amount: Math.round((it.unitPrice ?? 0) / 10) * 10,
              menuItem: it.item ?? '',
            })
          }
        }
        setParticipants(expanded)
      }
    } catch {
      alert('영수증 분석 실패');
    } finally {
      setAnalyzing(false);
    }
  }

  function updateParticipant(idx: number, field: keyof Participant, value: string | number) {
    setParticipants((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  }

  function removeParticipant(idx: number) {
    setParticipants((prev) => prev.filter((_, i) => i !== idx));
  }

  function addParticipant() {
    setParticipants((prev) => [...prev, { name: '', position: '책임', amount: 0 }]);
  }

  const totalDeduction = participants.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="lg:grid lg:grid-cols-[3fr_2fr] lg:gap-6 lg:items-start">
    <div className="space-y-5">
      {/* 영수증 업로드 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">영수증 사진</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="w-full h-36 rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors overflow-hidden bg-muted/20 relative"
            onClick={() => !receiptPreview && fileInputRef.current?.click()}
          >
            {receiptPreview ? (
              <>
                <Image src={receiptPreview} alt="영수증" fill className="object-contain p-2" />
                <button
                  type="button"
                  className="absolute top-1.5 right-1.5 z-10 rounded-full bg-black/60 p-1 text-white hover:bg-black/80 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation()
                    setReceiptPreview(null)
                    setReceiptUrl(null)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <>
                <Upload className="h-6 w-6 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">사진을 클릭해서 업로드</p>
              </>
            )}
          </div>
          {analyzing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              AI가 금액을 인식 중...
            </div>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </CardContent>
      </Card>

      {/* 사용 정보 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">사용 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">사용 유형</Label>
              <Select
                value={useType}
                onValueChange={(v) => {
                  if (v) setUseType(v);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {USE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">날짜</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">사용처 (장소명)</Label>
              <Input
                placeholder="예: 수변비틀골목 데마에릭스프레스"
                value={place}
                onChange={(e) => setPlace(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">총 결제액</Label>
              <Input
                type="number"
                placeholder="0"
                value={totalAmount || ''}
                onChange={(e) => setTotalAmount(Number(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 차감 신청 인원 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">사기진작비 차감 신청</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {participants.map((p, i) => (
            <div key={i} className="space-y-1">
              {p.menuItem && (
                <p className="text-xs text-muted-foreground pl-1">{i + 1}번 · {p.menuItem}</p>
              )}
              <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-center">
                <NameCombobox
                  value={p.name}
                  employees={employees}
                  onChange={(name) => updateParticipant(i, 'name', name)}
                />
                <Input
                  placeholder="직책 (예: 선임)"
                  value={p.position}
                  onChange={(e) => updateParticipant(i, 'position', e.target.value)}
                />
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-9 w-9 shrink-0"
                    onClick={() => updateParticipant(i, 'amount', Math.max(0, p.amount - 100))}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <Input
                    type="number"
                    placeholder="금액"
                    className="w-24 text-center"
                    value={p.amount || ''}
                    onChange={(e) => updateParticipant(i, 'amount', Number(e.target.value))}
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-9 w-9 shrink-0"
                    onClick={() => updateParticipant(i, 'amount', p.amount + 100)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 text-muted-foreground"
                  onClick={() => removeParticipant(i)}
                  disabled={participants.length === 1}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          <Button size="sm" variant="outline" className="w-full gap-1" onClick={addParticipant}>
            <Plus className="h-3.5 w-3.5" />
            인원 추가
          </Button>

          {totalDeduction > 0 && (
            <p className="text-xs text-muted-foreground text-right pt-1">
              차감 합계:{' '}
              <span className="font-semibold text-foreground">
                {totalDeduction.toLocaleString()}원
              </span>
              {totalAmount > 0 && totalAmount !== totalDeduction && (
                <span className="text-orange-500 ml-2">
                  (결제액과 {Math.abs(totalAmount - totalDeduction).toLocaleString()}원 차이)
                </span>
              )}
            </p>
          )}
        </CardContent>
      </Card>

    </div>

    {/* 메일 미리보기 — PC: 오른쪽 고정, 모바일: 아래 */}
    <div className="mt-5 lg:mt-0 lg:sticky lg:top-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">메일 미리보기</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg bg-muted/40 px-4 py-3 text-sm space-y-1.5">
            <div className="flex gap-2">
              <span className="text-muted-foreground w-12 shrink-0">제목</span>
              <span className="font-medium">{subject}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-muted-foreground w-12 shrink-0">받는 이</span>
              <span>박성배 수석님 (sbpark@commerceon.co.kr)</span>
            </div>
            {participants.length > 1 && (
              <div className="flex gap-2">
                <span className="text-muted-foreground w-12 shrink-0">참조</span>
                <span>{participants.map((p) => p.name).filter(Boolean).join(', ')}</span>
              </div>
            )}
            {receiptPreview && (
              <div className="flex gap-2">
                <span className="text-muted-foreground w-12 shrink-0">첨부</span>
                <span>영수증 사진 1장</span>
              </div>
            )}
          </div>
          <pre className="whitespace-pre-wrap text-sm leading-relaxed rounded-lg border bg-white px-4 py-4 font-sans">
            {emailBody}
          </pre>
          {receiptPreview && (
            <div className="relative w-32 h-32 rounded-lg overflow-hidden border">
              <Image src={receiptPreview} alt="영수증" fill className="object-cover" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </div>
  );
}
