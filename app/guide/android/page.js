import GuideSteps from "@/app/components/GuideSteps";

export const metadata = {
  title: "갤럭시(안드로이드) 설정법 - IsitEmpty",
};

const STEPS = [
  { icon: "🌐", title: "Chrome 브라우저로 이 사이트에 접속하세요" },
  { icon: "⋮", title: "오른쪽 상단 점 3개(⋮) 메뉴를 클릭하세요" },
  { icon: "➕", title: '"홈 화면에 추가"를 선택하세요' },
  { icon: "✅", title: '이름을 확인하고 "추가"를 클릭하세요' },
  { icon: "🏠", title: "홈 화면에 아이콘이 생성되고, 앱처럼 실행돼요" },
];

export default function AndroidGuidePage() {
  return (
    <GuideSteps
      eyebrow="갤럭시(안드로이드)"
      title="홈 화면에 추가하는 방법"
      steps={STEPS}
    />
  );
}
