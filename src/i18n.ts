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
    'capability.info.velocityDesc1': 'Shows the set of achievable end-effector velocities assuming unit joint-velocity norm. The ellipsoid matrix is:',
    'capability.info.velocityDesc2': 'where <span class="math" data-math="J"></span> is the translational Jacobian. The semi-axes reveal which Cartesian directions the robot can move fastest in.',
    'capability.info.accelTitle': 'Acceleration Ellipsoid',
    'capability.info.accelDesc1': 'Incorporates the joint-space inertia matrix <span class="math" data-math="M(q)"></span> to show achievable end-effector accelerations:',
    'capability.info.accelDesc2': 'Normalized to the velocity ellipsoid scale for visual comparison of directional capability.',
    'capability.info.ellipsoidTitle': 'Force Ellipsoid',
    'capability.info.ellipsoidDesc': 'A quadratic approximation of the force polytope. Three levels of fidelity exist:',
    'capability.info.unweightedTitle': 'Unweighted',
    'capability.info.unweightedDesc1': 'The textbook form, assuming unit joint-torque norm <span class="math" data-math="\\|\\boldsymbol{\\tau}\\|_2 \\leq 1"></span>:',
    'capability.info.unweightedDesc2': 'Shows the pure directional shape of force capability. No torque limit data needed, but the absolute size is not in physical units.',
    'capability.info.rmsTitle': 'RMS-scaled (toggle off)',
    'capability.info.rmsDesc1': 'Scales the unweighted form by <span class="math" data-math="\\tau_\\text{rms} = \\sqrt{\\frac{1}{n}\\sum \\tau_{\\max,i}^2}"></span> to give physically meaningful size:',
    'capability.info.rmsDesc2': 'Assumes all joints share effort equally. The shape is identical to the unweighted version — only the scale changes.',
    'capability.info.weightedTitle': 'Torque-weighted',
    'capability.info.weightedTitle2': 'Torque-weighted (toggle on)',
    'capability.info.weightedDesc1': 'Scales each Jacobian column by the joint\'s actual torque limit <span class="math" data-math="T = \\text{diag}(\\tau_{\\max,i})"></span>, changing both shape and scale:',
    'capability.info.weightedDesc2': 'Produces the tightest ellipsoidal fit to the polytope. The improvement is most visible on robots with asymmetric torque limits. When all joints have equal limits, this reduces to the RMS-scaled version.',
    'capability.info.polytopeTitle': 'Force Polytope',
    'capability.info.polytopeDesc1': 'The exact representation of the robot\'s force capability. Maps each vertex of the joint-torque hypercube <span class="math" data-math="|\\tau_i| \\leq \\tau_{\\max,i}"></span> through the force mapping:',
    'capability.info.polytopeDesc2': 'The convex hull of the resulting <span class="math" data-math="2^n"></span> vertices forms the polytope in Cartesian force space.',

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
    'capability.info.velocityDesc1': '単位関節速度ノルムを仮定した場合の達成可能なエンドエフェクタ速度の集合を示します。楕円体行列は：',
    'capability.info.velocityDesc2': '<span class="math" data-math="J"></span> は並進ヤコビアンです。半軸はロボットがどのデカルト方向に最も速く動けるかを表します。',
    'capability.info.accelTitle': '加速度楕円体',
    'capability.info.accelDesc1': '関節空間の慣性行列 <span class="math" data-math="M(q)"></span> を組み込み、達成可能なエンドエフェクタ加速度を示します：',
    'capability.info.accelDesc2': '方向的能力の視覚的比較のため、速度楕円体のスケールに正規化されています。',
    'capability.info.ellipsoidTitle': '力楕円体',
    'capability.info.ellipsoidDesc': '力ポリトープの二次近似です。3段階の精度があります：',
    'capability.info.unweightedTitle': '非重み付き',
    'capability.info.unweightedDesc1': '単位関節トルクノルム <span class="math" data-math="\\|\\boldsymbol{\\tau}\\|_2 \\leq 1"></span> を仮定した教科書的な形式：',
    'capability.info.unweightedDesc2': '力能力の純粋な方向的形状を示します。トルク制限データ不要ですが、絶対的なサイズは物理単位ではありません。',
    'capability.info.rmsTitle': 'RMSスケーリング（トグルオフ）',
    'capability.info.rmsDesc1': '非重み付き形式を <span class="math" data-math="\\tau_\\text{rms} = \\sqrt{\\frac{1}{n}\\sum \\tau_{\\max,i}^2}"></span> でスケーリングし、物理的に意味のあるサイズにします：',
    'capability.info.rmsDesc2': '全関節が均等に力を分担すると仮定します。形状は非重み付き版と同一で、スケールのみが変化します。',
    'capability.info.weightedTitle': 'トルク重み付き',
    'capability.info.weightedTitle2': 'トルク重み付き（トグルオン）',
    'capability.info.weightedDesc1': '各ヤコビアン列を関節の実際のトルク制限 <span class="math" data-math="T = \\text{diag}(\\tau_{\\max,i})"></span> でスケーリングし、形状とスケールの両方を変更：',
    'capability.info.weightedDesc2': 'ポリトープに最も近い楕円体近似を実現します。非対称なトルク制限を持つロボットで最も顕著です。全関節の制限が等しい場合、RMSスケーリング版と同一になります。',
    'capability.info.polytopeTitle': '力ポリトープ',
    'capability.info.polytopeDesc1': 'ロボットの力能力の正確な表現です。関節トルクの超立方体 <span class="math" data-math="|\\tau_i| \\leq \\tau_{\\max,i}"></span> の各頂点を力写像を通して変換します：',
    'capability.info.polytopeDesc2': '得られた <span class="math" data-math="2^n"></span> 個の頂点の凸包がデカルト力空間のポリトープを形成します。',

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
    'capability.info.velocityDesc1': '显示假设单位关节速度范数时可达到的末端执行器速度集合。椭球矩阵为：',
    'capability.info.velocityDesc2': '其中 <span class="math" data-math="J"></span> 是平移雅可比矩阵。半轴揭示了机器人能最快移动的笛卡尔方向。',
    'capability.info.accelTitle': '加速度椭球',
    'capability.info.accelDesc1': '结合关节空间惯性矩阵 <span class="math" data-math="M(q)"></span> 显示可达到的末端执行器加速度：',
    'capability.info.accelDesc2': '归一化到速度椭球的尺度以便方向能力的视觉比较。',
    'capability.info.ellipsoidTitle': '力椭球',
    'capability.info.ellipsoidDesc': '力多面体的二次近似。存在三个精度等级：',
    'capability.info.unweightedTitle': '非加权',
    'capability.info.unweightedDesc1': '假设单位关节扭矩范数 <span class="math" data-math="\\|\\boldsymbol{\\tau}\\|_2 \\leq 1"></span> 的教科书形式：',
    'capability.info.unweightedDesc2': '显示力能力的纯方向形状。不需要扭矩限制数据，但绝对大小不是物理单位。',
    'capability.info.rmsTitle': 'RMS缩放（开关关闭）',
    'capability.info.rmsDesc1': '用 <span class="math" data-math="\\tau_\\text{rms} = \\sqrt{\\frac{1}{n}\\sum \\tau_{\\max,i}^2}"></span> 缩放非加权形式，给出物理意义的大小：',
    'capability.info.rmsDesc2': '假设所有关节均等分担力。形状与非加权版本相同，仅尺度变化。',
    'capability.info.weightedTitle': '扭矩加权',
    'capability.info.weightedTitle2': '扭矩加权（开关打开）',
    'capability.info.weightedDesc1': '按每个关节的实际扭矩限制 <span class="math" data-math="T = \\text{diag}(\\tau_{\\max,i})"></span> 缩放雅可比矩阵列，同时改变形状和尺度：',
    'capability.info.weightedDesc2': '产生与多面体最紧密的椭球拟合。在扭矩限制不对称的机器人上最为明显。当所有关节限制相等时，退化为RMS缩放版本。',
    'capability.info.polytopeTitle': '力多面体',
    'capability.info.polytopeDesc1': '机器人力能力的精确表示。将关节扭矩超立方体 <span class="math" data-math="|\\tau_i| \\leq \\tau_{\\max,i}"></span> 的每个顶点通过力映射变换：',
    'capability.info.polytopeDesc2': '所得 <span class="math" data-math="2^n"></span> 个顶点的凸包构成笛卡尔力空间中的多面体。',

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
  document.querySelectorAll<HTMLElement>('[data-i18n-html]').forEach(el => {
    el.innerHTML = t(el.dataset.i18nHtml!)
    el.dataset.mathRendered = ''  // reset so KaTeX re-renders after locale change
  })
}
