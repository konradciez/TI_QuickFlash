

const mysql = require('mysql');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const DB_CONFIG = {
	host: process.env.DB_HOST || 'mysql.agh.edu.pl',
	port: Number(process.env.DB_PORT) || 3306,
	user: process.env.DB_USER || 'kciezad1',
	password: process.env.DB_PASSWORD || '',
	database: process.env.DB_NAME || 'kciezad1',
	charset: process.env.DB_CHARSET || 'utf8mb4',
	multipleStatements: String(process.env.DB_MULTIPLE_STATEMENTS || 'true'),
};

if (!DB_CONFIG.password) {
	console.log('DB_PASSWORD not set');
}

const con = mysql.createConnection(DB_CONFIG);

con.connect(err => {
	if (err) {
		console.log('error:', err);
		return;
	}
	console.log('mysql connected');
});

function createUser(user) {
	return new Promise((resolve, reject) => {
		const { username, password, role = 'USER' } = user;
		con.query(
			'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
			[username, password, role],
			(err, result) => {
				if (err) return reject(err);
				resolve(result);
			}
		);
	});
}

function getUserByUsername(username) {
	return new Promise((resolve, reject) => {
		con.query(
			'SELECT username, password, role FROM users WHERE username = ? LIMIT 1',
			[username],
			(err, rows) => {
				if (err) return reject(err);
				resolve(rows.length ? rows[0] : null);
			}
		);
	});
}

function getAllUsers() {
	return new Promise((resolve, reject) => {
		con.query(
			'SELECT username, role FROM users ORDER BY username ASC',
			(err, result) => {
				if (err) return reject(err);
				resolve(result);
			}
		);
	});
}

function deleteUser(username) {
	return new Promise((resolve, reject) => {
		con.query(
			'DELETE FROM users WHERE username = ?',
			[username],
			(err, result) => {
				if (err) return reject(err);
				resolve(result);
			}
		);
	});
}

function getFlashcardSetNames() {
	return new Promise((resolve, reject) => {
		con.query('SELECT name FROM flashcard_sets ORDER BY name ASC', (err, rows) => {
			if (err) return reject(err);
			resolve(rows.map(r => r.name));
		});
	});
}

function getFlashcardSetNamesByOwner(ownerUsername) {
	return new Promise((resolve, reject) => {
		con.query(
			'SELECT name FROM flashcard_sets WHERE owner_username = ? ORDER BY name ASC',
			[ownerUsername],
			(err, rows) => {
				if (err) return reject(err);
				resolve(rows.map(r => r.name));
			}
		);
	});
}

function createFlashcardSet(name, ownerUsername) {
	return new Promise((resolve, reject) => {
		con.query(
			'INSERT INTO flashcard_sets (name, owner_username) VALUES (?, ?)',
			[name, ownerUsername],
			(err, result) => {
				if (err) return reject(err);
				resolve(result);
			}
		);
	});
}

function deleteFlashcardSet(name, ownerUsername) {
	return new Promise((resolve, reject) => {
		//flashcards
		con.query(
			'DELETE FROM flashcards WHERE set_name = ? AND owner_username = ?',
			[name, ownerUsername],
			(err) => {
				if (err) return reject(err);

				//flashcard_sets
				con.query(
					'DELETE FROM flashcard_sets WHERE name = ? AND owner_username = ?',
					[name, ownerUsername],
					(err2, result) => {
						if (err2) return reject(err2);
						resolve(result);
					}
				);
			}
		);
	});
}

function flashcardFrontExists(setName, ownerUsername, front) {
	return new Promise((resolve, reject) => {
		con.query(
			'SELECT 1 FROM flashcards WHERE set_name = ? AND owner_username = ? AND front = ? LIMIT 1',
			[setName, ownerUsername, front],
			(err, rows) => {
				if (err) return reject(err);
				resolve(rows.length > 0);
			}
		);
	});
}

function addFlashcard(setName, ownerUsername, front, back) {
	return new Promise((resolve, reject) => {
		con.query(
			'INSERT INTO flashcards (set_name, owner_username, front, back) VALUES (?, ?, ?, ?)',
			[setName, ownerUsername, front, back],
			(err, result) => {
				if (err) return reject(err);
				resolve(result);
			}
		);
	});
}

function updateFlashcard(setName, ownerUsername, oldFront, oldBack, front, back) {
	return new Promise((resolve, reject) => {
		con.query(
			'UPDATE flashcards SET front = ?, back = ? WHERE set_name = ? AND owner_username = ? AND front = ? AND back = ?',
			[front, back, setName, ownerUsername, oldFront, oldBack],
			(err, result) => {
				if (err) return reject(err);
				resolve(result);
			}
		);
	});
}

function deleteFlashcard(setName, ownerUsername, front) {
	return new Promise((resolve, reject) => {
		con.query(
			'DELETE FROM flashcards WHERE set_name = ? AND owner_username = ? AND front = ?',
			[setName, ownerUsername, front],
			(err, result) => {
				if (err) return reject(err);
				resolve(result);
			}
		);
	});
}


function getFlashcardsBySetAndOwner(setName, ownerUsername) {
	return new Promise((resolve, reject) => {
		con.query(
			'SELECT * FROM flashcards WHERE set_name = ? AND owner_username = ?',
			[setName, ownerUsername],
			(err, rows) => {
				if (err) return reject(err);
				resolve(rows);
			}
		);
	});
}

function getUsersWithSetCount() {
	return new Promise((resolve, reject) => {
		con.query(
			`SELECT u.username, u.role, COUNT(s.name) AS set_count
			 FROM users u
			 LEFT JOIN flashcard_sets s ON u.username = s.owner_username
			 GROUP BY u.username, u.role
			 ORDER BY u.username ASC`,
			(err, rows) => {
				if (err) return reject(err);
				resolve(rows);
			}
		);
	});
}

function deleteUserCascade(username) {
	return new Promise((resolve, reject) => {
		//flashcards
		con.query(
			'DELETE FROM flashcards WHERE owner_username = ?',
			[username],
			(err) => {
				if (err) return reject(err);

				//flashcard_sets
				con.query(
					'DELETE FROM flashcard_sets WHERE owner_username = ?',
					[username],
					(err2) => {
						if (err2) return reject(err2);

						//users
						con.query(
							'DELETE FROM users WHERE username = ?',
							[username],
							(err3, result) => {
								if (err3) return reject(err3);
								resolve(result);
							}
						);
					}
				);
			}
		);
	});
}


module.exports = {
	con,
	createUser,
	getUserByUsername,
	getAllUsers,
	deleteUser,
	getFlashcardSetNames,
	getFlashcardSetNamesByOwner,
	createFlashcardSet,
	deleteFlashcardSet,
    getFlashcardsBySetAndOwner,
    addFlashcard,
    updateFlashcard,
    deleteFlashcard,
	flashcardFrontExists,
	getUsersWithSetCount,
	deleteUserCascade,
};
