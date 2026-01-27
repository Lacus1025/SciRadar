#!/bin/bash
echo "正在修复ES模块配置..."

# 备份
cp package.json package.json.backup

# 删除type字段或改为commonjs
if grep -q '"type": "module"' package.json; then
  # 方案A：删除type字段
  sed -i '/"type": "module"/d' package.json
  echo "已删除 type: module"
  
  # 使用CommonJS语法
  cat > postcss.config.js << 'EOL'
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOL
  
  cat > tailwind.config.js << 'EOL'
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
EOL
  
else
  # 方案B：保持ES模块，修复语法
  cat > postcss.config.js << 'EOL'
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOL
  
  cat > tailwind.config.js << 'EOL'
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
EOL
fi

echo "修复完成！"
