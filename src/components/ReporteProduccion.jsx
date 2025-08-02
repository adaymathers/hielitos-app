import { useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { collection, addDoc, Timestamp, getDocs, query, orderBy, deleteDoc } from "firebase/firestore";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

// Puedes cambiar este valor por el usuario real si tienes autenticación
const USUARIO_ACTUAL = "Alexander Alvarez";

const ReporteProduccion = ({ recetas }) => {
  // Eliminar un reporte de producción
  const handleEliminarReporte = async (id) => {
    const confirmar = window.confirm("¿Seguro que deseas eliminar este reporte de producción?");
    if (!confirmar) return;
    try {
      await deleteDoc(doc(db, "ordenesProduccion", id));
      setHistorial(historialActual => historialActual.filter(r => r.id !== id));
    } catch (error) {
      alert("Error al eliminar el reporte");
    }
  };
  const [recetaSeleccionada, setRecetaSeleccionada] = useState(null);
  const [lotes, setLotes] = useState(1);
  const [hielitosPorLote, setHielitosPorLote] = useState(15);
  const [ingredientes, setIngredientes] = useState([]);
  const [gastosExtra, setGastosExtra] = useState("");
  const [tiempo, setTiempo] = useState("");
  const [historial, setHistorial] = useState([]);
  // Estado para edición de lotes/hielitosPorLote en el historial
  const [editHistorial, setEditHistorial] = useState({});
  // Consultar historial de reportes de producción al montar el componente
  useEffect(() => {
    const obtenerHistorial = async () => {
      try {
        const q = query(collection(db, "ordenesProduccion"), orderBy("fecha", "desc"));
        const snapshot = await getDocs(q);
        const reportes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setHistorial(reportes);
        // Inicializar editHistorial para todos los reportes
        const editObj = {};
        reportes.forEach(r => {
          editObj[r.id] = {
            lotes: typeof r.lotes === 'number' ? r.lotes : Number(r.lotes) || 1,
            hielitosPorLote: typeof r.hielitosPorLote === 'number' ? r.hielitosPorLote : Number(r.hielitosPorLote) || 15
          };
        });
        setEditHistorial(editObj);
      } catch (error) {
        console.error("Error al obtener historial de reportes:", error);
      }
    };
    obtenerHistorial();
  }, []);

  useEffect(() => {
    if (recetaSeleccionada) {
      // Clonar ingredientes para permitir edición de precios unitarios
      setIngredientes(
        recetaSeleccionada.ingredientes.map(ing => ({ ...ing }))
      );
    }
  }, [recetaSeleccionada]);

  // Reset hielitosPorLote when selecting a new recipe
  useEffect(() => {
    setHielitosPorLote(15);
  }, [recetaSeleccionada]);

  const handlePrecioChange = (idx, nuevoPrecio) => {
    setIngredientes(ings =>
      ings.map((ing, i) =>
        i === idx ? { ...ing, precioUnitario: parseFloat(nuevoPrecio) || 0 } : ing
      )
    );
  };

  const handleGuardarReporte = async () => {
    if (!recetaSeleccionada) return alert("Selecciona una receta");
    // Multiplicar ingredientes por lotes
    const ingredientesMultiplicados = ingredientes.map(ing => ({
      ...ing,
      cantidad: Number(ing.cantidad) * lotes,
      precioUnitario: Number(ing.precioUnitario)
    }));
    // Calcular costos
    const costoIngredientesLote = ingredientes.reduce((acc, ing) => acc + (Number(ing.cantidad) * Number(ing.precioUnitario)), 0);
    const costoIngredientesTotal = costoIngredientesLote * lotes;
    const gastos = parseFloat(gastosExtra) || 0;
    const costoTotal = costoIngredientesTotal + gastos;
    try {
      const docRef = await addDoc(collection(db, "ordenesProduccion"), {
        recetaId: recetaSeleccionada.id,
        recetaNombre: recetaSeleccionada.nombre,
        lotes,
        hielitosPorLote,
        ingredientes: ingredientesMultiplicados,
        gastosExtra: gastos,
        tiempo: parseFloat(tiempo) || 0,
        costoPorLote: costoIngredientesLote + gastos / lotes,
        costoTotal,
        fecha: Timestamp.now(),
        imageBase64: recetaSeleccionada?.imageBase64 || null,
      });
      alert("Reporte guardado correctamente");
      // Refrescar historial después de guardar
      const q = query(collection(db, "ordenesProduccion"), orderBy("fecha", "desc"));
      const snapshot = await getDocs(q);
      const reportes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHistorial(reportes);
      // Inicializar editHistorial para edición inline
      const editObj = {};
      reportes.forEach(r => {
        editObj[r.id] = {
          lotes: r.lotes,
          hielitosPorLote: r.hielitosPorLote || 15
        };
      });
      setEditHistorial(editObj);
      // Generar PDF automáticamente del último reporte guardado
      const nuevoReporte = reportes.find(r => r.id === docRef.id);
      if (nuevoReporte) {
        await handleGenerarPDF(nuevoReporte);
      }
      // Opcional: limpia el formulario o navega a otra sección
    } catch (error) {
      alert("Error al guardar el reporte");
    }
  };

  // Generar PDF de un reporte (puede ser el actual o uno del historial)
  const handleGenerarPDF = async (reporte = null) => {
    // Buscar la receta original para obtener la foto si no está en el reporte
    let recetaFoto = null;
    if (reporte && !reporte.imageBase64 && reporte.recetaId) {
      const receta = recetas.find(r => r.id === reporte.recetaId);
      recetaFoto = receta?.imageBase64 || null;
    }
    // Si es del historial, los ingredientes ya están multiplicados
    let data = reporte || {
      recetaNombre: recetaSeleccionada?.nombre,
      lotes,
      hielitosPorLote: data.hielitosPorLote || 15,
      ingredientes: ingredientes.map(ing => ({
        ...ing,
        cantidad: Number(ing.cantidad) * lotes
      })),
      gastosExtra,
      tiempo,
      fecha: new Date(),
      id: null,
      imageBase64: recetaSeleccionada?.imageBase64 || null,
      usuario: USUARIO_ACTUAL,
    };
    if (!data.recetaNombre) return alert("No hay datos para generar el PDF");
    const doc = new jsPDF();
    // Encabezado atractivo
    doc.setFillColor(41, 128, 185);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255,255,255);
    doc.setFontSize(20);
    doc.text("ORDEN DE PRODUCCIÓN", 105, 18, { align: "center" });
    doc.setFontSize(10);
    doc.text("Hielitos App", 200, 10, { align: "right" });
    doc.setTextColor(0,0,0);
    doc.setFontSize(12);
    // Número de orden y datos generales (en negritas los campos)
    doc.setFont(undefined, 'bold');
    doc.text('N° de Orden:', 10, 38);
    doc.setFont(undefined, 'normal');
    doc.text(`${data.id || '-'}`, 45, 38);

    doc.setFont(undefined, 'bold');
    doc.text('Usuario:', 10, 46);
    doc.setFont(undefined, 'normal');
    doc.text(`${data.usuario || USUARIO_ACTUAL}`, 45, 46);

    doc.setFont(undefined, 'bold');
    doc.text('Fecha:', 10, 54);
    doc.setFont(undefined, 'normal');
    doc.text(`${data.fecha && data.fecha.toDate ? data.fecha.toDate().toLocaleString() : (data.fecha?.toLocaleString?.() || '-')}`, 45, 54);

    doc.setFont(undefined, 'bold');
    doc.text('Receta:', 10, 62);
    doc.setFont(undefined, 'normal');
    doc.text(`${data.recetaNombre}`, 45, 62);

    doc.setFont(undefined, 'bold');
    doc.text('Lotes:', 10, 70);
    doc.setFont(undefined, 'normal');
    doc.text(`${data.lotes}`, 45, 70);

    // Calcular costos
    const costoIngredientesLote = (data.ingredientes || []).reduce((acc, ing) => acc + (Number(ing.cantidad) * Number(ing.precioUnitario)), 0) / (data.lotes || 1);
    const costoIngredientesTotal = costoIngredientesLote * (data.lotes || 1);
    const gastos = Number(data.gastosExtra || 0);
    const costoTotal = costoIngredientesTotal + gastos;

    doc.setFont(undefined, 'bold');
    doc.text('Costo por lote:', 10, 78);
    doc.setFont(undefined, 'normal');
    doc.text(`$${costoIngredientesLote.toFixed(2)}`, 45, 78);

    doc.setFont(undefined, 'bold');
    doc.text('Costo total:', 10, 86);
    doc.setFont(undefined, 'normal');
    doc.text(`$${costoTotal.toFixed(2)}`, 45, 86);

    doc.setFont(undefined, 'bold');
    doc.text('Gastos extra:', 10, 94);
    doc.setFont(undefined, 'normal');
    doc.text(`$${data.gastosExtra}`, 45, 94);

    doc.setFont(undefined, 'bold');
    doc.text('Tiempo invertido:', 10, 102);
    doc.setFont(undefined, 'normal');
    doc.text(`${data.tiempo} min`, 45, 102);

    // Fotografía del producto (si existe) - ahora en el cuerpo
    let fotoBase64 = null;
    let fotoTipo = 'JPEG';
    if (data.imageBase64) {
      if (data.imageBase64.startsWith("data:image")) {
        fotoBase64 = data.imageBase64;
        if (data.imageBase64.startsWith("data:image/png")) {
          fotoTipo = 'PNG';
        }
      }
    } else if (recetaFoto && recetaFoto.startsWith("data:image")) {
      fotoBase64 = recetaFoto;
      if (recetaFoto.startsWith("data:image/png")) {
        fotoTipo = 'PNG';
      }
    }
    let yImg = 110;
    if (fotoBase64) {
      doc.setFont(undefined, 'bold');
      doc.text("Fotografía del producto:", 10, yImg);
      doc.setFont(undefined, 'normal');
      yImg += 4;
      doc.addImage(fotoBase64, fotoTipo, 10, yImg, 50, 32);
      yImg += 36;
    }
    // Tabla de ingredientes
    autoTable(doc, {
      startY: fotoBase64 ? yImg : 118,
      head: [["Ingrediente", "Cantidad", "Unidad", "Precio Unitario ($)", "Costo Total ($)"]],
      body: (data.ingredientes || []).map(ing => [
        ing.nombre,
        ing.cantidad,
        ing.unidadMedida,
        ing.precioUnitario,
        (Number(ing.cantidad) * Number(ing.precioUnitario)).toFixed(2)
      ]),
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 10 },
    });
    // Pie de página
    doc.setFontSize(10);
    doc.text("Generado por Hielitos App", 10, 290);
    // Abrir el PDF en una nueva pestaña en vez de descargarlo automáticamente
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, '_blank');
    // Si quieres limpiar el objeto después de un tiempo:
    setTimeout(() => URL.revokeObjectURL(pdfUrl), 10000);
  };

  return (
    <div>
      <h2>Reporte de Orden de Producción</h2>
      <label>
        Selecciona receta:
        <select
          value={recetaSeleccionada?.id || ""}
          onChange={e => {
            const receta = recetas.find(r => r.id === e.target.value);
            setRecetaSeleccionada(receta);
          }}
        >
          <option value="">-- Selecciona --</option>
          {recetas.map(receta => (
            <option key={receta.id} value={receta.id}>
              {receta.nombre}
            </option>
          ))}
        </select>
      </label>

      {recetaSeleccionada && (
        <>
          {recetaSeleccionada.imageBase64 && (
            <div style={{ margin: "1rem 0" }}>
              <img
                src={recetaSeleccionada.imageBase64}
                alt={`Imagen de ${recetaSeleccionada.nombre}`}
                style={{ width: "220px", height: "auto", borderRadius: "8px", border: "1px solid #bbb" }}
              />
            </div>
          )}
          <div>
            <label>
          Lotes producidos:
              <input
                type="number"
                min="1"
                value={lotes}
                onChange={e => setLotes(Number(e.target.value))}
              />
          <span style={{marginLeft: '1rem'}}>Hielitos por lote:</span>
              <input
                type="number"
                min="1"
                value={hielitosPorLote}
                onChange={e => setHielitosPorLote(Number(e.target.value))}
                style={{width: '60px', marginLeft: '0.5rem'}}
              />
            </label>
          </div>
          <h3>Ingredientes</h3>
          <ul>
            {ingredientes.map((ing, idx) => (
              <li key={idx}>
                {ing.nombre} - {ing.cantidad} {ing.unidadMedida} - 
                Precio unitario: 
                <input
                  type="number"
                  step="0.01"
                  value={ing.precioUnitario}
                  onChange={e => handlePrecioChange(idx, e.target.value)}
                  style={{ width: "80px", marginLeft: "5px" }}
                />
              </li>
            ))}
          </ul>
          <div>
            <label>
              Gastos extra ($):
              <input
                type="number"
                step="0.01"
                value={gastosExtra}
                onChange={e => setGastosExtra(e.target.value)}
              />
            </label>
          </div>
          <div>
            <label>
              Tiempo invertido (minutos):
              <input
                type="number"
                min="0"
                value={tiempo}
                onChange={e => setTiempo(e.target.value)}
              />
            </label>
          </div>
          <button onClick={handleGuardarReporte} style={{marginRight: "1rem"}}>Guardar Reporte</button>
          <button onClick={() => handleGenerarPDF()}>Generar PDF</button>
        </>
      )}

      <hr style={{margin: "2rem 0"}} />
      <h3>Historial de Reportes de Producción</h3>
      {historial.length === 0 ? (
        <p>No hay reportes registrados.</p>
      ) : (
        <ul>
      {historial.map((reporte) => {
        // Buscar imagen de la receta si no está en el reporte
        let miniatura = reporte.imageBase64;
        if (!miniatura && reporte.recetaId) {
          const receta = recetas.find(r => r.id === reporte.recetaId);
          miniatura = receta?.imageBase64;
        }
        const edit = editHistorial[reporte.id] || { lotes: typeof reporte.lotes === 'number' ? reporte.lotes : Number(reporte.lotes) || 1, hielitosPorLote: typeof reporte.hielitosPorLote === 'number' ? reporte.hielitosPorLote : Number(reporte.hielitosPorLote) || 15 };
        const handleEditChange = (field, value) => {
          setEditHistorial(prev => ({
            ...prev,
            [reporte.id]: {
              ...prev[reporte.id],
              [field]: value === '' || isNaN(value) ? 1 : value
            }
          }));
        };
        const handleEditSave = async () => {
          try {
            if (!reporte.id) throw new Error("ID de reporte no encontrado");
            const ref = doc(db, "ordenesProduccion", reporte.id);
            await updateDoc(ref, {
              lotes: edit.lotes,
              hielitosPorLote: edit.hielitosPorLote
            });
            setHistorial(historial.map(r => r.id === reporte.id ? { ...r, lotes: edit.lotes, hielitosPorLote: edit.hielitosPorLote } : r));
            alert("Reporte actualizado");
          } catch (e) {
            alert("Error al actualizar el reporte: " + (e && e.message ? e.message : e));
          }
        };
        return (
          <li key={reporte.id} style={{marginBottom: "1rem", border: "1px solid #ccc", borderRadius: "6px", padding: "0.5rem 1rem", display: "flex", alignItems: "center", gap: "1rem"}}>
            {miniatura && (
              <img src={miniatura} alt="Foto receta" style={{width: 60, height: 40, objectFit: "cover", borderRadius: 4, border: "1px solid #aaa"}} />
            )}
            <div style={{flex: 1}}>
              <strong>Orden #{reporte.id}</strong> | <strong>{reporte.recetaNombre}</strong> | Lotes: <input type="number" min="1" value={edit.lotes ?? 1} onChange={e => handleEditChange('lotes', Number(e.target.value))} style={{width: 50}} /> | Hielitos por lote: <input type="number" min="1" value={edit.hielitosPorLote ?? 15} onChange={e => handleEditChange('hielitosPorLote', Number(e.target.value))} style={{width: 50}} /> | Costo por lote: ${reporte.costoPorLote ? Number(reporte.costoPorLote).toFixed(2) : "-"} | Costo total: ${reporte.costoTotal ? Number(reporte.costoTotal).toFixed(2) : "-"} | Gastos extra: ${reporte.gastosExtra} | Tiempo: {reporte.tiempo} min<br/>
              Fecha: {reporte.fecha && reporte.fecha.toDate ? reporte.fecha.toDate().toLocaleString() : "-"}
              <br/>
              <button onClick={handleEditSave} style={{marginTop: "0.5rem", marginRight: "0.5rem", background: '#27ae60', color: '#fff'}}>Guardar cambios</button>
              <button onClick={() => handleGenerarPDF(reporte)} style={{marginTop: "0.5rem", marginRight: "0.5rem"}}>Reimprimir PDF</button>
              <button onClick={() => handleEliminarReporte(reporte.id)} style={{marginTop: "0.5rem", background: "#e74c3c"}}>Eliminar</button>
            </div>
          </li>
        );
      })}
        </ul>
      )}
    </div>
  );
};

export default ReporteProduccion;