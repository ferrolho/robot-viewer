export type Locale = 'en' | 'ja' | 'zh'

export const LOCALES: { code: Locale; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'ja', label: 'JA' },
  { code: 'zh', label: '中文' },
]

const translations: Record<Locale, Record<string, string>> = {
  en: {
    'app.title': 'Robot Explorer',

    'models.label': 'Models',
    'models.search': 'Search robots...',
    'models.count.one': '1 model',
    'models.count.other': '{n} models',
    'results.count.one': '1 result',
    'results.count.other': '{n} results',

    'settings.title': 'Settings',

    'display.label': 'Display',
    'display.grid': 'Grid',
    'display.axis': 'Axis',
    'display.shadows': 'Shadows',
    'display.performance': 'Performance',

    'controls.label': 'Controls',
    'controls.home': 'Home',
    'controls.random': 'Random',
    'controls.reachability': 'Reachability',
    'controls.clearPoints': 'Clear Points',

    'solvers.label': 'Solvers',
    'solvers.ik': 'Inverse Kinematics',

    'ellipsoids.label': 'Ellipsoids',
    'ellipsoids.velocity': 'Velocity',
    'ellipsoids.force': 'Force',
    'ellipsoids.acceleration': 'Acceleration',
    'ellipsoids.acceleration.title': 'Requires inertia computation (not yet implemented)',

    'shortcuts.button': 'Shortcuts',
    'shortcuts.title': 'Keyboard Shortcuts',
    'shortcuts.help': 'Show this help',
    'shortcuts.translate': 'IK gizmo: translate mode',
    'shortcuts.rotate': 'IK gizmo: rotate mode',
    'shortcuts.frame': 'Toggle local / world frame',
    'shortcuts.record': 'Record motion keypoint',
    'shortcuts.play': 'Play recorded keypoints',
    'shortcuts.clear': 'Clear motion keypoints',
    'shortcuts.export': 'Export convex hull as STL',

    'hud.model': 'Model',
    'hud.brand': 'Brand',
    'hud.reach': 'Reach',
    'hud.payload': 'Payload',
    'hud.dof': 'DOF',

    'loader.message': 'Loading robot model...',

    'category.arm': 'Arm',
    'category.dual_arm': 'Dual Arm',
    'category.hand': 'Hand',
    'category.quadruped': 'Quadruped',
    'category.biped': 'Biped',
    'category.humanoid': 'Humanoid',
    'category.mobile': 'Mobile',
    'category.wheeled': 'Wheeled',
    'category.drone': 'Drone',

    'aria.language': 'Change language',
    'aria.toggleTheme': 'Toggle theme',
    'aria.collapseSidebar': 'Collapse sidebar',
    'aria.toggleMenu': 'Toggle menu',
    'aria.toggleSettings': 'Toggle settings',
    'aria.collapseSettings': 'Collapse settings',
    'aria.shortcuts': 'Keyboard shortcuts',
    'aria.gizmoTranslate': 'Translate mode',
    'aria.gizmoRotate': 'Rotate mode',
    'aria.gizmoSpace': 'Toggle local / world frame',
    'aria.close': 'Close',
  },
  ja: {
    'app.title': 'ロボットエクスプローラ',

    'models.label': 'モデル',
    'models.search': 'ロボットを検索...',
    'models.count.one': '1 モデル',
    'models.count.other': '{n} モデル',
    'results.count.one': '1 件',
    'results.count.other': '{n} 件',

    'settings.title': '設定',

    'display.label': '表示',
    'display.grid': 'グリッド',
    'display.axis': '軸',
    'display.shadows': '影',
    'display.performance': 'パフォーマンス',

    'controls.label': '操作',
    'controls.home': 'ホーム',
    'controls.random': 'ランダム',
    'controls.reachability': '可動域',
    'controls.clearPoints': 'クリア',

    'solvers.label': 'ソルバー',
    'solvers.ik': '逆運動学',

    'ellipsoids.label': '楕円体',
    'ellipsoids.velocity': '速度',
    'ellipsoids.force': '力',
    'ellipsoids.acceleration': '加速度',
    'ellipsoids.acceleration.title': '慣性計算が必要（未実装）',

    'shortcuts.button': 'ショートカット',
    'shortcuts.title': 'キーボードショートカット',
    'shortcuts.help': 'ヘルプを表示',
    'shortcuts.translate': 'IKギズモ：移動モード',
    'shortcuts.rotate': 'IKギズモ：回転モード',
    'shortcuts.frame': 'ローカル / ワールド座標切替',
    'shortcuts.record': 'モーションキーポイント記録',
    'shortcuts.play': 'キーポイント再生',
    'shortcuts.clear': 'モーションキーポイント消去',
    'shortcuts.export': '凸包をSTLでエクスポート',

    'hud.model': 'モデル',
    'hud.brand': 'ブランド',
    'hud.reach': 'リーチ',
    'hud.payload': '可搬質量',
    'hud.dof': '自由度',

    'loader.message': 'ロボットモデルを読み込み中...',

    'category.arm': 'アーム',
    'category.dual_arm': 'デュアルアーム',
    'category.hand': 'ハンド',
    'category.quadruped': '四足歩行',
    'category.biped': '二足歩行',
    'category.humanoid': 'ヒューマノイド',
    'category.mobile': 'モバイル',
    'category.wheeled': '車輪型',
    'category.drone': 'ドローン',

    'aria.language': '言語変更',
    'aria.toggleTheme': 'テーマ切替',
    'aria.collapseSidebar': 'サイドバーを閉じる',
    'aria.toggleMenu': 'メニュー切替',
    'aria.toggleSettings': '設定切替',
    'aria.collapseSettings': '設定を閉じる',
    'aria.shortcuts': 'キーボードショートカット',
    'aria.gizmoTranslate': '移動モード',
    'aria.gizmoRotate': '回転モード',
    'aria.gizmoSpace': 'ローカル / ワールド座標切替',
    'aria.close': '閉じる',
  },
  zh: {
    'app.title': '机器人探索器',

    'models.label': '模型',
    'models.search': '搜索机器人...',
    'models.count.one': '1 个模型',
    'models.count.other': '{n} 个模型',
    'results.count.one': '1 个结果',
    'results.count.other': '{n} 个结果',

    'settings.title': '设置',

    'display.label': '显示',
    'display.grid': '网格',
    'display.axis': '坐标轴',
    'display.shadows': '阴影',
    'display.performance': '性能',

    'controls.label': '控制',
    'controls.home': '初始位',
    'controls.random': '随机',
    'controls.reachability': '可达域',
    'controls.clearPoints': '清除点',

    'solvers.label': '求解器',
    'solvers.ik': '逆运动学',

    'ellipsoids.label': '椭球体',
    'ellipsoids.velocity': '速度',
    'ellipsoids.force': '力',
    'ellipsoids.acceleration': '加速度',
    'ellipsoids.acceleration.title': '需要惯性计算（尚未实现）',

    'shortcuts.button': '快捷键',
    'shortcuts.title': '键盘快捷键',
    'shortcuts.help': '显示帮助',
    'shortcuts.translate': 'IK控件：平移模式',
    'shortcuts.rotate': 'IK控件：旋转模式',
    'shortcuts.frame': '切换局部/世界坐标系',
    'shortcuts.record': '记录运动关键点',
    'shortcuts.play': '播放关键点',
    'shortcuts.clear': '清除运动关键点',
    'shortcuts.export': '导出凸包为STL',

    'hud.model': '模型',
    'hud.brand': '品牌',
    'hud.reach': '臂展',
    'hud.payload': '负载',
    'hud.dof': '自由度',

    'loader.message': '正在加载机器人模型...',

    'category.arm': '机械臂',
    'category.dual_arm': '双臂',
    'category.hand': '灵巧手',
    'category.quadruped': '四足',
    'category.biped': '双足',
    'category.humanoid': '人形',
    'category.mobile': '移动',
    'category.wheeled': '轮式',
    'category.drone': '无人机',

    'aria.language': '切换语言',
    'aria.toggleTheme': '切换主题',
    'aria.collapseSidebar': '收起侧栏',
    'aria.toggleMenu': '切换菜单',
    'aria.toggleSettings': '切换设置',
    'aria.collapseSettings': '收起设置',
    'aria.shortcuts': '键盘快捷键',
    'aria.gizmoTranslate': '平移模式',
    'aria.gizmoRotate': '旋转模式',
    'aria.gizmoSpace': '切换局部/世界坐标系',
    'aria.close': '关闭',
  },
}

let currentLocale: Locale = (localStorage.getItem('locale') as Locale) || 'en'

export function getLocale(): Locale {
  return currentLocale
}

export function t(key: string, params?: Record<string, string | number>): string {
  let value = translations[currentLocale][key] ?? translations.en[key] ?? key
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      value = value.replace(`{${k}}`, String(v))
    }
  }
  return value
}

export function setLocale(locale: Locale) {
  currentLocale = locale
  localStorage.setItem('locale', locale)
  document.documentElement.setAttribute('lang', locale)
  applyTranslations()
}

export function applyTranslations() {
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n!)
  })
  document.querySelectorAll<HTMLInputElement>('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder!)
  })
  document.querySelectorAll<HTMLElement>('[data-i18n-aria-label]').forEach(el => {
    el.setAttribute('aria-label', t(el.dataset.i18nAriaLabel!))
  })
  document.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach(el => {
    el.title = t(el.dataset.i18nTitle!)
  })
}
