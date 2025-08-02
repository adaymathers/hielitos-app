import { useEffect, useState } from "react";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebaseConfig";

const ListaDeRecetas = () => {
  const [recetas, setRecetas] = useState([]);
  const [cargando, setCargando] = useState(true);

  const obtenerRecetas = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "recetas"));
      const recetasArray = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRecetas(recetasArray);
    } catch (error) {
      console.error("Error al obtener recetas:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    obtenerRecetas();
  }, []);

  const eliminarReceta = async (id) => {
    const confirmacion = window.confirm("¿Estás seguro de que deseas eliminar esta receta?");
    if (!confirmacion) return;

    try {
      await deleteDoc(doc(db, "recetas", id));
      setRecetas((recetasActuales) => recetasActuales.filter((receta) => receta.id !== id));
    } catch (error) {
      console.error("Error al eliminar la receta:", error);
    }
  };

  if (cargando) return <p>Cargando recetas...</p>;

  return (
    <div>
      <h2>Lista de Recetas</h2>
      {recetas.length === 0 ? (
        <p>No hay recetas aún.</p>
      ) : (
        recetas.map((receta) => {
          // Sumarizar costo total de todos los ingredientes
          const costoTotalReceta = receta.ingredientes?.reduce(
            (acum, ing) => acum + (ing.costoTotal || 0),
            0
          ) || 0;

          return (
            <div
              key={receta.id}
              style={{ border: "1px solid #ccc", padding: "10px", marginBottom: "15px" }}
            >
              <h3>{receta.nombre}</h3>

              {receta.imageBase64 && (
                <img
                  src={receta.imageBase64}
                  alt={`Imagen de ${receta.nombre}`}
                  style={{ width: "200px", height: "auto", marginBottom: "10px" }}
                />
              )}

              <ul>
                {receta.ingredientes?.map((ing, idx) => (
                  <li key={idx}>
                    {ing.nombre} - {ing.cantidad} {ing.unidadMedida} - Precio unitario: ${ing.precioUnitario.toFixed(2)} - Costo total: ${ing.costoTotal.toFixed(2)}
                  </li>
                ))}
              </ul>

              <p style={{ fontWeight: "bold", marginTop: "10px" }}>
                Costo total de la receta: ${costoTotalReceta.toFixed(2)}
              </p>

              <button onClick={() => eliminarReceta(receta.id)}>Eliminar</button>
            </div>
          );
        })
      )}
    </div>
  );
};

export default ListaDeRecetas;
