import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

export async function gerarRelatorioPDF(projetoNome, elementId) {
  const el = document.getElementById(elementId)
  if (!el) return false

  try {
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#0f172a'
    })
    
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
    pdf.save(`Relatorio-${projetoNome.replace(/\s+/g, '-')}.pdf`)
    return true
  } catch (error) {
    console.error('Erro ao gerar PDF:', error)
    return false
  }
}
