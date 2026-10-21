import { pipeline } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';

let extractor;
let notas = JSON.parse(localStorage.getItem('mis_notas')) || [];

const estadoEl = document.getElementById('estado');
const vistaCrear = document.getElementById('vistaCrear');
const vistaTodas = document.getElementById('vistaTodas');
const vistaBusqueda = document.getElementById('vistaBusqueda');
const listaTodasNotas = document.getElementById('listaTodasNotas');
const listaResultadosBusqueda = document.getElementById('listaResultadosBusqueda');
const btnCrear = document.getElementById('btnCrear');
const btnTodas = document.getElementById('btnTodas');
const tituloBusqueda = document.getElementById('tituloBusqueda');

async function initIA() {
  try {
    estadoEl.innerText = "⏳ Cargando modelo de IA...";
    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    estadoEl.innerText = "✅ Modelo listo y cargado localmente en tu navegador.";
    await verificarYRepararNotas();
  } catch (error) {
    console.error(error);
    estadoEl.innerText = "❌ Error al cargar el modelo.";
  }
}

async function obtenerEmbedding(texto) {
  const output = await extractor(texto, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

async function verificarYRepararNotas() {
  let modificado = false;
  for (let nota of notas) {
    if (!nota.vector) {
      nota.vector = await obtenerEmbedding(nota.texto);
      modificado = true;
    }
  }
  if (modificado) {
    localStorage.setItem('mis_notas', JSON.stringify(notas));
  }
}

function calcularSimilitud(vecA, vecB) {
  if (!vecA || !vecB) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

window.guardarNota = async function() {
  const textoInput = document.getElementById('textoNota');
  const texto = textoInput.value.trim();
  
  if (!texto) return;
  if (!extractor) {
    alert("El modelo de IA aún se está cargando.");
    return;
  }

  estadoEl.innerText = "🧠 Procesando nota...";
  
  try {
    const vector = await obtenerEmbedding(texto);
    notas.push({ texto, vector });
    localStorage.setItem('mis_notas', JSON.stringify(notas));
    
    textoInput.value = '';
    estadoEl.innerText = "✅ Nota guardada correctamente.";
  } catch (error) {
    console.error(error);
    estadoEl.innerText = "❌ Error al guardar la nota.";
  }
};

window.cambiarVista = function(vista) {
  document.getElementById('busqueda').value = '';

  if (vista === 'crear') {
    vistaCrear.style.display = 'block';
    vistaTodas.style.display = 'none';
    vistaBusqueda.style.display = 'none';
    btnCrear.classList.add('activo');
    btnTodas.classList.remove('activo');
  } else if (vista === 'todas') {
    vistaCrear.style.display = 'none';
    vistaTodas.style.display = 'block';
    vistaBusqueda.style.display = 'none';
    btnTodas.classList.add('activo');
    btnCrear.classList.remove('activo');
    renderizarTodasLasNotas();
  }
};

function renderizarTodasLasNotas() {
  listaTodasNotas.innerHTML = '';
  if (notas.length === 0) {
    listaTodasNotas.innerHTML = '<p style="color: #666; text-align: center;">No hay notas guardadas aún.</p>';
    return;
  }
  notas.forEach(n => {
    const div = document.createElement('div');
    div.className = 'nota';
    div.innerHTML = `<p style="margin: 0;">${n.texto}</p>`;
    listaTodasNotas.appendChild(div);
  });
}

window.manejarBusqueda = async function() {
  const consulta = document.getElementById('busqueda').value.trim();

  if (!consulta) {
    vistaBusqueda.style.display = 'none';
    vistaCrear.style.display = 'block';
    vistaTodas.style.display = 'none';
    btnCrear.classList.add('activo');
    btnTodas.classList.remove('activo');
    return;
  }

  if (!extractor) return;

  vistaCrear.style.display = 'none';
  vistaTodas.style.display = 'none';
  vistaBusqueda.style.display = 'block';
  btnCrear.classList.remove('activo');
  btnTodas.classList.remove('activo');

  tituloBusqueda.innerText = `🔍 Buscando: "${consulta}"`;
  listaResultadosBusqueda.innerHTML = '<p style="color: #666; text-align: center;">Analizando significado...</p>';

  const vectorConsulta = await obtenerEmbedding(consulta);
  const UMBRAL_MINIMO = 0.25; 

  const resultados = notas
    .map(nota => {
      const score = calcularSimilitud(vectorConsulta, nota.vector);
      return { ...nota, score: score };
    })
    .filter(nota => nota.score >= UMBRAL_MINIMO);

  resultados.sort((a, b) => b.score - a.score);

  listaResultadosBusqueda.innerHTML = '';
  
  if (resultados.length === 0) {
    listaResultadosBusqueda.innerHTML = '<p style="color: #666; text-align: center;">No se encontraron notas relacionadas con este concepto.</p>';
    return;
  }

  resultados.forEach(n => {
    const div = document.createElement('div');
    div.className = 'nota';
    const scoreHTML = `<span class="similitud">Relevancia: ${(n.score * 100).toFixed(1)}%</span>`;
    div.innerHTML = `${scoreHTML}<p style="margin: 0;">${n.texto}</p>`;
    listaResultadosBusqueda.appendChild(div);
  });
};

initIA();