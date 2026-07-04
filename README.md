# Pacer — 개인 맞춤형 도보 내비게이션

> 2026년도 조선대학교 컴퓨터공학과 산학프로젝트1  
> 교통 신호 정보와 AI를 결합한 **스마트 도보 내비게이션** Android 앱

---

## 주요 기능

| 기능 | 설명 |
|---|---|
| 카카오 소셜 로그인 | 카카오 계정으로 간편 로그인 / JWT 자동 갱신 |
| 지도 탐색 | 카카오맵 기반 실시간 지도 (WebView) |
| 경로 탐색 | 출발지·목적지 설정 후 최적 보행 경로 계산 |
| 신호등 연동 | 경로 상 신호등 상태(초록/빨강)·카운트다운 실시간 표시 |
| 경로 안내 | 턴-바이-턴 방향 안내 + GPS 자동 스텝 진행 |
| 속도 추천 | 다음 신호에 맞춰 권장 보행 속도(3.5 / 4.8 / 6.0 km/h) 안내 |
| 프로필 | 사용자 프로필 조회 / 저장된 경로 관리 |

---

## 화면 구성

```
Onboarding → Auth (카카오 로그인)
                ↓
         MainTabs (하단 탭)
         ├── Home   (SearchScreen)  — 목적지 검색
         ├── Map    (MapScreen)     — 지도 + 경로 탐색
         ├── Saved  (SavedScreen)   — 저장된 장소
         └── Profile(ProfileScreen) — 프로필
                ↓ (경로 안내 시작)
         Safety (NavigationScreen) — 실시간 경로 안내
```

---

## 기술 스택

| 분류 | 기술 |
|---|---|
| 프레임워크 | React Native 0.81 (Expo bare workflow) |
| 언어 | TypeScript 5.9 |
| 내비게이션 | React Navigation 7 (Stack + Bottom Tabs) |
| 지도 | Kakao Maps JavaScript SDK (WebView) |
| 로그인 | @react-native-seoul/kakao-login |
| 위치 | expo-location |
| 상태 저장 | @react-native-async-storage/async-storage |

---

## 개발 환경 요구사항

| 항목 | 버전 |
|---|---|
| Node.js | 18 이상 |
| npm | 9 이상 |
| Android Studio | 최신 권장 |
| Android SDK | API 33 이상 |
| JDK | 17 |

---

## 처음 세팅하는 경우

### 1. 저장소 클론

```bash
git clone https://github.com/yebigun-yeondae/pacer-frontend.git
cd pacer-frontend
```

### 2. 패키지 설치

```bash
npm install
```

### 3. 환경변수 설정

`.env.example`을 복사해서 `.env` 파일을 만들고 값을 채웁니다.

```bash
cp .env.example .env
```

```env
# 백엔드 서버 주소
EXPO_PUBLIC_BASE_URL=http://서버IP:8080

# 카카오 네이티브 앱 키 (카카오 디벨로퍼스 → 앱 키 → 네이티브 앱 키)
EXPO_PUBLIC_KAKAO_NATIVE_KEY=여기에_네이티브_앱_키

# 카카오 JavaScript 키 (카카오맵 SDK WebView 초기화)
EXPO_PUBLIC_KAKAO_JS_KEY=여기에_JS_키

# 카카오 REST API 키 (장소 키워드 검색)
EXPO_PUBLIC_KAKAO_REST_KEY=여기에_REST_API_키
```

> 카카오 디벨로퍼스([developers.kakao.com](https://developers.kakao.com)) → 내 애플리케이션 → 앱 키에서 발급

### 4. Android SDK 경로 설정

`android/local.properties` 파일을 생성합니다.

**Windows:**
```
sdk.dir=C\:\\Users\\본인계정\\AppData\\Local\\Android\\Sdk
```

> Android Studio → SDK Manager → Android SDK Location 에서 경로 확인

### 5. AndroidManifest.xml HTTP 허용 설정

> Release APK 빌드 시 필수. 없으면 카카오 로그인 및 백엔드 연결이 `network request failed`로 실패합니다.

`android/app/src/main/AndroidManifest.xml`의 `<application` 태그에 추가:

```xml
<application
  ...
  android:usesCleartextTraffic="true">
```

---

## 실행 방법

### USB 연결 실행 (권장)

1. 안드로이드 폰에서 **개발자 옵션 → USB 디버깅** 활성화
2. USB로 PC에 연결
3. 연결 확인:
```bash
adb devices
```
4. 빌드 + 설치 + 실행:
```bash
npx expo run:android
```

> 첫 실행 시 빌드에 5~10분 소요. 이후 재실행은 빠름.

### 개발 서버 연결 (Wi-Fi)

PC와 폰이 **같은 와이파이**에 있어야 합니다.

```bash
npx expo start
```

앱에서 QR코드 스캔 또는 `http://PC_IP:8081` 입력

---

## APK 빌드

### Debug APK (개발용)

```bash
cd android
./gradlew assembleDebug
```

결과물: `android/app/build/outputs/apk/debug/app-debug.apk`

> Dev Client 앱 — 실행 시 개발 서버 연결 화면이 뜸 (`npx expo start` 필요)

### Release APK (배포용)

```bash
cd android
./gradlew assembleRelease
```

결과물: `android/app/build/outputs/apk/release/app-release.apk`

> 서버 연결 없이 단독 설치 가능. APK 파일만 전달하면 됨.

### APK 폰에 설치

```bash
adb install android/app/build/outputs/apk/release/app-release.apk
```

또는 폰으로 파일 전송 후 파일 관리자에서 터치 → **"출처를 알 수 없는 앱 허용"** 후 설치

---

## 프로젝트 구조

```
src/
├── api/
│   ├── config.ts        — API 엔드포인트 상수
│   ├── authApi.ts       — 카카오 로그인 / JWT 처리
│   ├── profileApi.ts    — 프로필 조회
│   └── routeApi.ts      — 경로 탐색 / 신호 파싱 / 포맷 유틸
├── navigation/
│   └── AppNavigator.tsx — Stack + Tab 네비게이터
├── screens/
│   ├── OnboardingScreen.tsx  — 온보딩
│   ├── AuthScreen.tsx        — 카카오 로그인
│   ├── SearchScreen.tsx      — 목적지 검색 (Home 탭)
│   ├── MapScreen.tsx         — 지도 + 경로 탐색
│   ├── NavigationScreen.tsx  — 실시간 경로 안내
│   ├── SavedScreen.tsx       — 저장된 장소
│   └── ProfileScreen.tsx     — 프로필
├── theme/
│   ├── colors.ts        — 컬러 팔레트
│   └── typography.ts    — 폰트 설정
└── utils/
    └── storage.ts       — AsyncStorage JWT 관리
```

---

## 백엔드 API

`src/api/config.ts`에서 엔드포인트를 관리합니다. 서버 주소는 `.env`의 `EXPO_PUBLIC_BASE_URL`로 설정합니다.

| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | `/api/v1/auth/kakao` | 카카오 토큰 → 서버 JWT 발급 |
| POST | `/api/v1/auth/reissue` | JWT 갱신 |
| POST | `/api/v1/auth/logout` | 로그아웃 |
| GET | `/api/v1/profile` | 프로필 조회 |
| POST | `/api/v1/routes` | 경로 탐색 (신호 정보 포함) |

### 경로 탐색 요청 예시

```json
{
  "origin": { "lat": 37.5665, "lng": 126.9780 },
  "destination": { "lat": 37.5500, "lng": 126.9900 },
  "originName": "현재 위치",
  "destinationName": "목적지명",
  "mode": "BALANCED"
}
```

`mode`: `BALANCED` | `FASTEST` | `SHORTEST`

### 경로 탐색 응답 예시

```json
{
  "polyline": "인코딩된_폴리라인",
  "totalTimeSeconds": 900,
  "totalDistanceMeters": 1200,
  "signalCheckpoints": [
    {
      "nodeId": 1,
      "lat": 37.560,
      "lng": 126.975,
      "etaFromStartSeconds": 120,
      "signalState": "GREEN",
      "recommendedPace": "NORMAL"
    }
  ]
}
```

---

## 브랜치 전략

| 브랜치 | 용도 |
|---|---|
| `main` | 배포 기준 브랜치 |
| `develop` | 개발 통합 브랜치 |
| `feat/*` | 기능 개발 |
| `fix/*` | 버그 수정 |
