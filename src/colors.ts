export const C = {
  bg: '#E5E1E6',
  dark: '#212721',
  magenta: '#910048',
  green: '#708573',
  ocra: '#C6AA76',
  gray: '#6E716F',
  forest: '#3D4D40',
  olive: '#645B3F',
  plum: '#501731',
  silver: '#BDBBBE',
  white: '#FFFFFF',
} as const

export const alpha = (hex: string, a: number) => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${a})`
}
