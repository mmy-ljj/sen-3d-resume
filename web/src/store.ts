import { create } from 'zustand'

// 全站交互状态：当前展开的领域 / 悬停的领域 / 是否已进入
interface StoreState {
  active: string | null // 当前展开的 domain id（null = 总览）
  hovered: string | null // 悬停的 domain id
  entered: boolean // 是否已通过入场
  characterYaw: number // 手势控制的模型水平转向（度）
  gestureLook: { x: number; y: number } // 手势触发后给眼球的短暂注视偏移
  gestureAim: { x: number; y: number } // 摄像头中手掌的连续注视目标（归一化坐标）
  cinematicFocus: boolean // 是否启用电影感景深
  simulationVisible: boolean // 虚拟仿真背景物件
  setActive: (id: string | null) => void
  setHovered: (id: string | null) => void
  enter: () => void
  rotateCharacter: (delta: number) => void
  resetCharacter: () => void
  setGestureLook: (look: { x: number; y: number }) => void
  setGestureAim: (aim: { x: number; y: number }) => void
  toggleCinematicFocus: () => void
  toggleSimulation: () => void
}

export const useStore = create<StoreState>((set) => ({
  active: null,
  hovered: null,
  entered: false,
  characterYaw: 0,
  gestureLook: { x: 0, y: 0 },
  gestureAim: { x: 0, y: 0 },
  cinematicFocus: true,
  simulationVisible: true,
  setActive: (id) => set({ active: id }),
  setHovered: (id) => set({ hovered: id }),
  enter: () => set({ entered: true }),
  rotateCharacter: (delta) =>
    set((state) => ({ characterYaw: Math.max(-75, Math.min(75, state.characterYaw + delta)) })),
  resetCharacter: () => set({ characterYaw: 0 }),
  setGestureLook: (gestureLook) => set({ gestureLook }),
  setGestureAim: (gestureAim) => set({ gestureAim }),
  toggleCinematicFocus: () => set((state) => ({ cinematicFocus: !state.cinematicFocus })),
  toggleSimulation: () => set((state) => ({ simulationVisible: !state.simulationVisible })),
}))

// 开发期调试钩子：可在 console 用 __store.getState().setActive('ads')
declare global {
  interface Window {
    __store?: typeof useStore
  }
}
if (import.meta.env.DEV) window.__store = useStore
