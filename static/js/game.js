let board = [];
let selected = null;
let hints = 3;
let time = 0;
let timerId = null;
let fixedCells = new Set();

function startTimer() {
    clearInterval(timerId);
    time = 0;
    timerId = setInterval(() => {
        time++;
        document.getElementById('timer').textContent =
            String(Math.floor(time / 60)).padStart(2, '0') + ':' +
            String(time % 60).padStart(2, '0');
    }, 1000);
}

function newGame() {
    fetch('/new_game', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({difficulty: document.getElementById('difficulty').value})
    })
    .then(r => r.json())
    .then(data => {
        board = data.puzzle;
        hints = 3;
        document.getElementById('hints').textContent = hints;
        selected = null;

        fixedCells.clear();
        board.flat().forEach((v, i) => { if (v !== 0) fixedCells.add(i); });

        drawBoard();
        startTimer();
    });
}

function drawBoard() {
    const b = document.getElementById('board');
    b.innerHTML = '';
    
    // Використовуємо 1fr замість фіксованих 44px для адаптивності
    b.style.gridTemplateColumns = 'repeat(9, 1fr)';
    b.style.gridTemplateRows = 'repeat(9, 1fr)';

    board.flat().forEach((v, i) => {
        const cell = document.createElement('div');
        cell.className = 'cell';
        const r = Math.floor(i / 9);
        const c = i % 9;

        if (v !== 0) {
            cell.textContent = v;
            if (fixedCells.has(i)) {
                cell.classList.add('fixed');
            } else {
                cell.classList.add('user-input');
            }
        }

        if (selected === i) cell.classList.add('selected');

        cell.addEventListener('click', () => selectCell(i));
        
        // Межі 3x3 ми вже налаштували в CSS, тому видаляємо inline стилі звідси,
        // щоб вони не конфліктували з основним дизайном.
        b.appendChild(cell);
    });
}

function selectCell(i) {
    if (fixedCells.has(i)) return;
    document.querySelectorAll('.cell').forEach(c => c.classList.remove('selected'));
    document.querySelectorAll('.cell')[i].classList.add('selected');
    selected = i;
}

function setNumber(n) {
    if (selected === null || fixedCells.has(selected)) return;
    const r = Math.floor(selected / 9);
    const c = selected % 9;

    fetch('/check_cell', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({row: r, col: c, value: n})
    })
    .then(r => r.json())
    .then(d => {
        board[r][c] = n;

        const cell = document.querySelectorAll('.cell')[selected];
        if (n === 0) {
            cell.textContent = '';
            cell.classList.remove('error', 'user-input');
            return;
        }

        cell.textContent = n;
        cell.classList.add('user-input');

        if (!d.correct) {
            cell.classList.add('error');
            setTimeout(() => cell.classList.remove('error'), 600);
        }
    });
}

function useHint() {
    if (hints <= 0) return;
    fetch('/hint', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({board})
    })
    .then(r => r.json())
    .then(d => {
        if (d.error) return;
        const idx = d.row * 9 + d.col;
        board[d.row][d.col] = d.value;
        fixedCells.add(idx);
        hints--;
        document.getElementById('hints').textContent = hints;
        drawBoard();
    });
}

function checkSolution() {
    fetch('/check_solution', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({board})
    })
    .then(r => r.json())
    .then(d => {
        if (d.correct) {
            clearInterval(timerId);
            alert('🎉 Перемога! Всього перемог: ' + d.wins);
            document.getElementById('wins').textContent = d.wins;
        } else {
            alert('❌ Є помилки, перевірте ще раз.');
        }
    });
}

document.addEventListener('DOMContentLoaded', () => newGame());
