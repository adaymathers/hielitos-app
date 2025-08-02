// Utilidad para exportar un historial de ventas a PDF usando jsPDF

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Utilidad mejorada para exportar historial de ventas a PDF con diseño atractivo
export function exportarHistorialVentasPDF({ orden, historial, totales }) {
  const doc = new jsPDF();
  // Encabezado atractivo
  doc.setFillColor(41, 128, 185);
  doc.rect(0, 0, 210, 30, 'F');
  doc.setTextColor(255,255,255);
  doc.setFontSize(20);
  doc.text("REPORTE DE VENTAS", 105, 18, { align: "center" });
  doc.setFontSize(10);
  doc.text("Hielitos App", 200, 10, { align: "right" });
  doc.setTextColor(0,0,0);
  doc.setFontSize(12);

  let y = 36;
  // Datos generales de la orden (si existe)
  let miniatura = null;
  let miniaturaTipo = 'JPEG';
  if (orden) {
    // Buscar imagen en orden, orden.receta, o historial
    if (orden.imageBase64 && orden.imageBase64.startsWith("data:image")) {
      miniatura = orden.imageBase64;
    } else if (orden.receta && orden.receta.imageBase64 && orden.receta.imageBase64.startsWith("data:image")) {
      miniatura = orden.receta.imageBase64;
    } else if (historial && historial.length > 0) {
      // Buscar en historial alguna venta con imageBase64
      const ventaConImg = historial.find(v => v.imageBase64 && v.imageBase64.startsWith("data:image"));
      if (ventaConImg) miniatura = ventaConImg.imageBase64;
    }
    if (miniatura && miniatura.startsWith("data:image/png")) miniaturaTipo = 'PNG';
    // Mostrar datos generales en una sola fila tipo tabla
    autoTable(doc, {
      startY: y,
      head: [["Receta", "Lotes", "Fecha", "Costo producción"]],
      body: [[
        orden.recetaNombre || '-',
        orden.lotes,
        orden.fecha && orden.fecha.toDate ? orden.fecha.toDate().toLocaleString() : '-',
        `$${(orden.costoTotal || 0).toFixed(2)}`
      ]],
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 11 },
      margin: { left: 10, right: miniatura ? 70 : 10 },
      tableWidth: miniatura ? 120 : 'auto',
    });
    // Si hay miniatura, mostrarla alineada a la derecha de los datos generales
    if (miniatura && miniatura.startsWith("data:image")) {
      doc.addImage(miniatura, miniaturaTipo, 145, y + 2, 50, 36);
    }
    y = doc.lastAutoTable.finalY + 8;
  }

  // Tabla de historial de ventas
  doc.setFont(undefined, 'bold');
  doc.text("Historial de ventas:", 10, y);
  doc.setFont(undefined, 'normal');
  y += 4;
  if (!historial || historial.length === 0) {
    doc.text("No hay ventas registradas.", 10, y + 8);
    y += 12;
  } else {
    autoTable(doc, {
      startY: y + 2,
      head: [["#", "Fecha", "Vendidos", "Estropeados", "Precio ($)", "Comentarios"]],
      body: historial.map((v, i) => [
        i + 1,
        v.fecha && v.fecha.toDate ? v.fecha.toDate().toLocaleString() : "-",
        v.cantidadVendida,
        v.cantidadEstropeada,
        v.precioVenta,
        v.comentarios || "-"
      ]),
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 10 },
      margin: { left: 10, right: 10 },
    });
    y = doc.lastAutoTable.finalY + 6;
  }


  // Totales y rentabilidad en una sola fila tipo tabla
  autoTable(doc, {
    startY: y,
    head: [[
      "Total vendidos",
      "Total estropeados",
      "Total ingresos ($)",
      "Costo producción ($)",
      "Rentabilidad ($)"
    ]],
    body: [[
      totales.totalVendidos,
      totales.totalEstropeados,
      totales.totalIngresos.toFixed(2),
      totales.costoProduccion.toFixed(2),
      totales.rentabilidad.toFixed(2)
    ]],
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 11 },
    margin: { left: 10, right: 10 },
  });
  y = doc.lastAutoTable.finalY + 6;

  // Pie de página
  doc.setFontSize(10);
  doc.text("Generado por Hielitos App", 10, 290);

  // Abrir el PDF en una nueva pestaña en vez de descargar automáticamente
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, '_blank');
  setTimeout(() => URL.revokeObjectURL(pdfUrl), 10000);
}
