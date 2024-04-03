const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

// Konfigurasi koneksi database
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'pinjamaja'
});

// Membuat koneksi ke database
connection.connect((err) => {
  if (err) {
    console.error('Error connecting to database: ' + err.stack);
    return;
  }
  console.log('Connected to database');
});

app.use(express.static('API-NODE')); // Menggunakan folder 'public' untuk file statis


// Gunakan middleware cors
app.use(cors());

const bodyParser = require('body-parser');

// Gunakan body-parser di middleware express
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());


// Middleware untuk parsing body dari request
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simulasi database pengguna
const users = [
    { username: 'admin', password: 'admin' }
];

// Halaman login
app.get('/login', (req, res) => {
    res.sendFile(__dirname + '/login.html');
});

// Route untuk menangani permintaan POST ke /login
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Verifikasi kredensial
    const user = users.find(user => user.username === username && user.password === password);
    if (user) {
        // Jika kredensial benar, redirect ke halaman input barang
        res.redirect('/barang');
    } else {
        // Jika kredensial salah, kembali ke halaman login dengan pesan error
        res.send('Username atau password salah. Silakan coba lagi.');
    }
});


// Route untuk menampilkan daftar barang
app.get('/barang', (req, res) => {
  connection.query('SELECT * FROM tbl_barang', (error, results, fields) => {
    if (error) {
      console.error('Error executing query: ' + error.stack);
      res.status(500).send('Internal server error');
      return;
    }

    res.json(results);
  });
});

// Route untuk melakukan peminjaman barang
app.post('/pinjam', (req, res) => {
    const { id_barang, nama_peminjam, tanggal_pinjam } = req.body;
  
    // Memasukkan data peminjaman ke dalam tabel tbl_peminjaman
    const sqlPinjam = 'INSERT INTO tbl_peminjaman (id_barang, nama_peminjam, tanggal_pinjam) VALUES (?, ?, ?)';
    connection.query(sqlPinjam, [id_barang, nama_peminjam, tanggal_pinjam], (error, results, fields) => {
      if (error) {
        console.error('Error executing query for peminjaman: ' + error.stack);
        res.status(500).send('Internal server error');
        return;
      }
  
      console.log('Peminjaman berhasil. ID peminjaman:', results.insertId); // Log ID peminjaman
  
      // Mengurangi jumlah barang yang tersedia di tabel tbl_barang
const sqlKurangiJumlahBarang = 'UPDATE tbl_barang SET jumlah = jumlah - 1 WHERE id_barang = ?';
connection.query(sqlKurangiJumlahBarang, [id_barang], (error, results, fields) => {
  if (error) {
    console.error('Error executing query for updating jumlah barang: ' + error.stack);
    res.status(500).send('Internal server error');
    return;
  }

  console.log('Jumlah barang yang tersedia berhasil dikurangi'); // Log jumlah barang yang berhasil dikurangi
  res.status(201).send('Peminjaman berhasil');
});

    });
  });

// Route untuk menambah barang baru
app.post('/tambah-barang', (req, res) => {
  const { nama_barang, jumlah } = req.body;

  // Memastikan data yang diperlukan tersedia
  if (!nama_barang || !jumlah) {
    res.status(400).send('Nama barang dan jumlah harus disertakan');
    return;
  }

  // Memasukkan data barang baru ke dalam tabel tbl_barang
  const sqlTambahBarang = 'INSERT INTO tbl_barang (nama_barang, jumlah) VALUES (?, ?)';
  connection.query(sqlTambahBarang, [nama_barang, jumlah], (error, results, fields) => {
    if (error) {
      console.error('Error executing query for tambah barang: ' + error.stack);
      res.status(500).send('Internal server error');
      return;
    }

    console.log('Barang berhasil ditambahkan. ID barang:', results.insertId); // Log ID barang baru
    res.status(201).send('Barang berhasil ditambahkan');
  });
});

// Route untuk menampilkan barang yang dipinjam
app.get('/barang-dipinjam', (req, res) => {
    connection.query('SELECT * FROM tbl_peminjaman JOIN tbl_barang ON tbl_peminjaman.id_barang = tbl_barang.id_barang', (error, results, fields) => {
      if (error) {
        console.error('Error executing query: ' + error.stack);
        res.status(500).send('Internal server error');
        return;
      }
  
      res.json(results);
    });
  });
  
  // Route untuk melakukan pengembalian barang yang dipinjam
  app.post('/kembali', (req, res) => {
    const { id_peminjaman, id_barang } = req.body;
  
    // Menghapus data peminjaman dari tabel tbl_peminjaman
    const sqlKembali = 'DELETE FROM tbl_peminjaman WHERE id = ?';
    connection.query(sqlKembali, [id_peminjaman], (error, results, fields) => {
      if (error) {
        console.error('Error executing query for pengembalian: ' + error.stack);
        res.status(500).send('Internal server error');
        return;
      }
  
      console.log('Barang berhasil dikembalikan. ID peminjaman:', id_peminjaman); // Log ID peminjaman yang berhasil dikembalikan
  
      // Menambahkan jumlah barang yang dikembalikan ke dalam jumlah barang yang tersedia di tabel tbl_barang
      const sqlTambahJumlahBarang = 'UPDATE tbl_barang SET jumlah = jumlah + 1 WHERE id_barang = ?';
      connection.query(sqlTambahJumlahBarang, [id_barang], (error, results, fields) => {
        if (error) {
          console.error('Error executing query for updating jumlah barang: ' + error.stack);
          res.status(500).send('Internal server error');
          return;
        }
  
        console.log('Jumlah barang yang tersedia berhasil ditambahkan'); // Log jumlah barang yang berhasil ditambahkan
        res.status(201).send('Pengembalian barang berhasil');
      });
    });
  });

// Route untuk menghapus barang berdasarkan ID
app.delete('/hapus-barang/:id', (req, res) => {
    const idBarang = req.params.id;

    // Lakukan operasi penghapusan data barang dari database berdasarkan ID
    connection.query('DELETE FROM tbl_barang WHERE id_barang = ?', [idBarang], (error, results, fields) => {
        if (error) {
            console.error('Error executing query for deleting barang: ' + error.stack);
            res.status(500).send('Internal server error');
            return;
        }

        console.log('Barang berhasil dihapus'); // Log pesan ke konsol
        res.status(200).send('Barang berhasil dihapus'); // Mengirim respons sukses ke klien
    });
});


// Menjalankan server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
