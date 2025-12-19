export const getJosa = (text: string, status: string): string => {
  if (!text) return '여행이';
  const lastChar = text.charCodeAt(text.length - 1);
  const isKorean = lastChar >= 0xAC00 && lastChar <= 0xD7A3;
  
  if (!isKorean) return (status === 'add' ? ' 여행이' : ' 여행을');
  
  const hasBatchim = (lastChar - 0xAC00) % 28 !== 0;
  return hasBatchim ? (status === 'add' ? '이' : '을') : (status === 'add' ? '가' : '를');
};
