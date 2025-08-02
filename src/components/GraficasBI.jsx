import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebaseConfig";

// Usaremos chart.js para las gráficas
import { Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);


const GraficasBI = () => {
  const [ventas, setVentas] = useState([]);
  const [recetas, setRecetas] = useState([]);
  const [ordenes, setOrdenes] = useState([]);
  const [gastosExtra, setGastosExtra] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroBalance, setFiltroBalance] = useState("mes"); // dia, semana, mes, año
  // Agrupar ventas por fecha para balance diario/periodo
  function getFechaKey(date, filtro) {
    const d = new Date(date);
    if (filtro === "dia") return d.toISOString().slice(0, 10);
    if (filtro === "semana") {
      // ISO week: yyyy-Www
      const year = d.getFullYear();
      const week = Math.ceil((((d - new Date(year,0,1)) / 86400000) + new Date(year,0,1).getDay()+1)/7);
      return `${year}-W${week.toString().padStart(2, "0")}`;
    }
    if (filtro === "mes") return d.toISOString().slice(0, 7); // yyyy-mm
    if (filtro === "año") return d.getFullYear().toString();
    return d.toISOString().slice(0, 10);
  }

  // Calcular ingresos, gastos y balance acumulado por periodo
  const ingresosPorPeriodo = {};
  const gastosPorPeriodo = {};
  const retirosPorPeriodo = {};
  const inversionesPorPeriodo = {};
  const balancePorPeriodo = {};

  ventas.forEach(v => {
    let fecha = v.fecha;
    if (fecha && fecha.toDate) fecha = fecha.toDate();
    if (!fecha) return;
    const key = getFechaKey(fecha, filtroBalance);
    const ingreso = (v.cantidadVendida || 0) * (v.precioVenta || 0);
    if (!ingresosPorPeriodo[key]) ingresosPorPeriodo[key] = 0;
    ingresosPorPeriodo[key] += ingreso;
  });

  ordenes.forEach(o => {
    let fecha = o.fecha;
    if (fecha && fecha.toDate) fecha = fecha.toDate();
    if (!fecha) return;
    const key = getFechaKey(fecha, filtroBalance);
    let gasto = 0;
    if (typeof o.costoTotal === 'number') {
      gasto = o.costoTotal;
    } else {
      if (Array.isArray(o.ingredientes)) {
        gasto += o.ingredientes.reduce((acc, ing) => acc + (Number(ing.cantidad) * Number(ing.precioUnitario)), 0);
      }
      gasto += Number(o.gastosExtra) || 0;
    }
    if (!gastosPorPeriodo[key]) gastosPorPeriodo[key] = 0;
    gastosPorPeriodo[key] += gasto;
  });

  // Gastos extra, retiros e inversiones
  gastosExtra.forEach(g => {
    let fecha = g.fecha;
    if (fecha && fecha.toDate) fecha = fecha.toDate();
    if (!fecha) return;
    const key = getFechaKey(fecha, filtroBalance);
    if (g.tipo === "retiro") {
      if (!retirosPorPeriodo[key]) retirosPorPeriodo[key] = 0;
      retirosPorPeriodo[key] += Number(g.monto) || 0;
    } else if (g.tipo === "inversion") {
      if (!inversionesPorPeriodo[key]) inversionesPorPeriodo[key] = 0;
      inversionesPorPeriodo[key] += Number(g.monto) || 0;
    } else {
      if (!gastosPorPeriodo[key]) gastosPorPeriodo[key] = 0;
      gastosPorPeriodo[key] += Number(g.monto) || 0;
    }
  });

  // Unir todas las fechas de ingresos, gastos, retiros e inversiones
  const fechasSet = new Set([
    ...Object.keys(ingresosPorPeriodo),
    ...Object.keys(gastosPorPeriodo),
    ...Object.keys(retirosPorPeriodo),
    ...Object.keys(inversionesPorPeriodo)
  ]);
  const fechasBalance = Array.from(fechasSet).sort();

  // Balance acumulado correlacional
  let acumulado = 0;
  const balanceAcumulado = fechasBalance.map(f => {
    const ingreso = ingresosPorPeriodo[f] || 0;
    const gasto = gastosPorPeriodo[f] || 0;
    const retiro = retirosPorPeriodo[f] || 0;
    const inversion = inversionesPorPeriodo[f] || 0;
    acumulado += ingreso - gasto - retiro + inversion;
    balancePorPeriodo[f] = acumulado;
    return acumulado;
  });

  const balanceData = {
    labels: fechasBalance,
    datasets: [
      {
        label: "Ingresos ($)",
        data: fechasBalance.map(f => ingresosPorPeriodo[f] || 0),
        backgroundColor: "#2980b9",
      },
      {
        label: "Gastos ($)",
        data: fechasBalance.map(f => gastosPorPeriodo[f] || 0),
        backgroundColor: "#e74c3c",
      },
      {
        label: "Balance acumulado ($)",
        data: balanceAcumulado,
        backgroundColor: "#27ae60",
      },
    ],
  };

  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);
      const ventasSnap = await getDocs(collection(db, "ventas"));
      const ventasList = ventasSnap.docs.map(doc => doc.data());
      setVentas(ventasList);
      const recetasSnap = await getDocs(collection(db, "recetas"));
      const recetasList = recetasSnap.docs.map(doc => doc.data());
      setRecetas(recetasList);
      const ordenesSnap = await getDocs(collection(db, "ordenesProduccion"));
      const ordenesList = ordenesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrdenes(ordenesList);
      // Gastos extra, retiros, inversiones
      try {
        const extraSnap = await getDocs(collection(db, "gastosExtra"));
        const extraList = extraSnap.docs.map(doc => doc.data());
        setGastosExtra(extraList);
      } catch (e) {
        setGastosExtra([]);
      }
      setLoading(false);
    };
    cargarDatos();
  }, []);

  // Relacionar ventas -> orden -> receta
  // Creamos un mapa ordenId -> recetaId
  const ordenIdToRecetaId = {};
  ordenes.forEach(o => {
    if (o.id) ordenIdToRecetaId[o.id] = o.recetaId;
  });

  // Creamos un mapa recetaId -> nombre
  const recetaIdToNombre = {};
  recetas.forEach(r => {
    if (r.id) recetaIdToNombre[r.id] = r.nombre;
  });

  // Agrupamos ventas por receta (dinero recaudado)
  const recetaTotales = {};
  ventas.forEach(v => {
    const recetaId = ordenIdToRecetaId[v.ordenId];
    if (!recetaId) return;
    // Buscar nombre de la receta desde la orden si existe
    let recetaNombre = "Sin nombre";
    const orden = ordenes.find(o => o.id === v.ordenId);
    if (orden && orden.recetaNombre) {
      recetaNombre = orden.recetaNombre;
    } else if (recetaIdToNombre[recetaId]) {
      recetaNombre = recetaIdToNombre[recetaId];
    }
    if (!recetaTotales[recetaId]) {
      recetaTotales[recetaId] = { nombre: recetaNombre, total: 0 };
    }
    // Sumar dinero recaudado por receta
    const cantidad = v.cantidadVendida || 0;
    const precio = v.precioVenta || 0;
    recetaTotales[recetaId].total += cantidad * precio;
  });

  // Top 10 recetas más vendidas
  const topRecetas = Object.values(recetaTotales)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // Datos para gráfica de barras (dinero recaudado)
  const barData = {
    labels: topRecetas.map(r => r.nombre),
    datasets: [
      {
        label: "Dinero recaudado ($)",
        data: topRecetas.map(r => r.total),
        backgroundColor: "#2980b9",
      },
    ],
  };

  // Datos para gráfica de pastel
  const pieData = {
    labels: topRecetas.map(r => r.nombre),
    datasets: [
      {
        label: "Vendidos",
        data: topRecetas.map(r => r.total),
        backgroundColor: [
          "#2980b9",
          "#f39c12",
          "#27ae60",
          "#e74c3c",
          "#8e44ad",
          "#16a085",
          "#d35400",
          "#2c3e50",
          "#c0392b",
          "#7f8c8d",
        ],
      },
    ],
  };

  return (
    <div style={{ margin: 0, padding: 0 }}>
      <h2 style={{ margin: "1rem 0 0.5rem 0", textAlign: "center" }}>Gráficas BI</h2>
      {loading ? <p>Cargando...</p> : (
        <div>
          <div style={{ margin: "0 auto 1rem auto", display: "block", textAlign: "center" }}>
            <h3 style={{ fontSize: "1em", margin: 0 }}>Balance por {filtroBalance.charAt(0).toUpperCase() + filtroBalance.slice(1)}</h3>
            <div style={{ marginBottom: 8 }}>
              <label>Ver por: </label>
              <select value={filtroBalance} onChange={e => setFiltroBalance(e.target.value)}>
                <option value="dia">Día</option>
                <option value="semana">Semana</option>
                <option value="mes">Mes</option>
                <option value="año">Año</option>
              </select>
            </div>
            <Bar
              data={balanceData}
              options={{
                responsive: false,
                maintainAspectRatio: false,
                plugins: { legend: { display: true } },
              }}
              width={400}
              height={200}
              getDatasetAtEvent={() => {}}
            />
          </div>
          <div style={{ margin: "0 auto 1rem auto", display: "block", textAlign: "center" }}>
            <h3 style={{ fontSize: "1em", margin: 0 }}>Top 10 Recetas Más Vendidas</h3>
            <Bar
              data={barData}
              options={{
                responsive: false,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
              }}
              width={200}
              height={400}
              getDatasetAtEvent={() => {}}
            />
          </div>
          <div style={{ margin: "0 auto", display: "block", textAlign: "center" }}>
            <h3 style={{ fontSize: "1em", margin: 0 }}>Distribución de Ventas (Pastel)</h3>
            <Pie
              data={pieData}
              options={{
                responsive: false,
                maintainAspectRatio: false,
              }}
              width={200}
              height={400}
              getDatasetAtEvent={() => {}}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default GraficasBI;
