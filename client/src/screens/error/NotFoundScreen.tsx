import ErrorScreen from "./ErrorScreen";

export default function NotFoundScreen() {
  return (
    <ErrorScreen
      title="해당 여행을 찾을 수 없어요."
      subtitle="새로운 여행을 만들어 가보세요!"
    />
  );
}
