let board = [];
let selected = null;
let hints = 3;
let lives = 3; // Додано змінну життів
let timerId = null;
let time = 0;
let fixedCells = new Set();
let isGameOver = false;
let isHintBusy = false;

// Функція оновлення сердечок на екрані
function resetLivesUI() {
    lives = 3;
    const hearts = document.querySelectorAll('.heart');
    hearts.forEach(h => h.classList.remove('lost'));
}

function newGame() {
    const diff = document.getElementById('difficulty').value;
    isGameOver = false;
    isHintBusy = false;
    selected = null;
    
    // Скидаємо життя при кожній новій грі
    resetLivesUI();
    
    fetch('/new_game', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({difficulty: diff})
    })
    .then(r => r.json())
    .then(data => {
        board = data.puzzle;
        fixedCells.clear();
        board.flat().forEach((v, i) => { if (v !== 0) fixedCells.add(i); });
        hints = 3;
        document.getElementById('hints').textContent = hints;
        drawBoard();
        startTimer();
    });
}

function drawBoard() {
    const container = document.getElementById('board');
    container.innerHTML = '';
    
    const selRow = selected !== null ? Math.floor(selected / 9) : null;
    const selCol = selected !== null ? selected % 9 : null;

    board.flat().forEach((val, i) => {
        const r = Math.floor(i / 9);
        const c = i % 9;
        const cell = document.createElement('div');
        cell.className = 'cell';
        
        if (val !== 0) {
            cell.textContent = val;
            cell.classList.add(fixedCells.has(i) ? 'fixed' : 'user-input');
        }

        // Візуальний мачинг (виділення рядків/стовпців)
        if (selected === i) cell.classList.add('selected');
        else if (r === selRow || c === selCol) cell.classList.add('highlight');

        cell.onclick = () => {
            if (!isGameOver) {
                selected = i;
                drawBoard();
            }
        };
        container.appendChild(cell);
    });
}

function setNumber(n) {
    if (isGameOver || selected === null || fixedCells.has(selected)) return;
    const r = Math.floor(selected / 9);
    const c = selected % 9;
    
    // Якщо клікнули ту саму цифру, що вже стоїть — нічого не робимо
    if (board[r][c] === n) return;
    
    board[r][c] = n;
    
    fetch('/check_cell', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({row: r, col: c, value: n})
    })
    .then(res => res.json())
    .then(data => {
        drawBoard();
        
        // Логіка перевірки помилки та втрати життя
        if (n !== 0 && !data.correct) {
            // Додаємо червоний колір клітинці
            const cells = document.querySelectorAll('.cell');
            cells[selected].classList.add('error');
            
            // Зменшуємо кількість життів
            lives--;
            const hearts = document.querySelectorAll('.heart:not(.lost)');
            if (hearts.length > 0) {
                hearts[hearts.length - 1].classList.add('lost');
            }
            
            // Анімація трясіння екрана
            const gameContainer = document.querySelector('.container');
            gameContainer.classList.add('shake-screen');
            setTimeout(() => gameContainer.classList.remove('shake-screen'), 400);

            // Перевірка на програш
            if (lives <= 0) {
                isGameOver = true;
                clearInterval(timerId);
                setTimeout(() => {
                    alert("💔 Гра закінчена! У вас закінчилися життя.");
                    newGame(); // Автоматично починаємо нову гру
                }, 100);
            }
        }
    });
}

function getHint() {
    if (isGameOver || hints <= 0 || isHintBusy) return;
    isHintBusy = true;

    fetch('/get_hint', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({board: board})
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            board[data.row][data.col] = data.value;
            hints--;
            document.getElementById('hints').textContent = hints;
            drawBoard();
        }
    })
    .finally(() => isHintBusy = false);
}

function checkSolution() {
    if (isGameOver) return;
    fetch('/check_solution', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({board: board})
    })
    .then(r => r.json())
    .then(data => {
        if (data.correct) {
            isGameOver = true;
            clearInterval(timerId);
            document.getElementById('wins').textContent = data.wins;
            alert("🎉 Перемога! Рахунок оновлено.");
        } else {
            alert("❌ Помилка в рішенні.");
        }
    });
}

function startTimer() {
    clearInterval(timerId);
    time = 0;
    timerId = setInterval(() => {
        time++;
        const m = String(Math.floor(time / 60)).padStart(2, '0');
        const s = String(time % 60).padStart(2, '0');
        document.getElementById('timer').textContent = `${m}:${s}`;
    }, 1000);
}

document.addEventListener('DOMContentLoaded', newGame);