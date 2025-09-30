const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) {
        console.error("Error abriendo la base de datos " + err.message);
    } else {
        console.log("Base de datos conectada!");
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS services (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, price REAL NOT NULL)`);
            db.run(`CREATE TABLE IF NOT EXISTS barbers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, commission INTEGER NOT NULL)`);
            db.run(`CREATE TABLE IF NOT EXISTS sales (id INTEGER PRIMARY KEY AUTOINCREMENT, barber_name TEXT NOT NULL, services_json TEXT NOT NULL, total_price REAL NOT NULL, payment_method TEXT NOT NULL, commission_total REAL NOT NULL, sale_date TEXT NOT NULL)`);
            console.log("Tablas aseguradas en la base de datos.");
        });
    }
});

// --- API DE DATOS ---

// GET: Obtener todos los datos iniciales
app.get('/api/data', (req, res) => {
    const data = {};
    db.all("SELECT * FROM services ORDER BY name", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        data.services = rows;
        db.all("SELECT * FROM barbers ORDER BY name", [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            data.barbers = rows;
            res.json(data);
        });
    });
});

// GET: Obtener todas las ventas de una fecha
app.get('/api/sales', (req, res) => {
    const date = req.query.date; // Espera una fecha en formato YYYY-MM-DD
    const sql = "SELECT * FROM sales WHERE date(sale_date) = ?";
    db.all(sql, [date], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});


// POST: Registrar una nueva venta
app.post('/api/sales', (req, res) => {
    const { barber, services, totalPrice, paymentMethod } = req.body;
    const sale_date = new Date().toISOString();
    const commission_total = totalPrice * (barber.commission / 100);
    const sql = `INSERT INTO sales (barber_name, services_json, total_price, payment_method, commission_total, sale_date) VALUES (?, ?, ?, ?, ?, ?)`;
    const params = [barber.name, JSON.stringify(services), totalPrice, paymentMethod, commission_total, sale_date];
    db.run(sql, params, function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: "Venta registrada!", id: this.lastID });
    });
});

// --- API DE GESTIÓN (NUEVA) ---

// POST: Añadir un nuevo servicio
app.post('/api/services', (req, res) => {
    const { name, price } = req.body;
    db.run(`INSERT INTO services (name, price) VALUES (?, ?)`, [name, price], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ id: this.lastID, name, price });
    });
});

// DELETE: Eliminar un servicio
app.delete('/api/services/:id', (req, res) => {
    db.run(`DELETE FROM services WHERE id = ?`, req.params.id, function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: "Servicio eliminado", changes: this.changes });
    });
});

// POST: Añadir un nuevo barbero
app.post('/api/barbers', (req, res) => {
    const { name, commission } = req.body;
    db.run(`INSERT INTO barbers (name, commission) VALUES (?, ?)`, [name, commission], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ id: this.lastID, name, commission });
    });
});

// DELETE: Eliminar un barbero
app.delete('/api/barbers/:id', (req, res) => {
    db.run(`DELETE FROM barbers WHERE id = ?`, req.params.id, function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: "Barbero eliminado", changes: this.changes });
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
