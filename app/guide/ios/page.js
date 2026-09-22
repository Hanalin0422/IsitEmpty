import GuideSteps from "@/app/components/GuideSteps";

export const metadata = {
  title: "아이폰(iOS) 설정법 - IsitEmpty",
};

const STEPS = [
  { icon: "🧭", title: "Safari 브라우저로 이 사이트에 접속하세요" },
  { icon: "⬆️", title: "하단 공유 버튼(사각형 + 위쪽 화살표)을 클릭하세요" },
  { icon: "📜", title: '메뉴를 아래로 스크롤해서 "홈 화면에 추가"를 선택하세요' },
  { icon: "✅", title: '이름을 확인하고 오른쪽 상단 "추가"를 클릭하세요' },
  { icon: "🏠", title: "홈 화면에 아이콘이 생성되고, 앱처럼 실행돼요" },
];

export default function IosGuidePage() {
  return (
    <GuideSteps
      eyebrow="아이폰(iOS)"
      title="홈 화면에 추가하는 방법"
      note="⚠️ Safari 브라우저에서만 지원돼요. 다른 브라우저(Chrome 등)에서는 이 기능을 사용할 수 없어요."
      steps={STEPS}
    />
  );
}
