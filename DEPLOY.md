# Deploy KaijuMess

## Stack de xuat

- Frontend `Kaijumess`: Vercel
- Backend `Kaijumess-server`: Render
- Database: Render Postgres

Khong can domain rieng. Sau khi deploy ban se co URL dang:

- Frontend: `https://your-app.vercel.app`
- Backend: `https://your-api.onrender.com`

## 1. Day code len GitHub

- Tao repo GitHub
- Push toan bo workspace len repo

## 2. Deploy backend len Render

### Cach nhanh bang Blueprint

- Dang nhap Render
- Chon `New +` -> `Blueprint`
- Chon repo GitHub cua ban
- Render se doc file `render.yaml` o root
- No se tao:
  - database `kaijumess-db`
  - web service `kaijumess-server`

### Env backend can dien them

Sau khi service duoc tao, vao Render dashboard va them/cap nhat:

- `CLIENT_URL=https://your-app.vercel.app`
- `REDIS_URL=...` neu ban muon Redis adapter
- `CLOUDINARY_CLOUD_NAME=...` neu ban dung upload media
- `CLOUDINARY_API_KEY=...`
- `CLOUDINARY_API_SECRET=...`
- `METERED_DOMAIN=...` neu ban dung WebRTC TURN service
- `METERED_API_KEY=...`

### Chay migrations database

Sau khi backend co `DATABASE_URL`, mo Render Shell hoac chay local voi env production roi chay:

```bash
cd Kaijumess-server
npm run migrate
```

Script nay se chay tat ca file `.sql` trong `Kaijumess-server/database/` theo thu tu ten file.

## 3. Deploy frontend len Vercel

- Dang nhap Vercel
- Chon `Add New` -> `Project`
- Chon cung repo GitHub
- Root directory: `Kaijumess`
- Framework: Vite

### Env frontend

Them 2 bien moi truong:

- `VITE_API_BASE_URL=https://your-api.onrender.com`
- `VITE_SOCKET_URL=https://your-api.onrender.com`

File rewrite da duoc them san trong `Kaijumess/vercel.json` de React Router hoat dong dung tren Vercel.

## 4. Noi frontend voi backend

Sau khi frontend co URL public:

- quay lai Render
- sua `CLIENT_URL` thanh URL Vercel that
- redeploy backend

Neu ban co nhieu frontend origins, co the de:

```env
CLIENT_URL=http://localhost:5173,https://your-app.vercel.app
```

Backend da duoc sua de `CORS` va `Socket.io` chap nhan danh sach origins cach nhau boi dau phay.

## 5. Kiem tra sau deploy

- vao frontend URL
- dang ky / dang nhap
- vao chat list
- gui tin nhan
- kiem tra socket connect
- neu co media/call, test them upload va call

## Lenh local huu ich

Frontend:

```bash
cd Kaijumess
npm install
npm run build
```

Backend:

```bash
cd Kaijumess-server
npm install
npm run migrate
npm run start
```

## File da them cho deploy

- `render.yaml`
- `DEPLOY.md`
- `Kaijumess/vercel.json`
- `Kaijumess/.env.example`
- `Kaijumess-server/scripts/run-migrations.js`

Neu ban muon, buoc tiep theo toi co the lam them:

1. tao `netlify.toml` de deploy frontend bang Netlify
2. chuan bi Dockerfile cho backend
3. ra soat env nao la bat buoc/khong bat buoc truoc khi deploy that
