const ColladaRobotsList = [

  { brand: 'ABB', name: 'IRB 52-7/1.2',     id: 'abb_irb52_7_120',     reach: 1.2,   weight:  250, payload:   7, dof: 6, tipLinks: ['tool0'], dataSheet: 'http://search.abb.com/library/Download.aspx?DocumentID=ROB0037EN&LanguageCode=en&DocumentPartId=&Action=Launch' },
  { brand: 'ABB', name: 'IRB 120-3/0.6',    id: 'abb_irb120_3_58',     reach: 0.58,  weight:   25, payload:   3, dof: 6, tipLinks: ['tool0'], dataSheet: 'http://search.abb.com/library/Download.aspx?DocumentID=ROBO149EN_D&LanguageCode=en&DocumentPartId=2&Action=Launch' },
  { brand: 'ABB', name: 'IRB 1200-5/0.9',   id: 'abb_irb1200_5_90',    reach: 0.901, weight:   54, payload:   5, dof: 6, tipLinks: ['tool0'], dataSheet: 'http://search.abb.com/library/Download.aspx?DocumentID=9AKK106103A6066&LanguageCode=en&DocumentPartId=&Action=Launch' },
  { brand: 'ABB', name: 'IRB 1600-6/1.2',   id: 'abb_irb1600_6_12',    reach: 1.2,   weight:  250, payload:   6, dof: 6, tipLinks: ['tool0'], dataSheet: 'http://search.abb.com/library/Download.aspx?DocumentID=PR10282EN_R8&LanguageCode=en&DocumentPartId=&Action=Launch' },
  { brand: 'ABB', name: 'IRB 2400/10',      id: 'abb_irb2400',         reach: 1.55,  weight:  380, payload:  12, dof: 6, tipLinks: ['tool0'], dataSheet: 'http://search.abb.com/library/Download.aspx?DocumentID=PR10034EN_R7&LanguageCode=en&DocumentPartId=&Action=Launch' },
  { brand: 'ABB', name: 'IRB 2600-12/1.65', id: 'abb_irb2600_12_165',  reach: 1.65,  weight:  272, payload:  12, dof: 6, tipLinks: ['tool0'], dataSheet: 'http://search.abb.com/library/Download.aspx?DocumentID=ROB0142EN_B&LanguageCode=en&DocumentPartId=&Action=Launch' },
  { brand: 'ABB', name: 'IRB 4400L/10',     id: 'abb_irb4400l_30_243', reach: 2.53,  weight: 1040, payload:  10, dof: 6, tipLinks: ['tool0'], dataSheet: 'http://search.abb.com/library/Download.aspx?DocumentID=PR10035EN_R8&LanguageCode=en&DocumentPartId=&Action=Launch' },
  { brand: 'ABB', name: 'IRB 4600-60/2.05', id: 'abb_irb4600_60_205',  reach: 2.05,  weight:  425, payload:  60, dof: 6, tipLinks: ['tool0'], dataSheet: 'http://search.abb.com/library/Download.aspx?DocumentID=ROB0109EN_G&LanguageCode=en&DocumentPartId=&Action=Launch' },
  { brand: 'ABB', name: 'IRB 5400',         id: 'abb_irb5400',         reach: 3.129, weight:  970, payload:  25, dof: 6, tipLinks: ['tool0'], dataSheet: 'http://search.abb.com/library/Download.aspx?DocumentID=PR10269EN&LanguageCode=en&DocumentPartId=&Action=Launch' },
  { brand: 'ABB', name: 'IRB 6640-235',     id: 'abb_irb6640',         reach: 2.55,  weight: 1310, payload: 235, dof: 6, tipLinks: ['tool0'], dataSheet: 'http://search.abb.com/library/Download.aspx?DocumentID=ROB0001EN&LanguageCode=en&DocumentPartId=&Action=Launch' },
  { brand: 'ABB', name: 'IRB 7600-150/3.5', id: 'abb_irb7600_150_350', reach: 3.5,   weight: 2450, payload: 150, dof: 6, tipLinks: ['tool0'], dataSheet: 'http://search.abb.com/library/Download.aspx?DocumentID=PR10074EN_R10&LanguageCode=en&DocumentPartId=&Action=Launch' },

  { brand: 'ANYbotics', name: 'ANYmal', id: 'anybotics_anymal', weight: 30, payload: 10, dof: 12, tipLinks: ['LF_FOOT', 'RF_FOOT', 'LH_FOOT', 'RH_FOOT'], dataSheet: 'https://www.anybotics.com/wp-content/uploads/media/ANYmal_Flyer.pdf' },

  { brand: 'Clearpath', name: 'Dual Arm Husky', id: 'clearpath_dual_arm_husky', tipLinks: ['l_robotiq_fts300_fts_toolside', 'r_robotiq_fts300_fts_toolside'], dof: 12 },

  { brand: 'Franka', name: 'Panda', id: 'franka_panda_arm_hand', tipLinks: ['panda_hand'], payload: 3, reach: 0.855, dof: 7, weight: 18, dataSheet: 'https://s3-eu-central-1.amazonaws.com/franka-de-uploads-staging/uploads/2017/09/2017-09-12_datasheet_panda.pdf', productWebPage: 'https://www.franka.de/' },

  { brand: 'iit', name: 'HyQ',        id: 'iit_hyq',            tipLinks: ['lf_foot', 'rf_foot', 'lh_foot', 'rh_foot'], dof: 12, weight: 80 },
  { brand: 'iit', name: 'iCub v2.5+', id: 'iit_icub_v2_5_plus', tipLinks: ['l_hand', 'r_hand'] },

  { brand: 'KAWADA', name: 'HiroNX', id: 'kawada_hironx', tipLinks: ['LHAND_JOINT0_Link', 'RHAND_JOINT0_Link'] },

  { brand: 'KUKA', name: 'KR 5 arc',         id: 'kuka_kr5_arc',          tipLinks: ['tool0'], payload:   5, reach: 1.412, dof: 6, weight:  127 },
  { brand: 'KUKA', name: 'KR 10 R1100 sixx', id: 'kuka_kr10r1100sixx',    tipLinks: ['tool0'], payload:  10, reach: 1.101, dof: 6, weight:   55, productWebPage: 'https://www.kuka.com/en-gb/products/robotics-systems/industrial-robots/kr-agilus' },
  { brand: 'KUKA', name: 'KR 16-2',          id: 'kuka_kr16_2',           tipLinks: ['tool0'], payload:  16, reach: 1.611, dof: 6, weight:  235, productWebPage: 'https://www.kuka.com/en-gb/products/robotics-systems/industrial-robots/kr-16' },
  { brand: 'KUKA', name: 'KR 120 R2500 pro', id: 'kuka_kr120r2500pro',    tipLinks: ['tool0'], payload: 120, reach: 2.496, dof: 6, weight: 1049, productWebPage: 'https://www.kuka.com/en-gb/products/robotics-systems/industrial-robots/kr-quantec-pro' },
  { brand: 'KUKA', name: 'LBR iiwa 14 R820', id: 'kuka_lbr_iiwa_14_r820', tipLinks: ['tool0'], payload:  14, reach: 0.82,  dof: 7, weight:   30, productWebPage: 'https://www.kuka.com/en-gb/products/robotics-systems/industrial-robots/lbr-iiwa' },

  { brand: 'NASA', name: 'Valkyrie', id: 'nasa_valkyrie', tipLinks: ['leftPalm', 'rightPalm', 'leftFoot', 'rightFoot'], dof: 44, weight: 136 },

  // { brand: 'PAL Robotics', name: 'TALOS', id: 'pal_robotics_talos_full_v2', tipLinks: ['gripper_left_base_link', 'gripper_right_base_link'], dof: 32, weight: 95, dataSheet: 'https://pal-robotics.com/wp-content/uploads/2018/03/Datasheet_TALOS.pdf', productWebPage: 'https://pal-robotics.com/en/products/talos/' },
  { brand: 'PAL Robotics', name: 'TALOS', id: 'pal_robotics_talos_full_v2_no_grippers', tipLinks: ['wrist_left_ft_tool_link', 'wrist_right_ft_tool_link', 'left_sole_link', 'right_sole_link'], dof: 32, weight: 95, dataSheet: 'https://pal-robotics.com/wp-content/uploads/2018/03/Datasheet_TALOS.pdf', productWebPage: 'https://pal-robotics.com/en/products/talos/' },
  { brand: 'PAL Robotics', name: 'TIAGo', id: 'pal_robotics_tiago_titanium', tipLinks: ['wrist_ft_tool_link'], dof: 12, weight: 70, dataSheet: 'https://tiago.pal-robotics.com/wp-content/uploads/2018/03/Datasheet_TIAGo-Hardware-Software.pdf', productWebPage: 'https://tiago.pal-robotics.com/' },

  { brand: 'Unimation', name: 'Puma 560', id: 'unimation_puma560', tipLinks: ['link7'], dof: 6, payload: 4, reach: 0.878, weight: 83 },

  { brand: 'Universal Robots', name: 'UR3',  id: 'universal_robot_ur3',  tipLinks: ['tool0'], payload:  3, reach: 0.5,  dof: 6, weight: 15, dataSheet: 'https://www.universal-robots.com/media/1514546/101081_199901_ur3_technical_details_web_a4_art03_rls_eng.pdf', productWebPage: 'https://www.universal-robots.com/products/ur3-robot/' },
  { brand: 'Universal Robots', name: 'UR5',  id: 'universal_robot_ur5',  tipLinks: ['tool0'], payload:  5, reach: 0.85, dof: 6, weight: 15, dataSheet: 'https://www.universal-robots.com/media/1514597/101081_199901_ur5_technical_details_web_a4_art03_rls_eng.pdf', productWebPage: 'https://www.universal-robots.com/products/ur5-robot/' },
  { brand: 'Universal Robots', name: 'UR10', id: 'ur10_joint_limited_robot', tipLinks: ['tool0'], payload: 10, reach: 1.3,  dof: 6, weight: 17, dataSheet: 'https://www.universal-robots.com/media/1514642/101081_199901_ur10_technical_details_web_a4_art03_rls_eng.pdf', productWebPage: 'https://www.universal-robots.com/products/ur10-robot/' },

]

export default ColladaRobotsList
