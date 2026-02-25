/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, ChangeEvent, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toPng } from 'html-to-image';
import { 
  Copy, 
  Save, 
  Trash2, 
  Plus, 
  History, 
  CheckCircle2, 
  AlertCircle,
  ChevronDown,
  User,
  Phone,
  Calendar,
  Clock,
  FileText,
  Building2,
  Smartphone,
  Share2,
  Info,
  Image as ImageIcon,
  Download
} from 'lucide-react';
import { ActivationRequest, PersistentRequesterInfo } from './types';

const STORAGE_KEY_REQUESTER = 'ntelecom_requester_info';
const STORAGE_KEY_HISTORY = 'ntelecom_activation_history';

export default function App() {
  const [formData, setFormData] = useState<Omit<ActivationRequest, 'id' | 'createdAt'>>({
    type: '선불',
    category: '신규개통',
    salesMemberNo: '',
    salesMemberName: '',
    subscriberName: '',
    subscriberBirth: '',
    subscriberContact: '',
    network: 'K망',
    plan: '',
    portingInfo: '',
    reservationDay: '',
    reservationAmPm: '오후',
    reservationTime: '',
    specialNotes: '',
    requesterMemberNo: '',
    requesterMemberName: '',
    requesterCenter: '',
    requesterContact: '',
    activationCenter: '',
    confirmedNumber: '',
  });

  const [history, setHistory] = useState<ActivationRequest[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showSaveInfo, setShowSaveInfo] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  // Refs for auto-focus navigation
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null }>({});
  const formRef = useRef<HTMLDivElement>(null);

  // Load persistent requester info and history
  useEffect(() => {
    const savedRequester = localStorage.getItem(STORAGE_KEY_REQUESTER);
    if (savedRequester) {
      const parsed = JSON.parse(savedRequester) as PersistentRequesterInfo;
      setFormData(prev => ({ ...prev, ...parsed }));
    }

    const savedHistory = localStorage.getItem(STORAGE_KEY_HISTORY);
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  // Save requester info whenever it changes
  useEffect(() => {
    const requesterInfo: PersistentRequesterInfo = {
      requesterMemberNo: formData.requesterMemberNo,
      requesterMemberName: formData.requesterMemberName,
      requesterCenter: formData.requesterCenter,
      requesterContact: formData.requesterContact,
    };
    localStorage.setItem(STORAGE_KEY_REQUESTER, JSON.stringify(requesterInfo));
  }, [formData.requesterMemberNo, formData.requesterMemberName, formData.requesterCenter, formData.requesterContact]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Auto-jump for specific fields
    if (name === 'subscriberBirth' && value.length === 6) {
      focusNext('subscriberContact');
    }
    if (name === 'reservationDay' && value.length >= 2) {
      focusNext('reservationTime');
    }
  };

  const handleKeyDown = (e: KeyboardEvent, nextField: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      focusNext(nextField);
    }
  };

  const focusNext = (fieldName: string) => {
    const nextInput = inputRefs.current[fieldName];
    if (nextInput) {
      nextInput.focus();
    }
  };

  const getFormattedText = () => {
    return `
[센터방문 개통 요청서]

■ 개통 구분: ${formData.type} / ${formData.category}

■ 매출자 정보
- 회원번호: ${formData.salesMemberNo}
- 회원명: ${formData.salesMemberName}

■ 명의자 정보
- 성명: ${formData.subscriberName}
- 생년월일: ${formData.subscriberBirth}
- 연락번호: ${formData.subscriberContact}

■ 통신 정보
- 통신망: ${formData.network}
- 가입 요금제: ${formData.plan}
- 번호이동 정보: ${formData.portingInfo || '없음'}

■ 방문 예약 시간
- ${currentYear}년 ${currentMonth}월 ${formData.reservationDay}일 ${formData.reservationAmPm} ${formData.reservationTime}

■ 특이사항
- ${formData.specialNotes || '없음'}

■ 요청 회원 정보
- 회원번호: ${formData.requesterMemberNo}
- 회원명: ${formData.requesterMemberName}
- 소속 센터: ${formData.requesterCenter}
- 연락처: ${formData.requesterContact}

■ 개통 처리 정보
- 개통 센터: ${formData.activationCenter || '미입력'}
- 확정 번호: ${formData.confirmedNumber || '미입력'}
    `.trim();
  };

  const handleCopy = () => {
    const text = getFormattedText();
    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  const handleShare = async () => {
    const text = getFormattedText();
    
    // Try to share text first
    if (navigator.share) {
      try {
        await navigator.share({
          title: '센터방문 개통 요청서',
          text: text,
        });
        return;
      } catch (err) {
        // If user cancelled, don't show error
        if ((err as Error).name === 'AbortError') return;
        console.error('Share failed:', err);
      }
    }

    // Fallback to clipboard
    handleCopy();
    alert('현재 브라우저에서 직접 공유 기능을 실행할 수 없습니다.\n내용이 복사되었으니, 팩스 앱이나 카카오톡에 붙여넣기 해주세요.\n\n(팁: "이미지 저장" 버튼을 눌러 사진으로 공유하는 것도 좋습니다!)');
  };

  const handleCapture = async () => {
    if (formRef.current === null) return;
    
    setIsCapturing(true);
    try {
      // Small delay to ensure UI is ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const dataUrl = await toPng(formRef.current, {
        cacheBust: true,
        backgroundColor: '#F5F5F0',
        pixelRatio: 2, // High quality
      });
      
      const link = document.createElement('a');
      link.download = `개통요청서_${formData.subscriberName || '미지정'}_${new Date().getTime()}.png`;
      link.href = dataUrl;
      link.click();
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error('Capture failed:', err);
      alert('이미지 저장 중 오류가 발생했습니다. 브라우저 설정을 확인해주세요.');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleSave = () => {
    const newEntry: ActivationRequest = {
      ...formData,
      id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
      createdAt: new Date().toISOString(),
    };
    const updatedHistory = [newEntry, ...history].slice(0, 50);
    setHistory(updatedHistory);
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updatedHistory));
    
    setLastSaved(new Date().toLocaleTimeString());
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const deleteHistoryItem = (id: string) => {
    const updatedHistory = history.filter(item => item.id !== id);
    setHistory(updatedHistory);
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updatedHistory));
  };

  const loadHistoryItem = (item: ActivationRequest) => {
    const { id, createdAt, ...rest } = item;
    setFormData(prev => ({ ...prev, ...rest }));
    setShowHistory(false);
  };

  const resetForm = () => {
    setFormData(prev => ({
      ...prev,
      salesMemberNo: '',
      salesMemberName: '',
      subscriberName: '',
      subscriberBirth: '',
      subscriberContact: '',
      plan: '',
      portingInfo: '',
      reservationDay: '',
      reservationAmPm: '오후',
      reservationTime: '',
      specialNotes: '',
      activationCenter: '',
      confirmedNumber: '',
    }));
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#141414] font-sans p-4 md:p-8 pb-24">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight uppercase border-b-2 border-[#141414] pb-4 inline-block">
            센터방문 개통 요청서
          </h1>
          <div className="flex justify-center gap-6 pt-4 text-sm font-medium">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="type" 
                value="선불" 
                checked={formData.type === '선불'} 
                onChange={handleInputChange}
                className="w-4 h-4 accent-[#141414]"
              />
              선불
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="type" 
                value="후불" 
                checked={formData.type === '후불'} 
                onChange={handleInputChange}
                className="w-4 h-4 accent-[#141414]"
              />
              후불
            </label>
            <span className="opacity-30">/</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="category" 
                value="신규개통" 
                checked={formData.category === '신규개통'} 
                onChange={handleInputChange}
                className="w-4 h-4 accent-[#141414]"
              />
              신규개통
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="category" 
                value="번호이동" 
                checked={formData.category === '번호이동'} 
                onChange={handleInputChange}
                className="w-4 h-4 accent-[#141414]"
              />
              번호이동
            </label>
          </div>
        </header>

        {/* Action Buttons */}
          <div className="flex flex-col items-end gap-1">
            <div className="flex flex-wrap gap-2 justify-end">
              <button 
                onClick={resetForm}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-[#141414] rounded-lg hover:bg-gray-50 transition-colors shadow-sm text-sm"
              >
                <Plus size={16} />
                새로 작성
              </button>
              <button 
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-[#141414] rounded-lg hover:bg-gray-50 transition-colors shadow-sm text-sm relative"
              >
                <History size={16} />
                기록
                {history.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold border-2 border-[#F5F5F0]">
                    {history.length}
                  </span>
                )}
              </button>
              <button 
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-[#141414] text-white rounded-lg hover:bg-opacity-90 transition-colors shadow-md text-sm"
              >
                {saveSuccess ? <CheckCircle2 size={16} /> : <Save size={16} />}
                저장
              </button>
              <button 
                onClick={handleCapture}
                disabled={isCapturing}
                className="flex items-center gap-2 px-4 py-2 bg-[#141414] text-white rounded-lg hover:bg-opacity-90 transition-colors shadow-md text-sm disabled:opacity-50"
              >
                {isCapturing ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <ImageIcon size={16} />}
                이미지 저장
              </button>
              <button 
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 bg-[#141414] text-white rounded-lg hover:bg-opacity-90 transition-colors shadow-md text-sm"
                title="모바일 팩스 앱 등으로 공유할 수 있습니다."
              >
                <Share2 size={16} />
                공유 (팩스)
              </button>
            </div>
            {lastSaved && (
              <span className="text-[10px] text-gray-400 italic">
                마지막 저장: {lastSaved}
              </span>
            )}
          </div>

        {/* Form Content */}
        <div ref={formRef} className={isCapturing ? 'p-8 bg-[#F5F5F0]' : ''}>
          <main className="bg-white border border-[#141414] shadow-xl overflow-hidden rounded-xl">
          <div className="p-1.5 bg-[#141414] text-white text-xs uppercase tracking-widest text-center">
            N Telecom Activation Request Form
          </div>
          
          <div className="grid grid-cols-1 divide-y divide-[#141414]">
            
            {/* Section: Sales Info */}
            <div className="grid grid-cols-1 md:grid-cols-4 divide-x-0 md:divide-x divide-[#141414]">
              <div className="bg-[#F0F0F0] p-4 flex items-center justify-center font-bold text-sm uppercase tracking-tight">
                매출자 정보
              </div>
              <div className="col-span-3 grid grid-cols-2 divide-x divide-[#141414]">
                <div className="p-0">
                  <div className="bg-[#F9F9F9] px-3 py-1.5 text-xs font-bold border-b border-[#141414] uppercase">회원번호</div>
                  <input 
                    ref={el => inputRefs.current['salesMemberNo'] = el}
                    type="text" 
                    name="salesMemberNo"
                    value={formData.salesMemberNo}
                    onChange={handleInputChange}
                    onKeyDown={(e) => handleKeyDown(e, 'salesMemberName')}
                    placeholder="*904965"
                    className="w-full px-3 py-3 outline-none focus:bg-blue-50 transition-colors"
                  />
                </div>
                <div className="p-0">
                  <div className="bg-[#F9F9F9] px-3 py-1.5 text-xs font-bold border-b border-[#141414] uppercase">회원명</div>
                  <input 
                    ref={el => inputRefs.current['salesMemberName'] = el}
                    type="text" 
                    name="salesMemberName"
                    value={formData.salesMemberName}
                    onChange={handleInputChange}
                    onKeyDown={(e) => handleKeyDown(e, 'subscriberName')}
                    placeholder="이아롱"
                    className="w-full px-3 py-3 outline-none focus:bg-blue-50 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Section: Subscriber Info */}
            <div className="grid grid-cols-1 md:grid-cols-4 divide-x-0 md:divide-x divide-[#141414]">
              <div className="bg-[#F0F0F0] p-4 flex items-center justify-center font-bold text-sm uppercase tracking-tight">
                명의자 정보
              </div>
              <div className="col-span-3 grid grid-cols-3 divide-x divide-[#141414]">
                <div className="p-0">
                  <div className="bg-[#F9F9F9] px-3 py-1.5 text-xs font-bold border-b border-[#141414] uppercase">성명</div>
                  <input 
                    ref={el => inputRefs.current['subscriberName'] = el}
                    type="text" 
                    name="subscriberName"
                    value={formData.subscriberName}
                    onChange={handleInputChange}
                    onKeyDown={(e) => handleKeyDown(e, 'subscriberBirth')}
                    placeholder="박기환"
                    className="w-full px-3 py-3 outline-none focus:bg-blue-50 transition-colors"
                  />
                </div>
                <div className="p-0">
                  <div className="bg-[#F9F9F9] px-3 py-1.5 text-xs font-bold border-b border-[#141414] uppercase">생년월일</div>
                  <input 
                    ref={el => inputRefs.current['subscriberBirth'] = el}
                    type="text" 
                    name="subscriberBirth"
                    value={formData.subscriberBirth}
                    onChange={handleInputChange}
                    onKeyDown={(e) => handleKeyDown(e, 'subscriberContact')}
                    placeholder="YYMMDD"
                    maxLength={6}
                    className="w-full px-3 py-3 outline-none focus:bg-blue-50 transition-colors"
                  />
                </div>
                <div className="p-0">
                  <div className="bg-[#F9F9F9] px-3 py-1.5 text-xs font-bold border-b border-[#141414] uppercase">연락번호</div>
                  <input 
                    ref={el => inputRefs.current['subscriberContact'] = el}
                    type="text" 
                    name="subscriberContact"
                    value={formData.subscriberContact}
                    onChange={handleInputChange}
                    onKeyDown={(e) => handleKeyDown(e, 'plan')}
                    placeholder="010-0000-0000"
                    className="w-full px-3 py-3 outline-none focus:bg-blue-50 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Section: Network & Plan */}
            <div className="grid grid-cols-1 md:grid-cols-4 divide-x-0 md:divide-x divide-[#141414]">
              <div className="bg-[#F0F0F0] p-4 flex items-center justify-center font-bold text-sm uppercase tracking-tight">
                통신망 선택
              </div>
              <div className="col-span-3 grid grid-cols-3 divide-x divide-[#141414]">
                <div className="p-0">
                  <div className="bg-[#F9F9F9] px-3 py-1.5 text-xs font-bold border-b border-[#141414] uppercase">망 선택</div>
                  <select 
                    ref={el => inputRefs.current['network'] = el}
                    name="network"
                    value={formData.network}
                    onChange={handleInputChange}
                    onKeyDown={(e) => handleKeyDown(e, 'plan')}
                    className="w-full px-3 py-3 outline-none focus:bg-blue-50 transition-colors appearance-none cursor-pointer"
                  >
                    <option value="K망">K망</option>
                    <option value="L망">L망</option>
                  </select>
                </div>
                <div className="p-0 col-span-1">
                  <div className="bg-[#F9F9F9] px-3 py-1.5 text-xs font-bold border-b border-[#141414] uppercase">가입 요금제</div>
                  <input 
                    ref={el => inputRefs.current['plan'] = el}
                    type="text" 
                    name="plan"
                    value={formData.plan}
                    onChange={handleInputChange}
                    onKeyDown={(e) => handleKeyDown(e, 'portingInfo')}
                    placeholder="기본 1"
                    className="w-full px-3 py-3 outline-none focus:bg-blue-50 transition-colors"
                  />
                </div>
                <div className="p-0">
                  <div className="bg-[#F9F9F9] px-3 py-1.5 text-xs font-bold border-b border-[#141414] uppercase">번호이동 정보</div>
                  <input 
                    ref={el => inputRefs.current['portingInfo'] = el}
                    type="text" 
                    name="portingInfo"
                    value={formData.portingInfo}
                    onChange={handleInputChange}
                    onKeyDown={(e) => handleKeyDown(e, 'reservationDay')}
                    placeholder="현재 번호 / 통신사"
                    className="w-full px-3 py-3 outline-none focus:bg-blue-50 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Section: Reservation */}
            <div className="grid grid-cols-1 md:grid-cols-4 divide-x-0 md:divide-x divide-[#141414]">
              <div className="bg-[#F0F0F0] p-4 flex items-center justify-center font-bold text-sm uppercase tracking-tight">
                방문 예약 시간
              </div>
              <div className="col-span-3 flex flex-wrap items-center px-4 py-3 gap-3">
                <div className="flex items-center gap-1">
                  <span className="font-bold whitespace-nowrap">{currentYear}년 {currentMonth}월</span>
                  <input 
                    ref={el => inputRefs.current['reservationDay'] = el}
                    type="number" 
                    name="reservationDay"
                    value={formData.reservationDay}
                    onChange={handleInputChange}
                    placeholder="일"
                    className="w-12 px-1 py-1 border-b border-[#141414] outline-none text-center"
                  />
                  <span>일</span>
                </div>
                
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button 
                    onClick={() => {
                      setFormData(prev => ({ ...prev, reservationAmPm: '오전' }));
                      focusNext('reservationTime');
                    }}
                    className={`px-3 py-1 text-xs rounded-md transition-all ${formData.reservationAmPm === '오전' ? 'bg-[#141414] text-white shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}
                  >
                    오전
                  </button>
                  <button 
                    onClick={() => {
                      setFormData(prev => ({ ...prev, reservationAmPm: '오후' }));
                      focusNext('reservationTime');
                    }}
                    className={`px-3 py-1 text-xs rounded-md transition-all ${formData.reservationAmPm === '오후' ? 'bg-[#141414] text-white shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}
                  >
                    오후
                  </button>
                </div>

                <input 
                  ref={el => inputRefs.current['reservationTime'] = el}
                  type="text" 
                  name="reservationTime"
                  value={formData.reservationTime}
                  onChange={handleInputChange}
                  onKeyDown={(e) => handleKeyDown(e, 'specialNotes')}
                  placeholder="1시 30분"
                  className="flex-1 min-w-[100px] px-2 py-1 border-b border-[#141414] outline-none"
                />
                <span className="text-xs opacity-50 italic">이후</span>
              </div>
            </div>

            {/* Section: Special Notes */}
            <div className="grid grid-cols-1 md:grid-cols-4 divide-x-0 md:divide-x divide-[#141414]">
              <div className="bg-[#F0F0F0] p-4 flex items-center justify-center font-bold text-sm uppercase tracking-tight">
                특이사항
              </div>
              <div className="col-span-3">
                <textarea 
                  ref={el => inputRefs.current['specialNotes'] = el}
                  name="specialNotes"
                  value={formData.specialNotes}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      focusNext('requesterMemberNo');
                    }
                  }}
                  placeholder="신분증 개통, 연체 미납 등 특이사항 입력"
                  className="w-full px-4 py-3 outline-none focus:bg-blue-50 transition-colors min-h-[80px] resize-none"
                />
              </div>
            </div>

            {/* Section: Requester Info (Persistent) */}
            <div className="grid grid-cols-1 md:grid-cols-4 divide-x-0 md:divide-x divide-[#141414]">
              <div className="bg-[#F0F0F0] p-4 flex items-center justify-center font-bold text-sm uppercase tracking-tight">
                요청 회원 정보
              </div>
              <div className="col-span-3 grid grid-cols-2 divide-y divide-x divide-[#141414]">
                <div className="p-0 border-t-0">
                  <div className="bg-[#F9F9F9] px-3 py-1.5 text-xs font-bold border-b border-[#141414] uppercase">회원번호</div>
                  <input 
                    ref={el => inputRefs.current['requesterMemberNo'] = el}
                    type="text" 
                    name="requesterMemberNo"
                    value={formData.requesterMemberNo}
                    onChange={handleInputChange}
                    onKeyDown={(e) => handleKeyDown(e, 'requesterMemberName')}
                    placeholder="*860477"
                    className="w-full px-3 py-3 outline-none focus:bg-green-50 transition-colors"
                  />
                </div>
                <div className="p-0 border-t-0">
                  <div className="bg-[#F9F9F9] px-3 py-1.5 text-xs font-bold border-b border-[#141414] uppercase">회원명</div>
                  <input 
                    ref={el => inputRefs.current['requesterMemberName'] = el}
                    type="text" 
                    name="requesterMemberName"
                    value={formData.requesterMemberName}
                    onChange={handleInputChange}
                    onKeyDown={(e) => handleKeyDown(e, 'requesterCenter')}
                    placeholder="이창창"
                    className="w-full px-3 py-3 outline-none focus:bg-green-50 transition-colors"
                  />
                </div>
                <div className="p-0">
                  <div className="bg-[#F9F9F9] px-3 py-1.5 text-xs font-bold border-b border-[#141414] uppercase">소속 센터 / 활동 지역</div>
                  <input 
                    ref={el => inputRefs.current['requesterCenter'] = el}
                    type="text" 
                    name="requesterCenter"
                    value={formData.requesterCenter}
                    onChange={handleInputChange}
                    onKeyDown={(e) => handleKeyDown(e, 'requesterContact')}
                    placeholder="부산연제센터/부산"
                    className="w-full px-3 py-3 outline-none focus:bg-green-50 transition-colors"
                  />
                </div>
                <div className="p-0">
                  <div className="bg-[#F9F9F9] px-3 py-1.5 text-xs font-bold border-b border-[#141414] uppercase">연락번호</div>
                  <input 
                    ref={el => inputRefs.current['requesterContact'] = el}
                    type="text" 
                    name="requesterContact"
                    value={formData.requesterContact}
                    onChange={handleInputChange}
                    onKeyDown={(e) => handleKeyDown(e, 'activationCenter')}
                    placeholder="010-7208-3071"
                    className="w-full px-3 py-3 outline-none focus:bg-green-50 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Section: Activation Result */}
            <div className="grid grid-cols-1 md:grid-cols-4 divide-x-0 md:divide-x divide-[#141414]">
              <div className="bg-[#F0F0F0] p-4 flex items-center justify-center font-bold text-sm uppercase tracking-tight">
                개통 처리 정보
              </div>
              <div className="col-span-3 grid grid-cols-2 divide-x divide-[#141414]">
                <div className="p-0">
                  <div className="bg-[#F9F9F9] px-3 py-1.5 text-xs font-bold border-b border-[#141414] uppercase">개통 센터</div>
                  <input 
                    ref={el => inputRefs.current['activationCenter'] = el}
                    type="text" 
                    name="activationCenter"
                    value={formData.activationCenter}
                    onChange={handleInputChange}
                    onKeyDown={(e) => handleKeyDown(e, 'confirmedNumber')}
                    placeholder="수원나눔 BP"
                    className="w-full px-3 py-3 outline-none focus:bg-orange-50 transition-colors"
                  />
                </div>
                <div className="p-0">
                  <div className="bg-[#F9F9F9] px-3 py-1.5 text-xs font-bold border-b border-[#141414] uppercase">개통 확정 번호</div>
                  <input 
                    ref={el => inputRefs.current['confirmedNumber'] = el}
                    type="text" 
                    name="confirmedNumber"
                    value={formData.confirmedNumber}
                    onChange={handleInputChange}
                    placeholder="010-XXXX-XXXX"
                    className="w-full px-3 py-3 outline-none focus:bg-orange-50 transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>
        </main>
        </div>

        {/* Storage Info */}
        <div className="flex justify-center">
          <button 
            onClick={() => setShowSaveInfo(!showSaveInfo)}
            className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Info size={14} />
            데이터 저장 안내
          </button>
        </div>
        
        <AnimatePresence>
          {showSaveInfo && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-xs text-blue-800 space-y-2 overflow-hidden"
            >
              <p className="font-bold">데이터는 어디에 저장되나요?</p>
              <ul className="list-disc pl-4 space-y-1">
                <li><strong>요청 회원 정보</strong>: 입력 즉시 브라우저의 내부 저장소(LocalStorage)에 안전하게 보관됩니다. 앱을 껐다 켜도 유지됩니다.</li>
                <li><strong>이미지 저장</strong>: 현재 작성된 내용을 사진 파일(PNG)로 저장합니다. 팩스 앱에서 파일을 선택할 때 이 사진을 사용하세요.</li>
                <li><strong>공유 (팩스)</strong>: '공유' 버튼을 누르면 스마트폰의 공유 창이 뜹니다. 여기서 <strong>모바일 팩스</strong> 앱을 선택하여 바로 전송할 수 있습니다.</li>
                <li><strong>주의</strong>: 브라우저 캐시를 삭제하거나 시크릿 모드를 사용하면 데이터가 사라질 수 있으니 중요한 내용은 별도로 복사해두세요.</li>
              </ul>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer Notes */}
        <footer className="space-y-4 text-xs text-gray-600 border-t border-gray-300 pt-6">
          <div className="space-y-1">
            <p className="font-bold text-gray-900">※ 개통 시 주의사항</p>
            <p>▶ 방문 개통 명의자 본인 확인 후 <span className="text-red-600 font-bold underline">개통 본인확인서(필수)</span>를 반드시 작성하여 주세요.</p>
            <p>▶ 다회선 개통 요청 시 개통 의뢰 회원에게 내용 확인 후 개통 진행해주세요.</p>
            <p>▶ 부정영업이 의심이 되는 경우 개통을 거부할 수 있습니다.</p>
            <p className="pl-4">- 본인 실사용 외 타인 판매, 양도, 불법 스팸, 보이스피싱 등</p>
          </div>
          <div className="flex justify-between items-end opacity-50">
            <div className="text-[10px] uppercase font-mono">
              System: N-Telecom Activation Helper v1.1
            </div>
            <div className="text-right">
              <p className="font-bold italic text-lg tracking-tighter">N telecom</p>
              <p className="text-[8px]">앤텔레콤</p>
            </div>
          </div>
        </footer>
      </div>

      {/* History Sidebar */}
      <AnimatePresence>
        {showHistory && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistory(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <History size={20} />
                  작성 기록 ({history.length})
                </h2>
                <button 
                  onClick={() => setShowHistory(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <ChevronDown className="rotate-[-90deg]" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {history.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2">
                    <AlertCircle size={48} strokeWidth={1} />
                    <p>저장된 기록이 없습니다.</p>
                  </div>
                ) : (
                  history.map((item) => (
                    <div 
                      key={item.id}
                      className="group p-4 border border-gray-100 rounded-xl hover:border-[#141414] hover:shadow-md transition-all cursor-pointer relative"
                      onClick={() => loadHistoryItem(item)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-mono text-gray-400">
                          {new Date(item.createdAt).toLocaleString()}
                        </span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteHistoryItem(item.id);
                          }}
                          className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold flex items-center gap-2">
                          <User size={14} />
                          {item.subscriberName} ({item.subscriberBirth})
                        </p>
                        <p className="text-sm text-gray-600 flex items-center gap-2">
                          <Smartphone size={14} />
                          {item.network} | {item.plan}
                        </p>
                        <p className="text-xs text-gray-500 flex items-center gap-2">
                          <Calendar size={14} />
                          {item.reservationDay}일 {item.reservationAmPm} {item.reservationTime}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Toast Notifications */}
      <AnimatePresence>
        {(copySuccess || saveSuccess) && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 bg-[#141414] text-white rounded-full shadow-2xl flex items-center gap-3 z-[100]"
          >
            <CheckCircle2 size={20} className="text-green-400" />
            <span className="font-medium">
              {copySuccess ? '클립보드에 복사되었습니다.' : '브라우저에 안전하게 저장되었습니다.'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
