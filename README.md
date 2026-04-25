# pacer-frontend

2026년도 조선대학교 컴퓨터공학과 산학프로젝트1 프론트 레포지토리.
교통 정보 및 인공지능을 활용한 개인 맞춤형 도보 내비게이션 앱 프로젝트

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

### 3. Android SDK 경로 설정

`android/local.properties` 파일을 생성하고 본인 PC의 Android SDK 경로를 입력합니다.

**Windows:**
```
sdk.dir=C\:\\Users\\본인계정\\AppData\\Local\\Android\\Sdk
```


> Android Studio → SDK Manager → Android SDK Location 에서 경로 확인 가능

---

## 실행 방법

### USB로 연결해서 바로 실행하기 (가장 빠름)

1. 안드로이드 폰에서 **개발자 옵션 → USB 디버깅** 활성화
2. USB로 PC에 연결
3. 연결 확인:
```bash
adb devices
```
4. 앱 빌드 후 자동 설치 및 실행:
```bash
npx expo run:android
```

> 처음 실행 시 빌드에 5~10분 소요. 이후 재실행은 빠름.

---

### 개발 서버만 띄우고 앱에서 연결하기

PC와 폰이 **같은 와이파이**에 있어야 합니다.

```bash
npx expo start
```

실행 후 앱에서 QR코드 스캔 또는 `http://PC_IP:8081` 입력해서 연결

---

## APK 빌드

### Debug APK (개발용)

```bash
cd android
./gradlew assembleDebug
```

빌드 결과: `android/app/build/outputs/apk/debug/app-debug.apk`

> 이 APK는 Dev Client 앱이라 실행 시 개발 서버 연결 화면이 뜸 (`npx expo start` 필요)

---

### Release APK (배포용 — 단독 설치 가능)

```bash
cd android
./gradlew assembleRelease
```

빌드 결과: `android/app/build/outputs/apk/release/app-release.apk`

> 이 APK는 서버 연결 없이 바로 설치해서 사용 가능. 친구한테 파일 전달하면 됨.

---

### APK 폰에 설치하기

빌드된 APK 파일을 폰으로 전송 후:
- 파일 관리자에서 APK 터치
- **"출처를 알 수 없는 앱 허용"** 설정 후 설치

또는 adb로 바로 설치:
```bash
adb install android/app/build/outputs/apk/release/app-release.apk
```

---

## 백엔드 서버

`src/api/config.ts` 에서 서버 주소를 관리합니다.

```ts
export const BASE_URL = 'http://xx.xx.xx.xx:8080';
```

백엔드 서버 주소가 바뀌면 이 파일만 수정하면 됩니다.

---

## 주요 기술 스택

- React Native (Expo bare workflow)
- TypeScript
- Kakao Maps SDK (지도)
- Kakao Login SDK (소셜 로그인)
- expo-location (GPS)
- react-native-webview
