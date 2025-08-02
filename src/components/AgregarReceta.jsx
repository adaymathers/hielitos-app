import { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

const AgregarReceta = ({ setRecetas, recargarRecetas }) => {
  const [nombre, setNombre] = useState("");
  const [ingredientes, setIngredientes] = useState([{ nombre: "", cantidad: "", unidadMedida: "", precioUnitario: "" }]);
  const [imagenBase64, setImagenBase64] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => setImagenBase64(reader.result);
    reader.readAsDataURL(file);
  };

  const agregarIngrediente = () => {
    setIngredientes([...ingredientes, { nombre: "", cantidad: "", unidadMedida: "", precioUnitario: "" }]);
  };

  const handleIngredienteChange = (index, field, value) => {
    const nuevosIngredientes = [...ingredientes];
    nuevosIngredientes[index][field] = value;
    setIngredientes(nuevosIngredientes);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Filtrar sólo ingredientes válidos (con datos completos y numéricos)
    const ingredientesValidos = ingredientes.filter(
      (ing) =>
        ing.nombre.trim() !== "" &&
        !isNaN(parseFloat(ing.cantidad)) &&
        !isNaN(parseFloat(ing.precioUnitario)) &&
        ing.unidadMedida.trim() !== ""
    ).map((ing) => ({
      nombre: ing.nombre.trim(),
      cantidad: parseFloat(ing.cantidad),
      unidadMedida: ing.unidadMedida.trim(),
      precioUnitario: parseFloat(ing.precioUnitario),
      costoTotal: parseFloat(ing.cantidad) * parseFloat(ing.precioUnitario),
    }));

    if (!nombre.trim()) {
      alert("Ponle un nombre a la receta");
      return;
    }

    if (ingredientesValidos.length === 0) {
      alert("Agrega al menos un ingrediente válido");
      return;
    }

    if (!imagenBase64) {
      alert("Sube una imagen para la receta");
      return;
    }

    const nuevaReceta = {
      nombre: nombre.trim(),
      ingredientes: ingredientesValidos,
      imageBase64: imagenBase64,
    };

    try {
      await addDoc(collection(db, "recetas"), nuevaReceta);
      alert("Receta agregada exitosamente");
      setNombre("");
      setIngredientes([{ nombre: "", cantidad: "", unidadMedida: "", precioUnitario: "" }]);
      setImagenBase64(null);
      if (recargarRecetas) {
        await recargarRecetas();
      }
    } catch (error) {
      console.error("Error al agregar receta:", error);
      alert("Error al guardar la receta");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Agregar Receta</h2>

      <input
        type="text"
        placeholder="Nombre de la receta"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        required
        style={{ width: "100%", marginBottom: "1rem", padding: "0.5rem" }}
      />

      <input type="file" accept="image/*" onChange={handleImageChange} style={{ marginBottom: "1rem" }} />

      {ingredientes.map((ing, idx) => (
        <div key={idx} style={{ marginBottom: "1rem" }}>
          <input
            type="text"
            placeholder="Ingrediente"
            value={ing.nombre}
            onChange={(e) => handleIngredienteChange(idx, "nombre", e.target.value)}
            style={{ width: "40%", marginRight: "1%" }}
          />
          <input
            type="number"
            placeholder="Cantidad"
            value={ing.cantidad}
            onChange={(e) => handleIngredienteChange(idx, "cantidad", e.target.value)}
            step="any"
            style={{ width: "15%", marginRight: "1%" }}
          />
          <input
            type="text"
            placeholder="Unidad de medida"
            value={ing.unidadMedida}
            onChange={(e) => handleIngredienteChange(idx, "unidadMedida", e.target.value)}
            style={{ width: "20%", marginRight: "1%" }}
          />
          <input
            type="number"
            placeholder="Precio unitario"
            value={ing.precioUnitario}
            onChange={(e) => handleIngredienteChange(idx, "precioUnitario", e.target.value)}
            step="any"
            style={{ width: "20%" }}
          />
        </div>
      ))}

      <button type="button" onClick={agregarIngrediente} style={{ marginRight: "1rem" }}>
        Agregar otro ingrediente
      </button>

      <button type="submit">Guardar Receta</button>
    </form>
  );
};

export default AgregarReceta;
