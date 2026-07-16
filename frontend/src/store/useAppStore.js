import { create } from 'zustand'

export const useAppStore = create((set) => ({
  filtro: 'todos',
  setFiltro: (filtro) => set({ filtro }),

  filtroResp: 'todos',
  setFiltroResp: (filtroResp) => set({ filtroResp }),

  curvaFiltro: 'portfolio',
  setCurvaFiltro: (curvaFiltro) => set({ curvaFiltro }),

  curvaResp: 'todos',
  setCurvaResp: (curvaResp) => set({ curvaResp }),

  modalProjeto: null,
  setModalProjeto: (modalProjeto) => set({ modalProjeto }),

  showUpload: false,
  setShowUpload: (showUpload) => set({ showUpload }),

  showSemanal: false,
  setShowSemanal: (showSemanal) => set({ showSemanal }),

  showRelatorio: false,
  setShowRelatorio: (showRelatorio) => set({ showRelatorio }),

  formProjeto: null,
  setFormProjeto: (formProjeto) => set({ formProjeto }),

  ocultarValores: localStorage.getItem('ocultarValores') === '1',
  setOcultarValores: (fnOrVal) => set((state) => {
    const next = typeof fnOrVal === 'function' ? fnOrVal(state.ocultarValores) : fnOrVal
    localStorage.setItem('ocultarValores', next ? '1' : '0')
    return { ocultarValores: next }
  }),
}))
