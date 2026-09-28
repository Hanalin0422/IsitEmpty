import GuideSteps from "@/app/components/GuideSteps";

export const metadata = {
  title: "갤럭시(안드로이드) 설정법 - IsitEmpty",
};

const STEPS = [
  { icon: "🌐", title: "Chrome 브라우저로 이 사이트에 접속하세요" },
  {
    icon: "⋮",
    title: "오른쪽 상단 또는 하단 점 3개(⋮) 메뉴를 클릭하세요",
    image: "/android_1.jpg",
    imageWidth: 1080,
    imageHeight: 2188,
  },
  {
    icon: "➕",
    title: '메뉴에서 "현재 페이지 추가"를 선택하세요',
    image: "/android_2.jpg",
    imageWidth: 1080,
    imageHeight: 2179,
  },
  {
    icon: "📲",
    title: '"웹앱으로 설치"를 선택하세요 (권장)',
    hint: '"홈 화면"을 선택하면 일부 화면 배율이 깨질 수 있어요. "웹앱으로 설치"를 권장해요.',
    image: "/android_3.jpg",
    imageWidth: 1080,
    imageHeight: 2188,
  },
  {
    icon: "✅",
    title: '"홈 화면에 추가" 창에서 "추가"를 클릭하세요',
    image: "/android_4.jpg",
    imageWidth: 1080,
    imageHeight: 2208,
  },
  {
    icon: "🏠",
    title: "홈 화면에 아이콘이 생성되고, 앱처럼 실행돼요",
    image: "/android_5.jpg",
    imageWidth: 623,
    imageHeight: 469,
  },
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
