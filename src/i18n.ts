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

    'ik.info.title': 'Inverse Kinematics',
    'ik.info.jacobianTitle': 'The Jacobian',
    'ik.info.jacobianDesc1': 'The Jacobian <span class="math" data-math="J"></span> maps joint velocities to end-effector velocity in Cartesian space:',
    'ik.info.jacobianDesc2': 'Each column of <span class="math" data-math="J"></span> describes how one joint moves the tip. For a revolute joint <span class="math" data-math="i"></span>, the column depends on three quantities: the joint axis <span class="math" data-math="\\mathbf{z}_i"></span> (the direction the joint rotates around), the joint position <span class="math" data-math="\\mathbf{p}_i"></span>, and the tip position <span class="math" data-math="\\mathbf{p}_{\\text{tip}}"></span> \u2014 all in world frame:',
    'ik.info.jacobianDesc3': 'The cross product <span class="math" data-math="\\mathbf{z}_i \\times (\\mathbf{p}_{\\text{tip}} - \\mathbf{p}_i)"></span> gives the linear velocity of the tip due to rotation: the further the tip is from the joint, the larger the effect. For a prismatic joint, the column is simply the axis direction (pure translation, no rotation):',
    'ik.info.solveTitle': 'Solving for Joint Velocities',
    'ik.info.solveDesc1': 'Given a desired tip motion <span class="math" data-math="\\mathbf{e}"></span> (the error between current and target pose), we need joint velocities that achieve it. We use the damped least-squares pseudo-inverse:',
    'ik.info.solveDesc2': 'The damping factor <span class="math" data-math="\\lambda"></span> prevents large joint velocities near singularities, where <span class="math" data-math="J J^\\top"></span> becomes ill-conditioned. The joint velocity update is then:',
    'ik.info.solveDesc3': 'where <span class="math" data-math="\\alpha"></span> is a step-size parameter. This is applied iteratively until the error converges.',
    'ik.info.nullTitle': 'Null-Space Projection',
    'ik.info.nullDesc1': 'When the robot has more joints than task DOFs (e.g. 7 joints for a 6D pose task), the extra freedom forms a <em>null space</em> \u2014 joint motions that don\'t move the tip at all. The null-space projector is:',
    'ik.info.nullDesc2': 'For any joint-space vector <span class="math" data-math="\\mathbf{v}"></span> (e.g. a desired joint velocity), the product <span class="math" data-math="N \\mathbf{v}"></span> strips out everything that would affect the tip, keeping only the component that moves joints without disturbing the end-effector. This allows a secondary objective to be added without interfering with the primary task:',
    'ik.info.limitTitle': 'Limit Avoidance',
    'ik.info.limitDesc1': 'The secondary objective <span class="math" data-math="\\mathbf{q}_{\\text{avoid}}"></span> pushes joints away from their limits. In the comfortable middle of a joint\'s range, no force is applied. Near either limit (outer 25%), a linearly increasing push steers the joint back to safety:',
    'ik.info.limitDesc2': 'where <span class="math" data-math="m = 0.25\\,(q_{\\max} - q_{\\min})"></span> is the margin. Because this is projected through <span class="math" data-math="N"></span>, it can never compromise the primary IK task \u2014 it only uses the leftover degrees of freedom.',
    'ik.info.lockTitle': 'Joint-Limit Locking',
    'ik.info.lockDesc1': 'When a joint reaches its limit and the task gradient <span class="math" data-math="\\mathbf{J}_i^\\top \\mathbf{e}"></span> would push it further, the joint is <em>locked</em>: its Jacobian column is zeroed so the remaining joints absorb the work. The locked joint\'s <span class="math" data-math="\\Delta q"></span> is set to zero after all computations (including null-space), preventing any jitter from competing objectives.',

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

    'ik.info.title': '逆運動学',
    'ik.info.jacobianTitle': 'ヤコビアン',
    'ik.info.jacobianDesc1': 'ヤコビアン <span class="math" data-math="J"></span> は関節速度をデカルト空間のエンドエフェクタ速度に写像します：',
    'ik.info.jacobianDesc2': '<span class="math" data-math="J"></span> の各列は、1つの関節がどのように先端を動かすかを表します。回転関節 <span class="math" data-math="i"></span> の列は3つの量で決まります：関節軸 <span class="math" data-math="\\mathbf{z}_i"></span>（回転する方向）、関節位置 <span class="math" data-math="\\mathbf{p}_i"></span>、先端位置 <span class="math" data-math="\\mathbf{p}_{\\text{tip}}"></span> \u2014 すべてワールドフレームで表します：',
    'ik.info.jacobianDesc3': '外積 <span class="math" data-math="\\mathbf{z}_i \\times (\\mathbf{p}_{\\text{tip}} - \\mathbf{p}_i)"></span> は回転による先端の線速度を表します：先端が関節から遠いほど効果が大きくなります。直動関節の場合、列は単純に軸方向（純粋な並進、回転なし）です：',
    'ik.info.solveTitle': '関節速度の求解',
    'ik.info.solveDesc1': '目標先端運動 <span class="math" data-math="\\mathbf{e}"></span>（現在の姿勢と目標姿勢の誤差）が与えられた場合、それを達成する関節速度が必要です。減衰最小二乗擬似逆行列を使用します：',
    'ik.info.solveDesc2': '減衰係数 <span class="math" data-math="\\lambda"></span> は、<span class="math" data-math="J J^\\top"></span> が悪条件となる特異点付近での大きな関節速度を防ぎます。関節速度の更新は：',
    'ik.info.solveDesc3': '<span class="math" data-math="\\alpha"></span> はステップサイズパラメータです。誤差が収束するまで反復的に適用されます。',
    'ik.info.nullTitle': '零空間射影',
    'ik.info.nullDesc1': 'ロボットのタスク自由度より多くの関節がある場合（例：6D姿勢タスクに7関節）、余分な自由度が<em>零空間</em>を形成します — 先端をまったく動かさない関節運動です。零空間射影子は：',
    'ik.info.nullDesc2': '任意の関節空間ベクトル <span class="math" data-math="\\mathbf{v}"></span>（例：希望する関節速度）に対して、積 <span class="math" data-math="N \\mathbf{v}"></span> は先端に影響する成分をすべて除去し、エンドエフェクタを乱さずに関節を動かす成分のみを残します。これにより、主タスクを妨げることなく副次目標を追加できます：',
    'ik.info.limitTitle': '関節制限回避',
    'ik.info.limitDesc1': '副次目標 <span class="math" data-math="\\mathbf{q}_{\\text{avoid}}"></span> は関節を制限から遠ざけます。関節可動範囲の中間部では力は加えられません。各制限の外側25%付近で、線形に増加する力が関節を安全域に戻します：',
    'ik.info.limitDesc2': '<span class="math" data-math="m = 0.25\\,(q_{\\max} - q_{\\min})"></span> はマージンです。これは <span class="math" data-math="N"></span> を通して射影されるため、主IKタスクを損なうことは決してありません — 残りの自由度のみを使用します。',
    'ik.info.lockTitle': '関節制限ロック',
    'ik.info.lockDesc1': '関節が制限に達し、タスク勾配 <span class="math" data-math="\\mathbf{J}_i^\\top \\mathbf{e}"></span> がさらに押し込もうとする場合、その関節は<em>ロック</em>されます：ヤコビアン列がゼロにされ、残りの関節が仕事を引き受けます。ロックされた関節の <span class="math" data-math="\\Delta q"></span> はすべての計算（零空間を含む）の後にゼロに設定され、競合する目標によるジッターを防ぎます。',

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

    'ik.info.title': '逆运动学',
    'ik.info.jacobianTitle': '雅可比矩阵',
    'ik.info.jacobianDesc1': '雅可比矩阵 <span class="math" data-math="J"></span> 将关节速度映射到笛卡尔空间中的末端执行器速度：',
    'ik.info.jacobianDesc2': '<span class="math" data-math="J"></span> 的每一列描述了一个关节如何移动末端。旋转关节 <span class="math" data-math="i"></span> 的列取决于三个量：关节轴 <span class="math" data-math="\\mathbf{z}_i"></span>（关节旋转的方向）、关节位置 <span class="math" data-math="\\mathbf{p}_i"></span> 和末端位置 <span class="math" data-math="\\mathbf{p}_{\\text{tip}}"></span> \u2014 均在世界坐标系中：',
    'ik.info.jacobianDesc3': '叉积 <span class="math" data-math="\\mathbf{z}_i \\times (\\mathbf{p}_{\\text{tip}} - \\mathbf{p}_i)"></span> 给出旋转产生的末端线速度：末端离关节越远，效果越大。对于棱柱关节，列仅为轴方向（纯平移，无旋转）：',
    'ik.info.solveTitle': '求解关节速度',
    'ik.info.solveDesc1': '给定期望的末端运动 <span class="math" data-math="\\mathbf{e}"></span>（当前位姿与目标位姿之间的误差），我们需要实现它的关节速度。使用阻尼最小二乘伪逆：',
    'ik.info.solveDesc2': '阻尼因子 <span class="math" data-math="\\lambda"></span> 防止在奇异点附近产生过大的关节速度，此时 <span class="math" data-math="J J^\\top"></span> 变得病态。关节速度更新为：',
    'ik.info.solveDesc3': '其中 <span class="math" data-math="\\alpha"></span> 是步长参数。迭代应用直到误差收敛。',
    'ik.info.nullTitle': '零空间投影',
    'ik.info.nullDesc1': '当机器人的关节数多于任务自由度（例如6D位姿任务有7个关节）时，多余的自由度形成<em>零空间</em>——不移动末端的关节运动。零空间投影器为：',
    'ik.info.nullDesc2': '对于任意关节空间向量 <span class="math" data-math="\\mathbf{v}"></span>（例如期望的关节速度），乘积 <span class="math" data-math="N \\mathbf{v}"></span> 去除所有会影响末端的分量，只保留在不干扰末端执行器的情况下移动关节的分量。这允许在不干扰主任务的情况下添加次要目标：',
    'ik.info.limitTitle': '关节限位回避',
    'ik.info.limitDesc1': '次要目标 <span class="math" data-math="\\mathbf{q}_{\\text{avoid}}"></span> 将关节推离其限位。在关节范围的舒适中间区域不施加力。在靠近任一限位的外侧25%处，线性增加的推力将关节引回安全区域：',
    'ik.info.limitDesc2': '其中 <span class="math" data-math="m = 0.25\\,(q_{\\max} - q_{\\min})"></span> 是边距。因为这是通过 <span class="math" data-math="N"></span> 投影的，所以永远不会影响主IK任务——只使用剩余的自由度。',
    'ik.info.lockTitle': '关节限位锁定',
    'ik.info.lockDesc1': '当关节达到其限位且任务梯度 <span class="math" data-math="\\mathbf{J}_i^\\top \\mathbf{e}"></span> 会将其进一步推入时，该关节被<em>锁定</em>：其雅可比列被置零，使其余关节承担工作。锁定关节的 <span class="math" data-math="\\Delta q"></span> 在所有计算（包括零空间）之后被设为零，防止竞争目标产生的抖动。',

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
