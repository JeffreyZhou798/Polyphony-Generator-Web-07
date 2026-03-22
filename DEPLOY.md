# 部署指南

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器（自动打开浏览器）
npm run dev

# 或使用快速启动脚本（Windows）
start.bat
```

## 生产构建

```bash
# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

## 部署到 Vercel（推荐）

### 方法1：使用 Vercel CLI

```bash
# 安装 Vercel CLI
npm install -g vercel

# 登录
vercel login

# 部署
vercel

# 部署到生产环境
vercel --prod
```

### 方法2：通过 GitHub

1. 将代码推送到 GitHub
2. 访问 https://vercel.com
3. 点击 "Import Project"
4. 选择你的 GitHub 仓库
5. Vercel 会自动检测 Vite 项目并部署

## 部署到 GitHub Pages

```bash
# 1. 构建项目
npm run build

# 2. 进入构建目录
cd dist

# 3. 初始化 git（如果还没有）
git init
git add -A
git commit -m 'deploy'

# 4. 推送到 gh-pages 分支
git push -f git@github.com:你的用户名/你的仓库名.git master:gh-pages

# 5. 在 GitHub 仓库设置中启用 GitHub Pages，选择 gh-pages 分支
```

## 部署到 Netlify

### 方法1：拖拽部署

1. 运行 `npm run build`
2. 访问 https://app.netlify.com/drop
3. 将 `dist` 文件夹拖拽到页面

### 方法2：通过 Git

1. 将代码推送到 GitHub/GitLab
2. 在 Netlify 中连接仓库
3. 构建设置：
   - Build command: `npm run build`
   - Publish directory: `dist`

## 环境要求

- Node.js 16+
- npm 7+

## 注意事项

1. 首次访问需要下载 Magenta.js 模型（约100MB），请确保网络连接良好
2. Service Worker 会缓存模型文件，二次访问速度极快
3. 支持离线使用（首次加载后）
