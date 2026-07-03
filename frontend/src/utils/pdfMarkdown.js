// Gera PDF a partir de um elemento DOM já renderizado (mesmo padrão do Relatorio.jsx).
export async function baixarPdfDeElemento(elemento, nomeArquivo) {
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ])
  const canvas = await html2canvas(elemento, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
  const imgData = canvas.toDataURL('image/jpeg', 0.95)

  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const imgW = pageW
  const imgH = (canvas.height * imgW) / canvas.width

  let restante = imgH
  let posY = 0
  pdf.addImage(imgData, 'JPEG', 0, posY, imgW, imgH)
  restante -= pageH
  while (restante > 0) {
    posY = restante - imgH
    pdf.addPage()
    pdf.addImage(imgData, 'JPEG', 0, posY, imgW, imgH)
    restante -= pageH
  }

  pdf.save(nomeArquivo)
}
