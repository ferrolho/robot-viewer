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

    'capability.label': 'Capability',
    'capability.velocityEllipsoid': 'Velocity Ellipsoid',
    'capability.accelEllipsoid': 'Accel. Ellipsoid',
    'capability.forceEllipsoid': 'Force Ellipsoid',
    'capability.forcePolytope': 'Force Polytope',
    'capability.torqueWeighted': 'Torque-weighted',
    'capability.info.title': 'Capability Visualizations',
    'capability.info.velocityTitle': 'Velocity Ellipsoid',
    'capability.info.velocityDesc': 'Shows the set of achievable end-effector velocities assuming unit joint-velocity norm. The shape reveals which Cartesian directions the robot can move fastest in at its current configuration.',
    'capability.info.accelTitle': 'Acceleration Ellipsoid',
    'capability.info.accelDesc': 'Incorporates the joint-space inertia matrix to show achievable end-effector accelerations, normalized to the velocity ellipsoid scale for visual comparison of directional capability.',
    'capability.info.ellipsoidTitle': 'Force Ellipsoid',
    'capability.info.ellipsoidDesc': 'A quadratic (ellipsoidal) approximation of the force polytope. It assumes a 2-norm constraint on joint torques rather than per-joint box constraints, producing a smooth shape that is always inscribed within the polytope.',
    'capability.info.weightedTitle': 'Torque-weighted',
    'capability.info.weightedDesc': 'Scales each Jacobian column by the joint\'s actual torque limit, producing a tighter fit to the polytope. The improvement is most visible on robots with asymmetric torque limits (e.g. large shoulder vs small wrist motors). When all joints have equal torque limits, both modes produce identical results.',
    'capability.info.polytopeTitle': 'Force Polytope',
    'capability.info.polytopeDesc': 'The exact representation of the robot\'s force capability. Maps the joint-torque hypercube through the Jacobian to produce a convex polytope in Cartesian force space, showing all feasible end-effector forces given the joint torque limits.',

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

    'gizmo.local': 'Local',
    'gizmo.world': 'World',
    'gizmo.tooltip.translate': 'Translate (T)',
    'gizmo.tooltip.rotate': 'Rotate (R)',
    'gizmo.tooltip.space': 'Local / World (Q)',

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

    'capability.label': '能力',
    'capability.velocityEllipsoid': '速度楕円体',
    'capability.accelEllipsoid': '加速度楕円体',
    'capability.forceEllipsoid': '力楕円体',
    'capability.forcePolytope': '力ポリトープ',
    'capability.torqueWeighted': 'トルク重み付き',
    'capability.info.title': '能力可視化',
    'capability.info.velocityTitle': '速度楕円体',
    'capability.info.velocityDesc': '単位関節速度ノルムを仮定した場合の達成可能なエンドエフェクタ速度の集合を示します。現在の姿勢でロボットがどのデカルト方向に最も速く動けるかを表します。',
    'capability.info.accelTitle': '加速度楕円体',
    'capability.info.accelDesc': '関節空間の慣性行列を組み込み、達成可能なエンドエフェクタ加速度を示します。方向的能力の視覚的比較のため、速度楕円体のスケールに正規化されています。',
    'capability.info.ellipsoidTitle': '力楕円体',
    'capability.info.ellipsoidDesc': '力ポリトープの二次（楕円体）近似です。関節トルクに対して個別の制約ではなく2ノルム制約を仮定し、常にポリトープ内に内接する滑らかな形状を生成します。',
    'capability.info.weightedTitle': 'トルク重み付き',
    'capability.info.weightedDesc': '各ヤコビアン列を関節の実際のトルク制限でスケーリングし、ポリトープにより近い近似を実現します。改善は非対称なトルク制限を持つロボットで最も顕著です。全関節のトルク制限が等しい場合、両モードは同一の結果を生成します。',
    'capability.info.polytopeTitle': '力ポリトープ',
    'capability.info.polytopeDesc': 'ロボットの力能力の正確な表現です。関節トルクの超立方体をヤコビアンを通してデカルト力空間の凸多面体に写像し、関節トルク制限下の全実現可能力を示します。',

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

    'gizmo.local': 'ローカル',
    'gizmo.world': 'ワールド',
    'gizmo.tooltip.translate': '移動 (T)',
    'gizmo.tooltip.rotate': '回転 (R)',
    'gizmo.tooltip.space': 'ローカル / ワールド (Q)',

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

    'capability.label': '能力',
    'capability.velocityEllipsoid': '速度椭球',
    'capability.accelEllipsoid': '加速度椭球',
    'capability.forceEllipsoid': '力椭球',
    'capability.forcePolytope': '力多面体',
    'capability.torqueWeighted': '扭矩加权',
    'capability.info.title': '能力可视化',
    'capability.info.velocityTitle': '速度椭球',
    'capability.info.velocityDesc': '显示假设单位关节速度范数时可达到的末端执行器速度集合。形状揭示了机器人在当前构型下哪些笛卡尔方向能最快移动。',
    'capability.info.accelTitle': '加速度椭球',
    'capability.info.accelDesc': '结合关节空间惯性矩阵显示可达到的末端执行器加速度，归一化到速度椭球的尺度以便方向能力的视觉比较。',
    'capability.info.ellipsoidTitle': '力椭球',
    'capability.info.ellipsoidDesc': '力多面体的二次（椭球）近似。对关节扭矩假设2-范数约束而非逐关节框约束，生成始终内接于多面体的光滑形状。',
    'capability.info.weightedTitle': '扭矩加权',
    'capability.info.weightedDesc': '按每个关节的实际扭矩限制缩放雅可比矩阵列，使其更紧密地拟合多面体。改进在扭矩限制不对称的机器人上最为明显。当所有关节扭矩限制相等时，两种模式产生相同结果。',
    'capability.info.polytopeTitle': '力多面体',
    'capability.info.polytopeDesc': '机器人力能力的精确表示。将关节扭矩超立方体通过雅可比矩阵映射到笛卡尔力空间的凸多面体，显示关节扭矩限制下所有可行的末端执行器力。',

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

    'gizmo.local': '局部',
    'gizmo.world': '世界',
    'gizmo.tooltip.translate': '平移 (T)',
    'gizmo.tooltip.rotate': '旋转 (R)',
    'gizmo.tooltip.space': '局部 / 世界 (Q)',

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
