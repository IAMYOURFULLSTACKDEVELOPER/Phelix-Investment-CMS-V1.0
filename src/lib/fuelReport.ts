import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx'

export interface FuelReportRow {
  dispensed_at: string
  issued_by_name: string
  received_by: string
  depot: string
  quantity_liters: number
}

function cell(text: string, bold = false) {
  return new TableCell({ children: [new Paragraph({ children: [new TextRun({ text, bold })] })] })
}

export async function downloadFuelReportDocx(rows: FuelReportRow[], periodLabel: string) {
  const totalLitres = rows.reduce((s, r) => s + Number(r.quantity_liters), 0)

  const header = new TableRow({
    tableHeader: true,
    children: ['#', 'Date / Time', 'Issued by', 'Received by', 'Depot', 'Litres'].map((h) => cell(h, true))
  })
  const body = rows.map(
    (r, i) =>
      new TableRow({
        children: [
          cell(String(i + 1)),
          cell(new Date(r.dispensed_at).toLocaleString()),
          cell(r.issued_by_name),
          cell(r.received_by),
          cell(r.depot === 'graftons' ? "Grafton's Container Depot" : "Hasting's Depot"),
          cell(Number(r.quantity_liters).toLocaleString())
        ]
      })
  )

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ text: 'PHELIX INVESTMENT', heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER }),
          new Paragraph({ text: 'Fuel Log Report', heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
          new Paragraph({ children: [new TextRun({ text: `Period: ${periodLabel}` })] }),
          new Paragraph({ children: [new TextRun({ text: `Generated: ${new Date().toLocaleString()}` })] }),
          new Paragraph({ children: [new TextRun({ text: `Total logs: ${rows.length}`, bold: true })] }),
          new Paragraph({ children: [new TextRun({ text: `Total fuel dispensed: ${totalLitres.toLocaleString()} L`, bold: true })] }),
          new Paragraph({ text: '' }),
          new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [header, ...body] })
        ]
      }
    ]
  })

  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `fuel_log_report_${new Date().toISOString().slice(0, 10)}.docx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
