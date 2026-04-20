'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Upload, Loader2, X, Plus, ChevronDown, Send } from 'lucide-react';
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

const POSITION_RANK: Record<string, number> = {
  이사: 1,
  수석: 2,
  책임: 3,
  선임: 4,
  프로: 5,
};

const USE_TYPES = [
  { value: 'cafe', label: '카페' },
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

type SendStatus =
  | { state: 'idle'; message: string }
  | { state: 'sending'; message: string; progress: number }
  | { state: 'success'; message: string }
  | { state: 'error'; message: string };

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
  const totalDeduction = participants.reduce((s, p) => s + p.amount, 0);
  const participantLines = participants
    .map((p, i) => `(${i + 1}) ${p.name} ${p.position}: ${p.amount.toLocaleString()}원`)
    .join('\n');

  return `안녕하세요 박성배 수석님
양다윗 선임입니다.
${typeLabel} 이용으로 사기진작비 사용하여 메일 드립니다.
날짜 : ${formattedDate}

1. 사용처: ${place}
2. 총 결제액: ${totalAmount.toLocaleString()}원${participants.length > 1 ? ` (총 ${participants.length}명)` : ''}
3. 사기진작비 차감 신청: ${totalDeduction > 0 ? `${totalDeduction.toLocaleString()}원` : ''}

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
  const [prevValue, setPrevValue] = useState(value);
  const [activeIdx, setActiveIdx] = useState(0);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  // 외부에서 value가 바뀔 때(영수증 분석 후 자동 세팅)만 search 동기화
  if (value !== prevValue) {
    setPrevValue(value);
    setSearch(value);
  }

  const filtered = employees.map((e) => e.이름).filter((n) => n && n.includes(search));

  function openDropdown() {
    const rect = inputRef.current?.getBoundingClientRect();
    if (rect) setDropdownPos({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX });
    setOpen(true);
  }

  function commit(name: string) {
    setSearch(name);
    setPrevValue(name);
    setOpen(false);
    onChange(name);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.nativeEvent.isComposing) return; // 한글 IME 조합 중엔 무시
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      openDropdown();
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' || (e.key === 'Tab' && open && filtered.length > 0)) {
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
          onFocus={() => {
            setActiveIdx(0);
          }}
          onChange={(e) => {
            const val = e.target.value;
            setSearch(val);
            openDropdown();
            setActiveIdx(0);
            if (employees.some((emp) => emp.이름 === val)) {
              setPrevValue(val);
              onChange(val);
            }
          }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={handleKeyDown}
        />
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
      </div>
      {open && filtered.length > 0 && (
        <div
          className="fixed z-[9999] mt-1 w-40 rounded-md border bg-popover shadow-lg"
          style={{ top: dropdownPos.top, left: dropdownPos.left }}
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

export function ReceiptMailComposer({
  employees = [],
  employeeProfiles = [],
}: {
  employees?: MoraleEmployee[];
  employeeProfiles?: { name: string; position: string }[];
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

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
  const [headCount, setHeadCount] = useState(1);
  const [sendStatus, setSendStatus] = useState<SendStatus>({
    state: 'idle',
    message: '메일 비밀번호는 발송할 때만 사용됩니다.',
  });
  const [mailPassword, setMailPassword] = useState('');

  // 비카페 유형: 인원수·총액 변경 시 금액 자동 계산
  useEffect(() => {
    if (useType === 'cafe') return;
    const n = Math.max(1, headCount);
    setParticipants((prev) => {
      const adjusted = Array.from({ length: n }, (_, i) => ({
        name: prev[i]?.name ?? '',
        position: prev[i]?.position ?? '책임',
        amount: 0,
      }));
      if (totalAmount > 0) {
        return adjusted.map((p) => ({
          ...p,
          amount:
            useType === 'lunch'
              ? Math.max(0, Math.round(Math.max(0, totalAmount - n * 20000) / n / 10) * 10)
              : Math.round(totalAmount / n / 10) * 10,
        }));
      }
      return adjusted;
    });
  }, [useType, totalAmount, headCount]);

  const sortedParticipants = [...participants].sort((a, b) => {
    const rankA = POSITION_RANK[a.position] ?? 99;
    const rankB = POSITION_RANK[b.position] ?? 99;
    if (rankA !== rankB) return rankA - rankB;
    const noA = employees.find((e) => e.이름 === a.name)?.no ?? 9999;
    const noB = employees.find((e) => e.이름 === b.name)?.no ?? 9999;
    return noA - noB;
  });

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

  const emailBody = buildEmailBody({ useType, place, date, totalAmount, participants: sortedParticipants });

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFile(file);
    setReceiptPreview(URL.createObjectURL(file));
    await analyze(file);
  }

  async function analyze(receipt: File) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setAnalyzing(true);
    try {
      const form = new FormData();
      form.append('receipt', receipt);
      const res = await fetch('/api/morale/receipt', { method: 'POST', body: form, signal: controller.signal });
      const data = await res.json();
      if (data.receiptUrl) setReceiptUrl(data.receiptUrl);
      if (data.place) setPlace(data.place);
      if (data.date) setDate(data.date);
      if (data.totalAmount) setTotalAmount(data.totalAmount);

      // 장소 유형 + 시간대로 사용 유형 자동 감지
      if (data.placeType === 'cafe') {
        setUseType('cafe');
      } else if (data.placeType === 'other') {
        setUseType('culture');
      } else if (data.time) {
        const hour = parseInt(data.time.split(':')[0], 10);
        if (hour >= 12 && hour < 15) {
          setUseType('lunch');
          // 총액 ÷ 2만원으로 인원수 추정 (최소 1, 최대 10)
          if (data.totalAmount > 0) {
            const estimated = Math.min(10, Math.max(1, Math.round(data.totalAmount / 20000)));
            setHeadCount(estimated);
          }
        }
      }

      // 카페만 음료별 분리, 식사/문화데이는 총액+인원수 방식
      if (data.placeType === 'cafe' && data.items && data.items.length > 0) {
        const expanded: Participant[] = [];
        for (const it of data.items as { item: string; quantity: number; unitPrice: number }[]) {
          for (let q = 0; q < (it.quantity ?? 1); q++) {
            expanded.push({
              name: expanded.length === 0 ? '양다윗' : '',
              position: expanded.length === 0 ? '선임' : '',
              amount: Math.round((it.unitPrice ?? 0) / 10) * 10,
              menuItem: it.item ?? '',
            });
          }
        }
        setParticipants(expanded);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
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

  async function handleSendMail() {
    if (!place.trim()) {
      setSendStatus({ state: 'error', message: '사용처를 입력해 주세요.' });
      return;
    }

    if (totalDeduction <= 0) {
      setSendStatus({ state: 'error', message: '차감 신청 금액을 입력해 주세요.' });
      return;
    }

    if (!mailPassword) {
      setSendStatus({ state: 'error', message: '메일 비밀번호를 입력해 주세요.' });
      return;
    }

    setSendStatus({ state: 'sending', message: '발송 준비 중...', progress: 0 });

    try {
      const response = await fetch('/api/morale/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          body: emailBody,
          receiptUrl,
          participants: sortedParticipants,
          totalAmount: totalDeduction,
          smtpPassword: mailPassword,
        }),
      });

      if (!response.body) throw new Error('스트림 없음');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        for (const line of text.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const data = JSON.parse(line.slice(6)) as {
            progress?: number; message?: string; done?: boolean; error?: string; detail?: string;
          };

          if (data.error) {
            setSendStatus({ state: 'error', message: data.detail ? `${data.error} (${data.detail})` : data.error });
            return;
          }
          if (data.done) {
            setSendStatus({ state: 'success', message: '메일을 발송했습니다.' });
            return;
          }
          if (data.progress !== undefined) {
            setSendStatus({ state: 'sending', message: data.message ?? '발송 중...', progress: data.progress });
          }
        }
      }
    } catch {
      setSendStatus({ state: 'error', message: '메일 발송 요청에 실패했습니다.' });
    }
  }

  const totalDeduction = participants.reduce((s, p) => s + p.amount, 0);
  const [lightbox, setLightbox] = useState(false);
  const [dragging, setDragging] = useState(false);

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    if (receiptPreview) return;
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setReceiptFile(file);
    setReceiptPreview(URL.createObjectURL(file));
    analyze(file);
  }

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
              className={`w-full h-36 rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors overflow-hidden bg-muted/20 relative ${dragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:border-primary/50'}`}
              onClick={() => !receiptPreview ? fileInputRef.current?.click() : !analyzing && setLightbox(true)}
              onDragOver={(e) => { e.preventDefault(); if (!receiptPreview) setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              {receiptPreview ? (
                <>
                  <Image src={receiptPreview} alt="영수증" fill className="object-contain p-2" />
                  {/* AI 분석 오버레이 */}
                  {analyzing && (
                    <div className="ai-scanning-overlay absolute inset-0 z-10 rounded-lg" />
                  )}
                  <button
                    type="button"
                    className="absolute top-1.5 right-1.5 z-30 rounded-full bg-black/60 p-1 text-white hover:bg-black/80 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      abortRef.current?.abort();
                      abortRef.current = null;
                      setAnalyzing(false);
                      setReceiptPreview(null);
                      setReceiptUrl(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <Upload className={`h-6 w-6 mb-2 ${dragging ? 'text-primary' : 'text-muted-foreground'}`} />
                  <p className={`text-sm ${dragging ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                    {dragging ? '여기에 놓으세요' : '클릭하거나 사진을 끌어다 놓으세요'}
                  </p>
                </>
              )}
            </div>
            {analyzing && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                AI가 영수증을 인식 중...
              </div>
            )}

            {/* 라이트박스 */}
            {lightbox && receiptPreview && (
              <div
                className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center"
                onClick={() => setLightbox(false)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={receiptPreview}
                  alt="영수증 확대"
                  className="max-w-[92vw] max-h-[92vh] object-contain rounded-lg"
                  onClick={(e) => e.stopPropagation()}
                />
                <button
                  className="absolute top-4 right-4 rounded-full bg-white/20 p-2 text-white hover:bg-white/30 transition-colors"
                  onClick={() => setLightbox(false)}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
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
                    if (!v) return;
                    const prev = useType;
                    setUseType(v);
                    if (prev === 'cafe' && v !== 'cafe') {
                      setHeadCount(Math.max(1, participants.length));
                    } else if (v === 'cafe') {
                      setParticipants([{ name: '양다윗', position: '선임', amount: 0 }]);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue>{getUseTypeLabel(useType)}</SelectValue>
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
                  step={100}
                  min={0}
                  max={5000000}
                  value={totalAmount || ''}
                  onChange={(e) => setTotalAmount(Math.min(5000000, Number(e.target.value)))}
                />
              </div>
            </div>
            {useType !== 'cafe' && (
              <div className="grid grid-cols-2 gap-3 items-end">
                <div className="space-y-1.5">
                  <Label className="text-xs">인원수</Label>
                  <Input
                    type="number"
                    min={1}
                    value={headCount}
                    max={10}
                    onChange={(e) => setHeadCount(Math.min(10, Math.max(1, Number(e.target.value))))}
                  />
                </div>
                {totalAmount > 0 && (
                  <p className="text-xs text-muted-foreground pb-2">
                    {useType === 'lunch' ? (
                      <>
                        초과분{' '}
                        <span className="font-medium text-foreground">
                          {Math.max(0, totalAmount - headCount * 20000).toLocaleString()}원
                        </span>{' '}
                        ÷ {headCount}명 ={' '}
                        <span className="font-medium text-foreground">
                          {Math.max(0, Math.round(Math.max(0, totalAmount - headCount * 20000) / headCount / 10) * 10).toLocaleString()}원
                        </span>
                        /인
                      </>
                    ) : (
                      <>
                        {totalAmount.toLocaleString()}원 ÷ {headCount}명 ={' '}
                        <span className="font-medium text-foreground">
                          {Math.round(totalAmount / headCount / 10) * 10 > 0
                            ? (Math.round(totalAmount / headCount / 10) * 10).toLocaleString()
                            : 0}원
                        </span>
                        /인
                      </>
                    )}
                  </p>
                )}
              </div>
            )}
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
                  <p className="text-xs text-muted-foreground pl-1">
                    {i + 1}번 · {p.menuItem}
                  </p>
                )}
                <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                  <NameCombobox
                    value={p.name}
                    employees={employees}
                    onChange={(name) => {
                      updateParticipant(i, 'name', name);
                      const profile = employeeProfiles.find((ep) => ep.name === name);
                      if (profile) updateParticipant(i, 'position', profile.position);
                    }}
                  />
                  <Input
                    placeholder="직책 (예: 책임)"
                    value={p.position}
                    onChange={(e) => updateParticipant(i, 'position', e.target.value)}
                  />
                  {(() => {
                    const currentMonth = `${new Date().getMonth() + 1}월`;
                    const emp = employees.find((e) => e.이름 === p.name);
                    const remaining = emp?.월별.find((m) => m.월 === currentMonth)?.잔여금액;
                    const cap = remaining !== undefined ? Math.min(50000, remaining) : 50000;
                    return (
                      <Input
                        type="number"
                        placeholder="금액"
                        step={100}
                        min={0}
                        max={cap}
                        value={p.amount === 0 ? 0 : p.amount || ''}
                        onChange={(e) => {
                          const val = Math.min(cap, Math.max(0, Number(e.target.value)));
                          updateParticipant(i, 'amount', val);
                        }}
                      />
                    );
                  })()}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 text-muted-foreground"
                    onClick={() => {
                      removeParticipant(i);
                      if (useType !== 'cafe') setHeadCount((prev) => Math.max(1, prev - 1));
                    }}
                    disabled={participants.length === 1}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {(() => {
                  if (!p.name) return null;
                  const currentMonth = `${new Date().getMonth() + 1}월`;
                  const emp = employees.find((e) => e.이름 === p.name);
                  const monthData = emp?.월별.find((m) => m.월 === currentMonth);
                  const remaining = monthData?.잔여금액;
                  if (remaining === undefined) return null;
                  const afterDeduction = remaining - p.amount;
                  return (
                    <p className="text-xs text-right text-muted-foreground pr-10">
                      잔여{' '}
                      <span className="font-medium text-foreground">
                        {remaining.toLocaleString()}원
                      </span>
                      {p.amount > 0 && (
                        <>
                          {' '}→{' '}
                          <span className={afterDeduction < 0 ? 'text-red-500 font-medium' : 'font-medium text-foreground'}>
                            {afterDeduction.toLocaleString()}원
                          </span>
                        </>
                      )}
                    </p>
                  );
                })()}
              </div>
            ))}

            <Button
              size="sm"
              variant="outline"
              className="w-full gap-1"
              disabled={participants.length >= 10}
              onClick={() => {
                addParticipant();
                if (useType !== 'cafe') setHeadCount((prev) => Math.min(10, prev + 1));
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              인원 추가
            </Button>

            {totalDeduction > 0 && (
              <p className="text-xs text-muted-foreground text-right pt-1">
                차감 합계:{' '}
                <span className="font-semibold text-foreground">
                  {totalDeduction.toLocaleString()}원
                </span>
                {totalAmount > 0 && (() => {
                  const base =
                    useType === 'lunch'
                      ? Math.max(0, totalAmount - headCount * 20000)
                      : totalAmount;
                  if (base === totalDeduction) return null;
                  const diff = Math.abs(base - totalDeduction);
                  const over = totalDeduction > base;
                  return (
                    <span className={`ml-2 font-medium ${over ? 'text-blue-500' : 'text-red-500'}`}>
                      ({diff.toLocaleString()}원 {over ? '초과' : '부족'})
                    </span>
                  );
                })()}
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
                  <span>
                    {sortedParticipants
                      .map((p) => p.name)
                      .filter(Boolean)
                      .join(', ')}
                  </span>
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
            <div className="space-y-1.5 border-t pt-3">
              <Label className="text-xs" htmlFor="mail-password">
                메일 비밀번호
              </Label>
              <Input
                id="mail-password"
                type="password"
                autoComplete="current-password"
                placeholder="로그인에 사용한 메일 비밀번호"
                value={mailPassword}
                onChange={(e) => setMailPassword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                저장하지 않고 발송 요청에만 사용합니다.
              </p>
            </div>
            {sendStatus.state === 'sending' && (
              <div className="space-y-1.5">
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                    style={{ width: `${sendStatus.progress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-right">{sendStatus.progress}%</p>
              </div>
            )}
            <div className="flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
              <p
                className={`text-sm ${
                  sendStatus.state === 'error'
                    ? 'text-red-500'
                    : sendStatus.state === 'success'
                      ? 'text-emerald-600'
                      : 'text-muted-foreground'
                }`}
              >
                {sendStatus.message}
              </p>
              <Button
                className="gap-2"
                onClick={handleSendMail}
                disabled={sendStatus.state === 'sending' || analyzing}
              >
                {sendStatus.state === 'sending' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {sendStatus.state === 'sending' ? '발송 중' : '메일 발송'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
