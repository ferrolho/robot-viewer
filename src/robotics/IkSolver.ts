export const IkSolverEnum = Object.freeze({
  OFF: 0,
  PSEUDO_INVERSE: 3
} as const)

export type IkSolverType = typeof IkSolverEnum[keyof typeof IkSolverEnum]
