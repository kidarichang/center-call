export interface ActivationRequest {
  id: string;
  createdAt: string;
  
  // 개통 관련 기재란
  type: '선불' | '후불';
  category: '신규개통' | '번호이동';
  
  // 매출자 정보
  salesMemberNo: string;
  salesMemberName: string;
  
  // 명의자 정보
  subscriberName: string;
  subscriberBirth: string;
  subscriberContact: string;
  
  // 통신 정보
  network: string; // K망, L망 등
  plan: string;
  portingInfo: string; // 번호이동 시 현재 번호/통신사
  
  // 방문 예약
  reservationDay: string;
  reservationAmPm: '오전' | '오후';
  reservationTime: string;
  
  // 기타
  specialNotes: string;
  
  // 요청 회원 정보 (Persistent)
  requesterMemberNo: string;
  requesterMemberName: string;
  requesterCenter: string;
  requesterContact: string;
  
  // 개통 처리 정보
  activationCenter: string;
  confirmedNumber: string;
}

export type PersistentRequesterInfo = Pick<ActivationRequest, 'requesterMemberNo' | 'requesterMemberName' | 'requesterCenter' | 'requesterContact'>;
