
/* =========================================
   RUTAVISITA - Aplicación principal
   Almacenamiento local privado
========================================= */

(() => {
  "use strict";

  const STORAGE_VISITS = "rutavisita_visits_v1";
  const STORAGE_EXPENSES = "rutavisita_expenses_v1";

  const $ = (id) => document.getElementById(id);

  const form = $("visit-form");
  const visitsList = $("visits-list");
  const filterStatus = $("filter-status");
  const expenseInput = $("transport-cost");
  const saveExpenseButton = $("save-expense");

  let visits = loadData(STORAGE_VISITS, []);
  let expenses = loadData(STORAGE_EXPENSES, {});

  const statuses = [
    "Pendiente",
    "Visitado",
    "No localizado",
    "Seguimiento",
    "Reprogramado"
  ];

  function loadData(key, fallback) {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : fallback;
    } catch (error) {
      console.error("Error al leer almacenamiento:", error);
      return fallback;
    }
  }

  function saveData(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (error) {
      alert("No se pudo guardar la información. Revisa el espacio disponible.");
      console.error(error);
      return false;
    }
  }

  function today() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[character]);
  }

  function statusClass(status) {
    return "status-" + status
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-");
  }

  function formatDate(date) {
    if (!date) return "";
    const parts = date.split("-");
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  function formatMoney(amount) {
    return Number(amount || 0).toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN"
    });
  }

  function updateCounters() {
    const total = visits.length;
    const pending = visits.filter(v => v.status === "Pendiente").length;
    const completed = visits.filter(v => v.status === "Visitado").length;

    $("total-visits").textContent = total;
    $("pending-visits").textContent = pending;
    $("completed-visits").textContent = completed;
  }

  function renderVisits() {
    const selected = filterStatus.value;

    const filtered = visits.filter(visit =>
      selected === "Todas" || visit.status === selected
    );

    if (filtered.length === 0) {
      visitsList.innerHTML = `
        <p class="empty-message">
          No hay domicilios en esta categoría.
        </p>
      `;
      updateCounters();
      return;
    }

    visitsList.innerHTML = filtered.map(visit => {
      const mapsURL =
        "https://www.google.com/maps/search/?api=1&query=" +
        encodeURIComponent(visit.address);

      const options = statuses.map(status => `
        <option value="${status}"
          ${visit.status === status ? "selected" : ""}>
          ${status}
        </option>
      `).join("");

      return `
        <article class="visit-card ${statusClass(visit.status)}"
          data-id="${escapeHTML(visit.id)}">

          <h3>${escapeHTML(visit.person)}</h3>

          <p><strong>Domicilio:</strong>
            ${escapeHTML(visit.address)}
          </p>

          ${visit.phone ? `
            <p><strong>Teléfono:</strong>
              ${escapeHTML(visit.phone)}
            </p>
          ` : ""}

          <p><strong>Estado:</strong>
            ${escapeHTML(visit.status)}
          </p>

          <p><strong>Registrado:</strong>
            ${formatDate(visit.createdDate)}
          </p>

          ${visit.notes ? `
            <p><strong>Observaciones:</strong>
              ${escapeHTML(visit.notes)}
            </p>
          ` : ""}

          ${visit.lastVisit ? `
            <p><strong>Último cambio:</strong>
              ${escapeHTML(visit.lastVisit)}
            </p>
          ` : ""}

          <label>Actualizar estado</label>
          <select class="change-status" data-id="${escapeHTML(visit.id)}">
            ${options}
          </select>

          <a href="${mapsURL}"
            target="_blank"
            rel="noopener noreferrer"
            class="map-link">
            Abrir en Google Maps
          </a>

          <button type="button"
            class="delete-visit"
            data-id="${escapeHTML(visit.id)}">
            Eliminar domicilio
          </button>

        </article>
      `;
    }).join("");

    updateCounters();
  }

  // Registrar domicilio
  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const person = $("person").value.trim();
    const address = $("address").value.trim();
    const phone = $("phone").value.trim();
    const status = $("status").value;
    const notes = $("notes").value.trim();

    if (!person || !address) {
      alert("Escribe el nombre y el domicilio.");
      return;
    }

    const newVisit = {
      id: (crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now().toString() + Math.random().toString(16).slice(2)),
      person,
      address,
      phone,
      status,
      notes,
      createdDate: today(),
      lastVisit: ""
    };

    visits.unshift(newVisit);

    if (!saveData(STORAGE_VISITS, visits)) {
      visits.shift();
      return;
    }

    form.reset();
    filterStatus.value = "Todas";
    renderVisits();

    alert("Domicilio guardado correctamente.");
  });

  // Filtrar domicilios
  filterStatus.addEventListener("change", renderVisits);

  // Cambiar estado o eliminar domicilio
  visitsList.addEventListener("change", (event) => {
    if (!event.target.classList.contains("change-status")) return;

    const id = event.target.dataset.id;
    const visit = visits.find(v => v.id === id);

    if (!visit) return;

    const previousStatus = visit.status;
    visit.status = event.target.value;
    visit.lastVisit = new Date().toLocaleString("es-MX");

    if (!saveData(STORAGE_VISITS, visits)) {
      visit.status = previousStatus;
      renderVisits();
      return;
    }

    renderVisits();
  });

  visitsList.addEventListener("click", (event) => {
    const button = event.target.closest(".delete-visit");

    if (!button) return;

    const id = button.dataset.id;
    const visit = visits.find(v => v.id === id);

    if (!visit) return;

    if (!confirm(`¿Eliminar el domicilio de ${visit.person}?`)) {
      return;
    }

    const previousVisits = [...visits];
    visits = visits.filter(v => v.id !== id);

    if (!saveData(STORAGE_VISITS, visits)) {
      visits = previousVisits;
      return;
    }

    renderVisits();
  });

  // Gastos diarios de transporte
  function renderExpense() {
    const amount = expenses[today()] || 0;

    $("expense-summary").textContent =
      "Gasto registrado hoy: " + formatMoney(amount);

    expenseInput.value = amount || "";
  }

  saveExpenseButton.addEventListener("click", () => {
    const amount = Number(expenseInput.value);

    if (!Number.isFinite(amount) || amount < 0) {
      alert("Introduce un gasto válido.");
      return;
    }

    const previousExpenses = { ...expenses };

    expenses[today()] = amount;

    if (!saveData(STORAGE_EXPENSES, expenses)) {
      expenses = previousExpenses;
      return;
    }

    renderExpense();
    alert("Gasto diario guardado correctamente.");
  });

  // Inicialización
  renderVisits();
  renderExpense();

  console.log("RutaVisita está funcionando.");
})();
