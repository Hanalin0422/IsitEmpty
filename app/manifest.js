/** @type {import('next').MetadataRoute.Manifest} */
export default function manifest() {
  return {
    name: "IsitEmpty - 6층 휴게실 상태",
    short_name: "IsitEmpty",
    description: "6층 여자 휴게실 사용 중 여부를 실시간으로 확인합니다",
    start_url: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#09090b",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
        purpose: "any",
      },
      {
        src: "/app-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-256.png",
        sizes: "256x256",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
