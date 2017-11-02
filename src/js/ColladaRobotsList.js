var ColladaRobotsList = [

  { brand: 'ABB', name: 'IRB 52 - 7 / 1.2',   id: 'abb_irb52_7_120',     reach: 1.2,   weight: 250, payload: 7, dof: 6, tipLinks: ['tool0'], dataSheet: 'http://search.abb.com/library/Download.aspx?DocumentID=ROB0037EN&LanguageCode=en&DocumentPartId=&Action=Launch' },
  { brand: 'ABB', name: 'IRB 120 - 3 / 0.6',  id: 'abb_irb120_3_58',     reach: 0.58,  weight:  25, payload: 3, dof: 6, tipLinks: ['tool0'], dataSheet: 'http://search.abb.com/library/Download.aspx?DocumentID=ROBO149EN_D&LanguageCode=en&DocumentPartId=2&Action=Launch' },
  { brand: 'ABB', name: 'IRB 1200 - 5 / 0.9', id: 'abb_irb1200_5_90',    reach: 0.901, weight:  54, payload: 5, dof: 6, tipLinks: ['tool0'], dataSheet: 'http://search.abb.com/library/Download.aspx?DocumentID=9AKK106103A6066&LanguageCode=en&DocumentPartId=&Action=Launch' },
  { brand: 'ABB', name: 'IRB 1600 - 6 / 1.2', id: 'abb_irb1600_6_12',    reach: 1.2, weight:  25, payload: 7, dof: 6, tipLinks: ['tool0'], dataSheet: '' },
  { brand: 'ABB', name: 'IRB 2400', id: 'abb_irb2400',         reach: 1.2, weight:  25, payload: 7, dof: 6, tipLinks: ['tool0'], dataSheet: '' },
  { brand: 'ABB', name: 'IRB 2600', id: 'abb_irb2600_12_165',  reach: 1.2, weight:  25, payload: 7, dof: 6, tipLinks: ['tool0'], dataSheet: '' },
  { brand: 'ABB', name: 'IRB 4400', id: 'abb_irb4400l_30_243', reach: 1.2, weight:  25, payload: 7, dof: 6, tipLinks: ['tool0'], dataSheet: '' },
  { brand: 'ABB', name: 'IRB 4600', id: 'abb_irb4600_60_205',  reach: 1.2, weight:  25, payload: 7, dof: 6, tipLinks: ['tool0'], dataSheet: '' },
  { brand: 'ABB', name: 'IRB 5400', id: 'abb_irb5400',         reach: 1.2, weight:  25, payload: 7, dof: 6, tipLinks: ['tool0'], dataSheet: '' },
  { brand: 'ABB', name: 'IRB 6640', id: 'abb_irb6640',         reach: 1.2, weight:  25, payload: 7, dof: 6, tipLinks: ['tool0'], dataSheet: '' },
  { brand: 'ABB', name: 'IRB 7600', id: 'abb_irb7600_150_350', reach: 1.2, weight:  25, payload: 7, dof: 6, tipLinks: ['tool0'], dataSheet: '' },

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
