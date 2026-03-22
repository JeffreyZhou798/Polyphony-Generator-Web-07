# 部署检查清单 / Deployment Checklist

## ✅ 部署前检查 / Pre-Deployment Checklist

### 1. 代码检查 / Code Check
- [x] 所有 TypeScript 文件无编译错误
- [x] 所有依赖已正确安装
- [x] 本地开发服务器运行正常
- [x] 本地构建成功 (`npm run build`)

### 2. 配置文件检查 / Configuration Files Check

#### package.json
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```
- [x] build 脚本正确
- [x] 所有依赖版本兼容

#### vercel.json
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```
- [x] buildCommand 正确
- [x] outputDirectory 设置为 "dist"
- [x] SPA 路由重写规则已配置
- [x] framework 设置为 "vite"

#### vite.config.ts
- [x] base 路径配置正确（默认 '/'）
- [x] build.outDir 设置为 'dist'
- [x] React 插件已配置

### 3. 文件结构检查 / File Structure Check

```
polyphony-web/
├── src/                    ✅ 源代码目录
├── public/                 ✅ 静态资源目录
├── dist/                   ⚠️  构建输出（不提交到 Git）
├── node_modules/           ⚠️  依赖（不提交到 Git）
├── package.json            ✅ 依赖配置
├── vercel.json             ✅ Vercel 配置
├── vite.config.ts          ✅ Vite 配置
├── tsconfig.json           ✅ TypeScript 配置
├── index.html              ✅ 入口 HTML
└── README.md               ✅ 项目文档
```

### 4. .gitignore 检查 / .gitignore Check

确保以下文件/目录被忽略：
```
node_modules/
dist/
.DS_Store
*.log
.env
.env.local
```

## 🚀 Vercel 部署步骤 / Vercel Deployment Steps

### 方法 1: Vercel 控制台部署（推荐）

1. **访问 Vercel**
   - 打开 https://vercel.com/new
   - 使用 GitHub 账号登录

2. **导入项目**
   - 点击 "Import Git Repository"
   - 选择您的 GitHub 仓库
   - 点击 "Import"

3. **配置项目**
   - **Project Name**: `polyphony-web` 或自定义
   - **Framework Preset**: Vite（自动检测）
   - **Root Directory**: **`polyphony-web/`**（重要：选择 polyphony-web 子目录）
   - **Build Command**: `npm run build`（自动检测）
   - **Output Directory**: `dist`（自动检测）
   - **Install Command**: `npm install`（自动检测）

4. **环境变量**（如果需要）
   - 本项目无需环境变量

5. **部署**
   - 点击 "Deploy"
   - 等待构建完成（约 2-5 分钟）
   - 获取部署 URL

### 方法 2: Vercel CLI 部署

```bash
# 1. 安装 Vercel CLI
npm install -g vercel

# 2. 登录
vercel login

# 3. 进入项目目录
cd polyphony-web

# 4. 部署到生产环境
vercel --prod

# 或者先部署到预览环境
vercel
```

## 🔍 部署后验证 / Post-Deployment Verification

### 1. 功能测试 / Functionality Test
- [ ] 页面正常加载
- [ ] 文件上传功能正常
- [ ] 参数调整功能正常
- [ ] 复调生成功能正常
- [ ] 文件下载功能正常
- [ ] 多语言切换正常

### 2. 性能测试 / Performance Test
- [ ] 首次加载时间 < 5秒
- [ ] Magenta 模型加载正常
- [ ] Service Worker 缓存工作正常

### 3. 兼容性测试 / Compatibility Test
- [ ] Chrome 浏览器正常
- [ ] Edge 浏览器正常
- [ ] Firefox 浏览器正常
- [ ] Safari 浏览器正常
- [ ] 移动端浏览器正常

### 4. 错误检查 / Error Check
- [ ] 控制台无错误
- [ ] 网络请求正常
- [ ] 404 页面正确处理（SPA 路由）

## 📊 Vercel 配置说明 / Vercel Configuration Details

### 自动检测的配置
Vercel 会自动检测以下配置：
- ✅ Framework: Vite
- ✅ Build Command: `npm run build`
- ✅ Output Directory: `dist`
- ✅ Install Command: `npm install`
- ✅ Node.js Version: 18.x（默认）

### vercel.json 的作用
- **buildCommand**: 覆盖默认构建命令
- **outputDirectory**: 指定构建输出目录
- **framework**: 明确指定框架类型
- **rewrites**: SPA 路由重写规则（所有路由指向 index.html）

### 为什么需要指定 Root Directory 为 `polyphony-web/`
- 项目是作为子目录部署的
- `package.json` 在 `polyphony-web/` 目录
- `index.html` 在 `polyphony-web/` 目录
- Vercel 需要明确知道项目的根目录是 `polyphony-web/`

## 🐛 常见问题 / Common Issues

### 问题 1: 404 错误
**原因**: SPA 路由未正确配置
**解决**: 确保 `vercel.json` 中有 rewrites 规则

### 问题 2: 构建失败
**原因**: 依赖安装失败或构建命令错误
**解决**: 
- 检查 `package.json` 中的 build 脚本
- 本地运行 `npm run build` 测试

### 问题 3: 静态资源 404
**原因**: 资源路径错误
**解决**: 
- 确保 `vite.config.ts` 中 base 设置正确
- 检查 public 目录中的文件

### 问题 4: Magenta 模型加载失败
**原因**: CDN 访问问题或网络问题
**解决**: 
- 检查浏览器控制台错误
- 确保 Vercel 部署的域名可访问

## 📝 部署后更新 / Post-Deployment Updates

### 自动部署
- 推送到 GitHub main 分支会自动触发 Vercel 部署
- 每次提交都会创建预览部署
- 合并到 main 分支会部署到生产环境

### 手动部署
```bash
# 部署到生产环境
vercel --prod

# 部署到预览环境
vercel
```

### 回滚部署
- 在 Vercel 控制台中选择之前的部署
- 点击 "Promote to Production"

## ✅ 最终检查清单 / Final Checklist

部署前确认：
- [x] 代码已提交到 GitHub
- [x] 本地构建成功
- [x] vercel.json 配置正确
- [x] .gitignore 配置正确
- [x] README.md 已更新

部署后确认：
- [ ] 部署成功
- [ ] 所有功能正常
- [ ] 性能良好
- [ ] 无控制台错误

---

## 🔗 相关链接 / Related Links

- **Vercel 文档**: https://vercel.com/docs
- **Vite 文档**: https://vitejs.dev/
- **项目仓库**: https://github.com/JeffreyZhou798/Polyphony-Generator-Web-03

---

**创建日期**: 2026-03-20
**最后更新**: 2026-03-20
