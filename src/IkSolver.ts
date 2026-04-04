export const IkSolverEnum = Object.freeze({
  OFF: 0,
  IK: 1,
  GENETIC_ALGORITHM: 2,
  PSEUDO_INVERSE: 3
} as const)

export type IkSolverType = typeof IkSolverEnum[keyof typeof IkSolverEnum]
