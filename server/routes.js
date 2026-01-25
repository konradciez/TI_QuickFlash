const express = require('express');
const router = express.Router();

const db = require('./sql');
const {
	generateAccessToken,
	generateRefreshToken,
	verifyRefreshToken,
	authenticateJWT,
	authorizeAdmin,
} = require('./middleware');

let refreshTokens = [];

router.get('/test', (req, res) => {
  res.type('text/plain');
  res.send('tekst');
});

//FLASHCARD_SETS
router.get('/flashcard_sets', authenticateJWT, (req, res) => {
	const ownerUsername = req.user.username;
	db.getFlashcardSetNamesByOwner(ownerUsername)
		.then(names => {
			res.json(names);
		})
		.catch(err => {
			res.status(500).json({ message: 'Błąd serwera', error: err.message });
		});
});

router.post('/flashcard_sets', authenticateJWT, (req, res) => {
	const ownerUsername = req.user.username;
	const setName = req.body.set_name;

	if (!setName) {
		return res.status(400).json({ message: 'Brak set_name' });
	}

	db.createFlashcardSet(setName, ownerUsername)
		.then(() => {
			res.status(201).json({ name: setName, owner_username: ownerUsername });
		})
		.catch(err => {
			if (err && err.code === 'ER_DUP_ENTRY') {
				return res.status(409).json({ message: 'Taki zestaw już istnieje' });
			}
			res.status(500).json({ message: 'Błąd serwera', error: err.message });
		});
});

router.delete('/flashcard_sets/:setName', authenticateJWT, (req, res) => {
	const ownerUsername = req.user.username;
	const setName = req.params.setName;

	if (!setName) {
		return res.status(400).json({ message: 'Brak set_name' });
	}

	db.deleteFlashcardSet(setName, ownerUsername)
		.then(result => {
			if (result.affectedRows === 0) {
				return res.status(404).json({ message: 'Nie znaleziono zestawu' });
			}
			res.json({ message: 'Usunięto zestaw', name: setName });
		})
		.catch(err => {
			res.status(500).json({ message: 'Błąd serwera', error: err.message });
		});
});

router.get('/flashcard_sets/:setName', authenticateJWT, (req, res) => {
	const ownerUsername = req.user.username;
	const setName = req.params.setName;

	db.getFlashcardsBySetAndOwner(setName, ownerUsername)
		.then(flashcards => {
			res.json(flashcards);
		})
		.catch(err => {
			res.status(500).json({ message: 'Błąd serwera', error: err.message });
		});
});


//FLASHCARDS
router.post('/flashcard_sets/:setName/flashcards', authenticateJWT, (req, res) => {
	const ownerUsername = req.user.username;
	const setName = req.params.setName;
	const { front, back } = req.body;

	if (!front || !back) {
		return res.status(400).json({ message: 'Brak front lub back' });
	}

	db.flashcardFrontExists(setName, ownerUsername, front)
		.then(exists => {
			if (exists) {
				res.status(409).json({ message: 'Fiszka z takim front już istnieje' });
				return null;
			}
			return db.addFlashcard(setName, ownerUsername, front, back);
		})
		.then(result => {
			if (result) res.status(201).json({ set_name: setName, front, back });
		})
		.catch(err => {
			res.status(500).json({ message: 'Błąd serwera', error: err.message });
		});
});

router.put('/flashcard_sets/:setName/flashcards', authenticateJWT, (req, res) => {
	const ownerUsername = req.user.username;
	const setName = req.params.setName;
	const { oldFront, front, oldBack, back } = req.body;

	if (!oldFront || !front || !oldBack || !back) {
		return res.status(400).json({ message: 'Brak wymaganych pól' });
	}

	//front “istnieje” = ta sama fiszka
	const checkFront = (oldFront === front)
	? Promise.resolve(false)
	: db.flashcardFrontExists(setName, ownerUsername, front);

	checkFront
		.then(exists => {
			if (exists) {
				res.status(409).json({ message: 'Fiszka z takim front już istnieje' });
				return null;
			}
			return db.updateFlashcard(setName, ownerUsername, oldFront, oldBack, front, back);
		})
		.then(result => {
			if (!result) return;
			if (result.affectedRows === 0) {
				return res.status(404).json({ message: 'Nie znaleziono fiszki' });
			}
			res.json({ set_name: setName, front, back });
		})
		.catch(err => {
			res.status(500).json({ message: 'Błąd serwera', error: err.message });
		});
});

router.delete('/flashcard_sets/:setName/flashcards/:front', authenticateJWT, (req, res) => {
	const ownerUsername = req.user.username;
	const setName = req.params.setName;
	const front = req.params.front;

	db.deleteFlashcard(setName, ownerUsername, front)
		.then(result => {
			if (result.affectedRows === 0) {
				return res.status(404).json({ message: 'Nie znaleziono fiszki' });
			}
			res.json({ message: 'Usunięto fiszkę', set_name: setName, front });
		})
		.catch(err => {
			res.status(500).json({ message: 'Błąd serwera', error: err.message });
		});
});


// AUTH
router.post('/auth/register', (req, res) => {
       const { username, password } = req.body;

       if (!username || !password) {
	       return res.status(400).json({ message: 'Brak nazwy użytkownika lub hasła' });
       }

       db.getUserByUsername(username)
	       .then(exists => {
		       if (exists) {
			       return res.status(409).json({ message: 'Użytkownik już istnieje' });
		       }
		       const user = {
			       username,
			       password,
			       role: 'USER',
		       };
		       db.createUser(user)
			       .then(() => {
				       const accessToken = generateAccessToken(user);
				       const refreshToken = generateRefreshToken(user);
				       refreshTokens.push(refreshToken);

				       res.status(201).json({
					       accessToken,
					       refreshToken,
					       user: { username: user.username, role: user.role },
				       });
			       })
			       .catch(err => {
				       res.status(500).json({ message: 'Błąd serwera', error: err.message });
			       });
	       })
	       .catch(err => {
		       res.status(500).json({ message: 'Błąd serwera', error: err.message });
	       });
});

router.post('/auth/login', (req, res) => {
       const { username, password } = req.body;

       if (!username || !password) {
	       return res.status(400).json({ message: 'Brak nazwy użytkownika lub hasła' });
       }
       db.getUserByUsername(username)
	       .then(user => {
		       if (!user || user.password !== password) {
			       return res.status(401).json({ message: 'Nieprawidłowe dane logowania' });
		       }
		       const accessToken = generateAccessToken(user);
		       const refreshToken = generateRefreshToken(user);
		       refreshTokens.push(refreshToken);
		       res.status(201).json({ accessToken, refreshToken, user: { username: user.username, role: user.role } });
	       })
	       .catch(err => {
		       res.status(500).json({ message: 'Błąd serwera', error: err.message });
	       });
});

router.post('/auth/refresh', (req, res) => {
	const refreshToken = req.body.refreshToken;

	if (!refreshToken) {
		return res.status(401).json({ message: 'Brak refresh tokena' });
	}

	if (!refreshTokens.includes(refreshToken)) {
		return res.status(403).json({ message: 'Refresh token odrzucony' });
	}

	verifyRefreshToken(refreshToken, (err, user) => {
		if (err) {
			return res.status(403).json({ message: 'Błędny refresh token' });
		}

		const newAccessToken = generateAccessToken({
			username: user.username,
			role: user.role,
		});
		res.json({ accessToken: newAccessToken });
	});
});

router.post('/auth/logout', (req, res) => {
	const refreshToken = req.body.refreshToken;

	if (!refreshToken) {
		return res.status(400).json({ message: 'Brak refresh tokena' });
	}

	refreshTokens = refreshTokens.filter(t => t !== refreshToken);
	res.type('text/plain');
	res.send('Logout successful');
});

//ADMIN
router.get('/users', authenticateJWT, authorizeAdmin, (req, res) => {
	db.getUsersWithSetCount()
		.then(users => {
			res.json(users);
		})
		.catch(err => {
			res.status(500).json({ message: 'Błąd serwera', error: err.message });
		});
});

router.delete('/users/:username', authenticateJWT, authorizeAdmin, (req, res) => {
	const username = req.params.username;
	db.deleteUserCascade(username)
		.then(result => {
			res.json({ message: 'Usunięto użytkownika', username });
		})
		.catch(err => {
			res.status(500).json({ message: 'Błąd serwera', error: err.message });
		});
});

module.exports = router;