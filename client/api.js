const API_URL = 'https://ti-quickflash.onrender.com';

document.addEventListener('DOMContentLoaded', () => {
	_refresh().finally(() => {
		refresh_page();
	});
});

function app_name_action() {
	_refresh().finally(() => {
		refresh_page();
	});
}

function _login() {
	const username = (document.getElementById('username').value).trim();
	const password = document.getElementById('password').value;

	if (!username || !password) {
		document.getElementById('sign-in-result').innerHTML = ('Podaj username i hasło.');
		return;
	}

	fetch(API_URL + '/auth/login', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ username, password }),
	})
		.then(res => res.json())
		.then(data => {
			if (data.accessToken && data.refreshToken) {
				setTokens(data.accessToken, data.refreshToken);
				console.log('Zalogowano pomyślnie'); 
				refresh_page();
				return;
			}
			document.getElementById('sign-in-result').innerHTML = 'Nie udało się zalogować';
		})
		.catch(err => {
			document.getElementById('sign-in-result').innerHTML = 'Błąd logowania: ' + err.message;
		});
}

function _register() {
	const username = (document.getElementById('username').value).trim();
	const password = document.getElementById('password').value;

	if (!username || !password) {
		document.getElementById('sign-in-result').innerHTML = 'Podaj username i hasło.';
		return;
	}

	fetch(API_URL + '/auth/register', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ username, password }),
	})
		.then(res => res.json())
		.then(data => {
			if (data.accessToken && data.refreshToken) {
				setTokens(data.accessToken, data.refreshToken);
				console.log('Zarejestrowano i zalogowano');
				refresh_page();
				return;
			}
			document.getElementById('sign-in-result').innerHTML = 'Nie udało się zarejestrować';
		})
		.catch(err => {
			document.getElementById('sign-in-result').innerHTML = 'Błąd rejestracji: ' + err.message;
		});
}

function _log_out() {
	const refreshToken = getRefresh();

	fetch(API_URL + '/auth/logout', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ refreshToken }),
	})
		.then(() => {
			removeTokens();
			console.log('Wylogowano');
			refresh_page();
		})
		.catch(err => {
			console.log('Błąd wylogowania: ', err);
			removeTokens();
			console.log('Wylogowano');
			refresh_page();
		});
}

function _refresh() {
	const refreshToken = getRefresh();
	if (!refreshToken) return Promise.resolve(null);

	return fetch(API_URL + '/auth/refresh', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ refreshToken }),
	})
		.then(res => res.json())
		.then(data => {
			if (data.accessToken) {
				setAccess(data.accessToken);
				console.log('Token odświeżony');
				return data.accessToken;
			}
			console.log('Brak accessToken w odpowiedzi');
			return null;
		})
		.catch(error => {
			console.log('Nie udało się odświeżyć tokena: ', error);
			return null;
		});
}

function refresh_page() {
	const content0 = document.getElementById('content0');
	const content1 = document.getElementById('content1');
	const signIn = document.getElementById('sign-in');

	content0.innerHTML = 'demo account - username: ad, password: ad';
	content1.innerHTML = '';

	if (!isLoggedIn()) {
		signIn.innerHTML = '<button type="button" onclick="sign_in_card()">Sign in</button>';
		return;
	}

	const user = getCurrentUser();
	const username = user.username;
	const role = user.role;

	signIn.innerHTML =
		'Witaj, ' +
		username +
		'! <button type="button" onclick="_log_out()">Log out</button>';
	if (role === 'ADMIN') {
		signIn.innerHTML += ' <button type="button" onclick="admin_page()">Admin</button>';
	}
		
	load_add_new_set();
	load_flashcard_sets();
}

function sign_in_card() {
	const content0 = document.getElementById('content0');
	const content1 = document.getElementById('content1');

	content1.innerHTML = '';
	content0.innerHTML =
		'<div>' +
		'<table>' +
		'<tr><td><label>Username: </label></td><td><input type="text" id="username"/></td></tr>' +
		'<tr><td><label>Password: </label></td><td><input type="password" id="password"/></td></tr>' +
		'</table>' +
		'<button id="btn-login" onclick="_login()">Log in</button> ' +
		'<button id="btn-register" onclick="_register()">Register</button>' +
		'<div id="sign-in-result"></div>' +
		'</div>';
}

function load_add_new_set() {
	const content0 = document.getElementById('content0');
	content0.innerHTML =
		'<div style="display:flex; justify-content:center;">' +
		'<button id="add-set-btn" onclick="new_set_added()">+</button>' +
		'<input id="add-set-input" type="text" placeholder="Add a new set..." />' +
		'</div>';
}

function admin_page() {
	const content0 = document.getElementById('content0');
	const content1 = document.getElementById('content1');
	content0.innerHTML = '<div>username; role; set_count:</div>';
	content1.innerHTML = '';

	fetch(API_URL + '/users', {
		method: 'GET',
		headers: {
			'Authorization': 'Bearer ' + getAccess(),
		},
	})
		.then(res => res.json())
		.then(users => {

			let select = `<select id="admin-user-select" size="${users.length}">`;
			users.forEach(u => {
				select += `<option value="${u.username}">${u.username}; ${u.role}; ${u.set_count}</option>`;
			});
			select += '</select>';
			select += '<br/><button onclick="del_user()" style="margin-top:10px">Delete user</button>';
			content1.innerHTML = select;
		})
		.catch(err => {
			content1.innerHTML = 'Błąd pobierania użytkowników' + err;
		});
}

function del_user() {
	const selected = document.getElementById('admin-user-select');
	if (!selected) return;
	const username = selected.value;

	fetch(API_URL + '/users/' + encodeURIComponent(username), {
		method: 'DELETE',
		headers: {
			'Authorization': 'Bearer ' + getAccess(),
		},
	})
		.then(res => res.json())
		.then(data => {
			('Usunięto użytkownika:', data);
			admin_page();
		})
		.catch(err => {
			console.log('Błąd usuwania użytkownika: ' + err);
			admin_page();
		});
}

function load_flashcard_sets() {
	const content1 = document.getElementById('content1');
	content1.innerHTML = '';

	fetch(API_URL + '/flashcard_sets', {
		method: 'GET',
		headers: {
			'Authorization': 'Bearer ' + getAccess(),
		},
	})
		.then(res => res.json())
		.then(flashcardSets => {
			flashcardSets.forEach(name => {
				content1.appendChild(createFlashcardElement(name));
			});
		})
		.catch(err => {
			console.log('Błąd pobierania flashcard_sets:', err);
		});
}

function createFlashcardElement(name) {
	const card = document.createElement('div');
	card.className = 'flashcard-element';
	card.innerHTML =
		'<div class="flashcard-element-name">' + name + '</div><br/' +
		'<div>' +
		'<button id="flashcard-element-btn" onclick="play(\'' + name + '\')">▶️</button>' +
		'<button id="flashcard-element-btn" onclick="shuffle(\'' + name + '\')">🔀</button>' +
		'<button id="flashcard-element-btn" onclick="edit(\'' + name + '\')">✏️</button>' +
		'<button id="flashcard-element-btn" onclick="del(\'' + name + '\')">🗑️</button>' +
		'</div>';
	return card;
}

let flashcards = [];
let currentIndex = 0;
let showingFront = true;

function play(name) {
	const content0 = document.getElementById('content0');

	fetch(API_URL + '/flashcard_sets/' + encodeURIComponent(name), {
		method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + getAccess(),
        },
    })
        .then(res => res.json())
		.then(data => {
			flashcards = data || [];
			currentIndex = 0;
			showingFront = true;
			render_study_flashcard();
		})
		.catch(err => {
			console.log('Błąd pobierania fiszek:', err);
			content0.innerHTML = 'Błąd pobierania fiszek';
		});
}

function shuffle(name) {
	const content0 = document.getElementById('content0');

	fetch(API_URL + '/flashcard_sets/' + encodeURIComponent(name), {
		method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + getAccess(),
        },
    })
		.then(res => res.json())
		.then(data => {
			flashcards = data || [];
			shuffleArray(flashcards);
			currentIndex = 0;
			showingFront = true;
			render_study_flashcard();
		})
		.catch(err => {
			console.log('Błąd pobierania fiszek:', err);
			content0.innerHTML = 'Błąd pobierania fiszek';
		});
}

function shuffleArray(arr) {
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		const tmp = arr[i];
		arr[i] = arr[j];
		arr[j] = tmp;
	}
}



function render_study_flashcard() {
	const content0 = document.getElementById('content0');
	const content1 = document.getElementById('content1');

	if (flashcards.length === 0) {
		content0.innerHTML = 'Brak fiszek w zestawie';
		content1.innerHTML = '';
		return;
	}

	const card = flashcards[currentIndex];
	const text = showingFront ? card.front : card.back;

	content0.innerHTML =
		'<div class="flashcard-study" onclick="flipCard()">' +
		text +
		'</div>';

	content1.innerHTML =
		'<button onclick="prevCard()">←</button> ' +
		'<button onclick="flipCard()">🔄</button> ' +
		'<button onclick="nextCard()">→</button> <br/>' +
		'<span>' + (currentIndex + 1) + '/' + flashcards.length + '</span>';
}


function flipCard() {
  showingFront = !showingFront;
  render_study_flashcard();
}

function nextCard() {
  if (currentIndex < flashcards.length - 1) {
    currentIndex++;
    showingFront = true;
    render_study_flashcard();
  }
}

function prevCard() {
  if (currentIndex > 0) {
    currentIndex--;
    showingFront = true;
    render_study_flashcard();
  }
}

function escapeHtml(text) {
	return text.replace(/[&<>"']/g, function (c) {
		return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c];
	});
}

function edit(name) {
	const content0 = document.getElementById('content0');
	const content1 = document.getElementById('content1');

	content0.innerHTML = 'Editing ' + name + ':';
	content1.innerHTML = '';
	render_edit_table(name);
}

function render_edit_table(name) {
    fetch(API_URL + '/flashcard_sets/' + encodeURIComponent(name), {
		method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + getAccess(),
        },
    })
        .then(res => res.json())
        .then(flashcards => {
            const content1 = document.getElementById('content1');
            let html = '<table>';
            html += '<tr><th>Front:</th><th>Back:</th><th></th><th></th></tr>';
            flashcards.forEach(card => {
                html += `<tr>
                    <td><input value="${escapeHtml(card.front)}" oldfront="${escapeHtml(card.front)}" /></td>
                    <td><input value="${escapeHtml(card.back)}" oldback="${escapeHtml(card.back)}" /></td>
                    <td><button onclick="edit_flashcard(this, '${name}')">Edit</button></td>
                    <td><button onclick="del_flashcard(this, '${name}')">Remove</button></td>
                </tr>`;
            });
            html += `<tr>
                <td><input placeholder="..." /></td>
                <td><input placeholder="..." /></td>
                <td><button onclick="add_flashcard(this, '${name}')">Add</button></td><td></td>
            </tr>`;
            html += '</table>';
            content1.innerHTML = html;
        })
        .catch(err => {
            console.log('Błąd pobierania fiszek:', err);
        });
}

function edit_flashcard(btn, name) {
    const tr = btn.closest('tr');
    const frontInput = tr.children[0].querySelector('input');
    const backInput = tr.children[1].querySelector('input');
    const oldFront = frontInput.getAttribute('oldfront');
    const oldBack = backInput.getAttribute('oldback');
    const front = frontInput.value;
    const back = backInput.value;

    fetch(API_URL + '/flashcard_sets/' + encodeURIComponent(name) + '/flashcards', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + getAccess(),
        },
        body: JSON.stringify({ oldFront, oldBack, front, back }),
    })
        .then(res => res.json())
        .then(data => {
            console.log('Edytowano fiszkę:', data);
            render_edit_table(name);
        })
        .catch(err => {
            console.log('Błąd edycji fiszki:', err);
            render_edit_table(name);
        });
}

function del_flashcard(btn, name) {
    const tr = btn.closest('tr');
    const frontInput = tr.children[0].querySelector('input');
	const front = frontInput.getAttribute('oldfront') || frontInput.value;

    fetch(API_URL + '/flashcard_sets/' + encodeURIComponent(name) + '/flashcards/' + encodeURIComponent(front), {
        method: 'DELETE',
        headers: {
            'Authorization': 'Bearer ' + getAccess(),
        },
    })
        .then(res => res.json())
        .then(data => {
            console.log('Usunięto fiszkę:', data);
            render_edit_table(name);
        })
        .catch(err => {
            console.log('Błąd usuwania fiszki:', err);
            render_edit_table(name);
        });
}

function add_flashcard(btn, name) {
    const tr = btn.closest('tr');
    const frontInput = tr.children[0].querySelector('input');
    const backInput = tr.children[1].querySelector('input');
    const front = frontInput.value;
    const back = backInput.value;

    if (!front || !back) return;

    fetch(API_URL + '/flashcard_sets/' + encodeURIComponent(name) + '/flashcards', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + getAccess(),
        },
        body: JSON.stringify({ front, back }),
    })
        .then(res => res.json())
        .then(data => {
            console.log('Dodano fiszkę:', data);
            render_edit_table(name);
        })
        .catch(err => {
            console.log('Błąd dodawania fiszki:', err);
            render_edit_table(name);
        });
}

function del(name) {
	fetch(API_URL + '/flashcard_sets/' + encodeURIComponent(name), {
		method: 'DELETE',
		headers: {
			'Authorization': 'Bearer ' + getAccess(),
		},
	})
		.then(res => res.json())
		.then(data => {
			console.log('Usunięto zestaw:', data);
		})
		.catch(err => {
			console.log('Błąd usuwania zestawu:', err);
		})
		.finally(() => {
			_refresh().finally(() => {
				refresh_page();
			});
		});
}

function new_set_added() {
	const setName = document.getElementById('add-set-input').value.trim();
	if (!setName) return;

	fetch(API_URL + '/flashcard_sets', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': 'Bearer ' + getAccess(),
		},
		body: JSON.stringify({ set_name: setName }),
	})
		.then(res => res.json())
		.then(data => {
			console.log('Dodano zestaw:', data);
		})
		.catch(err => {
			console.log('Błąd dodawania zestawu:', err);
		})
		.finally(() => {
			_refresh().finally(() => {
				refresh_page();
			});
		});
}

window._login = _login;
window._register = _register;
window._log_out = _log_out;
window.new_set_added = new_set_added;
window.edit = edit;
window.edit_flashcard = edit_flashcard;
window.del_flashcard = del_flashcard;
window.add_flashcard = add_flashcard;
