import { RepeatType } from '../types';

/**
 * 반복 타입을 한글 라벨로 변환
 */
export const getRepeatTypeLabel = (type: RepeatType): string => {
  switch (type) {
    case 'daily':
      return '일';
    case 'weekly':
      return '주';
    case 'monthly':
      return '월';
    case 'yearly':
      return '년';
    default:
      return '';
  }
};
