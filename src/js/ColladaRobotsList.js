var ColladaRobotsList = [

  { brand: 'ABB', name: 'IRB 52',   id: 'abb_irb52_7_120',     tipLinks: ['tool0'] },
  { brand: 'ABB', name: 'IRB 120',  id: 'abb_irb120_3_58',     tipLinks: ['tool0'] },
  { brand: 'ABB', name: 'IRB 1200', id: 'abb_irb1200_5_90',    tipLinks: ['tool0'] },
  { brand: 'ABB', name: 'IRB 1600', id: 'abb_irb1600_6_12',    tipLinks: ['tool0'] },
  { brand: 'ABB', name: 'IRB 2400', id: 'abb_irb2400',         tipLinks: ['tool0'] },
  { brand: 'ABB', name: 'IRB 2600', id: 'abb_irb2600_12_165',  tipLinks: ['tool0'] },
  { brand: 'ABB', name: 'IRB 4400', id: 'abb_irb4400l_30_243', tipLinks: ['tool0'] },
  { brand: 'ABB', name: 'IRB 4600', id: 'abb_irb4600_60_205',  tipLinks: ['tool0'] },
  { brand: 'ABB', name: 'IRB 5400', id: 'abb_irb5400',         tipLinks: ['tool0'] },
  { brand: 'ABB', name: 'IRB 6640', id: 'abb_irb6640',         tipLinks: ['tool0'] },
  { brand: 'ABB', name: 'IRB 7600', id: 'abb_irb7600_150_350', tipLinks: ['tool0'] },

  { brand: 'Clearpath', name: 'Dual Arm Husky', id: 'clearpath_dual_arm_husky', tipLinks: [] },

  { brand: 'KAWADA', name: 'HiroNX', id: 'kawada_hironx', tipLinks: ['LHAND_JOINT0_Link', 'RHAND_JOINT0_Link'] },

  { brand: 'KUKA', name: 'KR 5 arc',         id: 'kuka_kr5_arc',          tipLinks: ['tool0'] },
  { brand: 'KUKA', name: 'KR 10 R1100 sixx', id: 'kuka_kr10r1100sixx',    tipLinks: ['tool0'] },
  { brand: 'KUKA', name: 'KR 16-2',          id: 'kuka_kr16_2',           tipLinks: ['tool0'] },
  { brand: 'KUKA', name: 'KR 120 R2500 pro', id: 'kuka_kr120r2500pro',    tipLinks: ['tool0'] },
  { brand: 'KUKA', name: 'LBR iiwa 14 R820', id: 'kuka_lbr_iiwa_14_r820', tipLinks: ['tool0'] },

  { brand: 'NASA', name: 'Valkyrie', id: 'nasa_valkyrie', tipLinks: ['leftPalm', 'rightPalm', 'leftFoot', 'rightFoot'] },

  { brand: 'Universal', name: 'UR3',  id: 'universal_robot_ur3',  tipLinks: ['tool0'] },
  { brand: 'Universal', name: 'UR5',  id: 'universal_robot_ur5',  tipLinks: ['tool0'] },
  { brand: 'Universal', name: 'UR10', id: 'universal_robot_ur10', tipLinks: ['tool0'] },

]

if (typeof module === 'object') {
  module.exports = ColladaRobotsList
}
