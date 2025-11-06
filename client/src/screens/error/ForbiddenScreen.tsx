import ErrorScreen from './ErrorScreen';

export default function ForbiddenScreen() {
  return (
    <ErrorScreen
      title="해당 여행 일정의 권한이 없어요."
      subtitle="권한을 요청해서 여행 일정을 같이 만들어 가보세요!"
    />
  );
}


