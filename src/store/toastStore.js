import { create } from 'zustand'

/** Lightweight toast notifications. */
let nextId = 1

export const useToastStore = create((set) => ({
  toasts: [],
  push(toast) {
    const id = nextId++
    const item = { id, tone: 'info', duration: 3800, ...toast }
    set((s) => ({ toasts: [...s.toasts, item].slice(-3) }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), item.duration)
  },
  dismiss(id) {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
  },
}))

/** toast({ title, description, tone: 'success' | 'error' | 'info' | 'warning' }) */
export const toast = (t) => useToastStore.getState().push(t)
